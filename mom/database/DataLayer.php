<?php

declare(strict_types=1);

namespace MOM\Database;

use PDO;
use RuntimeException;

require_once __DIR__ . '/Connection.php';
require_once __DIR__ . '/QueryBuilder.php';
require_once __DIR__ . '/RuntimeShadowSync.php';

/**
 * Unified Data Abstraction Layer for HESEM MOM Portal.
 *
 * Wraps every data operation behind a strategy pattern that supports four
 * migration modes:
 *
 *   JSON_ONLY        - Read/write JSON files only (current production behaviour).
 *   SHADOW_WRITE     - Read from JSON, write to BOTH JSON and PostgreSQL.
 *   POSTGRES_PRIMARY - Read from PostgreSQL, fall back to JSON on error.
 *   POSTGRES_ONLY    - Read/write PostgreSQL only (final target state).
 *
 * Each public method implements both the JSON file path and the PostgreSQL
 * query, then delegates to the appropriate backend based on the active mode.
 *
 * @package MOM\Database
 * @since   1.0.0
 */
class DataLayer
{
    /** Operating modes (migration ladder). */
    public const MODE_JSON_ONLY        = 'JSON_ONLY';
    public const MODE_SHADOW_WRITE     = 'SHADOW_WRITE';
    public const MODE_POSTGRES_PRIMARY = 'POSTGRES_PRIMARY';
    public const MODE_POSTGRES_ONLY    = 'POSTGRES_ONLY';

    private Connection $db;
    private array $config;
    private string $mode;
    private ?RuntimeShadowSync $runtimeShadow = null;
    private array $lastReadMeta = [
        'source' => 'json',
        'fallback' => false,
        'error' => '',
        'mode' => 'JSON_ONLY',
        'timestamp' => '',
        'attempts' => 1,
    ];

    /** Base path for QMS data files (e.g. .../mom/data). */
    private string $dataDir;

    /** Project root (one level above mom). */
    private string $rootDir;

    // ── Construction ────────────────────────────────────────────────────────

    /**
     * @param string     $dataDir Absolute path to data directory.
     * @param string     $rootDir Absolute path to project root.
     * @param array|null $config  Database configuration override.
     */
    public function __construct(string $dataDir, string $rootDir, ?array $config = null)
    {
        $this->config  = $config ?? (array)(require __DIR__ . '/config.php');
        $this->dataDir = rtrim(str_replace('\\', '/', $dataDir), '/');
        $this->rootDir = rtrim(str_replace('\\', '/', $rootDir), '/');

        // Resolve operating mode from config
        if (!($this->config['use_postgres'] ?? false)) {
            $this->mode = self::MODE_JSON_ONLY;
        } elseif ($this->config['shadow_write'] ?? false) {
            $this->mode = self::MODE_SHADOW_WRITE;
        } elseif ($this->config['json_fallback'] ?? false) {
            $this->mode = self::MODE_POSTGRES_PRIMARY;
        } else {
            $this->mode = self::MODE_POSTGRES_ONLY;
        }

        // Lazy-initialise Connection only when Postgres is actually needed
        if ($this->mode !== self::MODE_JSON_ONLY) {
            $this->db = Connection::getInstance($this->config);
        }

        $this->setReadMeta('json');
    }

    /**
     * Get the current operating mode.
     *
     * @return string One of the MODE_* constants.
     */
    public function getMode(): string
    {
        return $this->mode;
    }

    /**
     * Get the underlying database Connection, or null when in JSON_ONLY mode.
     *
     * @return Connection|null
     */
    public function getConnection(): ?Connection
    {
        if ($this->mode === self::MODE_JSON_ONLY) {
            return null;
        }
        return $this->db ?? null;
    }

    /**
     * Return the resolved database configuration for server-side observability
     * and read-only probes.
     *
     * @return array<string, mixed>
     */
    public function getDatabaseConfig(): array
    {
        return $this->config;
    }

    /**
     * Get the data directory path.
     *
     * @return string
     */
    public function getDataDir(): string
    {
        return $this->dataDir;
    }

    /**
     * Return a runtime summary of the active storage mode and PostgreSQL reachability.
     *
     * This is safe to call from JSON_ONLY mode and useful for runtime observability.
     */
    public function getModeSummary(): array
    {
        $usesPostgres = $this->usesPostgres();
        $reachable = false;
        $error = '';
        $databaseProbe = $this->probeConfiguredDatabase();

        if ($usesPostgres) {
            try {
                $probe = $this->db->queryOne('SELECT 1 AS ok');
                $reachable = ((int)($probe['ok'] ?? 0) === 1);
            } catch (\Throwable $e) {
                $reachable = false;
                $error = $e->getMessage();
            }
        }

        return [
            'mode' => $this->mode,
            'use_postgres' => (bool)($this->config['use_postgres'] ?? false),
            'shadow_write' => (bool)($this->config['shadow_write'] ?? false),
            'json_fallback' => (bool)($this->config['json_fallback'] ?? false),
            'read_retry_count' => $this->getReadRetryCount(),
            'read_retry_delay_ms' => $this->getReadRetryDelayMs(),
            'database_configured' => (bool)($databaseProbe['configured'] ?? false),
            'database_host' => trim((string)($this->config['host'] ?? '')),
            'database_port' => max(0, (int)($this->config['port'] ?? 0)),
            'database_name' => trim((string)($this->config['database'] ?? '')),
            'database_schema' => trim((string)($this->config['schema'] ?? 'public')),
            'database_username' => trim((string)($this->config['username'] ?? '')),
            'database_probe_reachable' => (bool)($databaseProbe['reachable'] ?? false),
            'database_probe_error' => (string)($databaseProbe['error'] ?? ''),
            'postgres_path_active' => $usesPostgres,
            'postgres_reachable' => $reachable,
            'postgres_error' => $error,
            'master_data_read_mode' => $this->domainReadMode('master_data'),
            'orders_read_mode' => $this->domainReadMode('orders'),
            'mes_read_mode' => $this->domainReadMode('mes'),
            'epicor_read_mode' => $this->domainReadMode('epicor'),
        ];
    }

    /**
     * @return array{configured:bool, reachable:bool, error:string}
     */
    private function probeConfiguredDatabase(): array
    {
        $configured = $this->hasConfiguredDatabaseProfile();
        $result = [
            'configured' => $configured,
            'reachable' => false,
            'error' => '',
        ];

        if (!$configured) {
            return $result;
        }

        $dsn = sprintf(
            'pgsql:host=%s;port=%d;dbname=%s;options=--search_path=%s',
            trim((string)($this->config['host'] ?? 'localhost')),
            max(1, (int)($this->config['port'] ?? 5432)),
            trim((string)($this->config['database'] ?? 'mom')),
            trim((string)($this->config['schema'] ?? 'public')) !== '' ? trim((string)($this->config['schema'] ?? 'public')) : 'public',
        );

        try {
            $pdo = new PDO(
                $dsn,
                trim((string)($this->config['username'] ?? '')),
                (string)($this->config['password'] ?? ''),
                [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES => false,
                    PDO::ATTR_STRINGIFY_FETCHES => false,
                    PDO::ATTR_TIMEOUT => max(1, (int)($this->config['connect_timeout'] ?? 5)),
                ],
            );
            $statementTimeout = max(1000, (int)($this->config['statement_timeout'] ?? 30000));
            $pdo->exec("SET statement_timeout = {$statementTimeout}");
            $probe = $pdo->query('SELECT 1 AS ok');
            $row = $probe instanceof \PDOStatement ? $probe->fetch(PDO::FETCH_ASSOC) : false;
            $result['reachable'] = ((int)($row['ok'] ?? 0) === 1);
        } catch (\Throwable $e) {
            $result['error'] = $e->getMessage();
        }

        return $result;
    }

    private function hasConfiguredDatabaseProfile(): bool
    {
        $allowEmptyPassword = !empty($this->config['allow_empty_password']);
        return trim((string)($this->config['host'] ?? '')) !== ''
            && max(0, (int)($this->config['port'] ?? 0)) > 0
            && trim((string)($this->config['database'] ?? '')) !== ''
            && trim((string)($this->config['username'] ?? '')) !== ''
            && ($allowEmptyPassword || trim((string)($this->config['password'] ?? '')) !== '');
    }

    /**
     * Return metadata about the most recent read path decision.
     */
    public function getLastReadMeta(): array
    {
        return $this->lastReadMeta;
    }

    /**
     * Mirror governed runtime master data into PostgreSQL without changing the
     * operational JSON-first flow.
     */
    public function syncMasterDataStore(array $store): bool
    {
        if (!$this->usesPostgres()) {
            return true;
        }

        try {
            $this->runtimeShadow()->syncMasterDataStore($store);
            return true;
        } catch (\Throwable $e) {
            @error_log('[DataLayer] runtime master shadow sync failed: ' . $e->getMessage());
            if ($this->mode === self::MODE_SHADOW_WRITE) {
                return false;
            }
            throw $e;
        }
    }

    /**
     * Mirror governed runtime orders into PostgreSQL.
     */
    public function syncOrdersStore(array $store): bool
    {
        if (!$this->usesPostgres()) {
            return true;
        }

        try {
            $this->runtimeShadow()->syncOrdersStore($store);
            return true;
        } catch (\Throwable $e) {
            @error_log('[DataLayer] runtime orders shadow sync failed: ' . $e->getMessage());
            if ($this->mode === self::MODE_SHADOW_WRITE) {
                return false;
            }
            throw $e;
        }
    }

    /**
     * Mirror MES runtime overlays into PostgreSQL.
     */
    public function syncMesRuntimeStore(array $store, array $orders = [], array $master = []): bool
    {
        if (!$this->usesPostgres()) {
            return true;
        }

        try {
            $this->runtimeShadow()->syncMesRuntimeStore($store, $orders, $master);
            return true;
        } catch (\Throwable $e) {
            @error_log('[DataLayer] runtime MES shadow sync failed: ' . $e->getMessage());
            if ($this->mode === self::MODE_SHADOW_WRITE) {
                return false;
            }
            throw $e;
        }
    }

    /**
     * Mirror Epicor integration runtime overlays into PostgreSQL.
     */
    public function syncEpicorRuntimeStore(array $store): bool
    {
        if (!$this->usesPostgres()) {
            return true;
        }

        try {
            $this->runtimeShadow()->syncEpicorRuntimeStore($store);
            return true;
        } catch (\Throwable $e) {
            @error_log('[DataLayer] runtime Epicor shadow sync failed: ' . $e->getMessage());
            if ($this->mode === self::MODE_SHADOW_WRITE) {
                return false;
            }
            throw $e;
        }
    }

    /**
     * Read the governed runtime master-data store using the active migration mode.
     */
    public function getRuntimeMasterDataStore(): array
    {
        $store = $this->readForDomain(
            'master_data',
            jsonReader: fn(): array => $this->readJson($this->dataDir . '/master-data/master-data.json'),
            pgReader: fn(): array => $this->loadRuntimeMasterDataFromPg(),
        );
        return $this->normalizeRuntimeMasterDataStore(is_array($store) ? $store : []);
    }

    /**
     * Read the governed runtime orders store using the active migration mode.
     */
    public function getRuntimeOrdersStore(): array
    {
        return $this->readForDomain(
            'orders',
            jsonReader: fn(): array => $this->readJson($this->dataDir . '/orders/orders.json'),
            pgReader: fn(): array => $this->loadRuntimeOrdersFromPg(),
        );
    }

    /**
     * Read the governed MES runtime overlay using the active migration mode.
     */
    public function getRuntimeMesRuntimeStore(): array
    {
        return $this->readForDomain(
            'mes',
            jsonReader: fn(): array => $this->readJson($this->dataDir . '/mes/mes-runtime.json'),
            pgReader: fn(): array => $this->loadRuntimeMesRuntimeFromPg(),
        );
    }

    /**
     * Read the governed Epicor integration runtime overlay using the active migration mode.
     */
    public function getRuntimeEpicorIntegrationStore(): array
    {
        return $this->readForDomain(
            'epicor',
            jsonReader: fn(): array => $this->readJson($this->dataDir . '/erp/epicor-runtime.json'),
            pgReader: fn(): array => $this->loadRuntimeEpicorIntegrationFromPg(),
        );
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  DOCUMENT OPERATIONS
    //  Maps to: documents, document_versions tables + docs_custom.json, _Archive
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Retrieve a single document by its ID / code (e.g. "SOP-606").
     *
     * @param string $docId Document code.
     * @return array|null Document data or null if not found.
     */
    public function getDocument(string $docId): ?array
    {
        return $this->read(
            jsonReader: function () use ($docId): ?array {
                $docs = $this->loadCustomDocs();
                $docId = strtoupper(trim($docId));
                foreach ($docs as $doc) {
                    if (strtoupper(trim((string)($doc['code'] ?? ''))) === $docId) {
                        return $doc;
                    }
                }
                return null;
            },
            pgReader: function () use ($docId): ?array {
                return $this->db->queryOne(
                    'SELECT * FROM documents WHERE doc_id = :id',
                    [':id' => strtoupper(trim($docId))],
                );
            },
        );
    }

    /**
     * Save (upsert) a document entry.
     *
     * @param array $data Document data with at least 'code' key.
     * @return bool Success.
     */
    public function saveDocument(array $data): bool
    {
        $code = strtoupper(trim((string)($data['code'] ?? $data['doc_id'] ?? '')));
        if ($code === '') {
            return false;
        }

        return $this->write(
            jsonWriter: function () use ($data, $code): bool {
                $docs = $this->loadCustomDocs();
                $found = false;
                foreach ($docs as &$doc) {
                    if (strtoupper(trim((string)($doc['code'] ?? ''))) === $code) {
                        $doc = array_merge($doc, $data);
                        $found = true;
                        break;
                    }
                }
                unset($doc);
                if (!$found) {
                    $data['code'] = $code;
                    $docs[] = $data;
                }
                $this->saveCustomDocs($docs);
                return true;
            },
            pgWriter: function () use ($data, $code): bool {
                $row = [
                    'doc_id'       => $code,
                    'doc_type'     => $data['doc_type'] ?? $this->inferDocType($code),
                    'doc_category' => $data['cat'] ?? $data['doc_category'] ?? 'SOP',
                    'title'        => $data['title'] ?? $code,
                    'dept_code'    => $data['dept_code'] ?? 'QA',
                    'status'       => $data['status'] ?? 'draft',
                    'metadata'     => $data['metadata'] ?? $data,
                    'updated_at'   => $this->nowIso(),
                ];
                $existing = $this->db->queryOne(
                    'SELECT doc_id FROM documents WHERE doc_id = :id',
                    [':id' => $code],
                );
                if ($existing) {
                    unset($row['doc_id']);
                    $sets = [];
                    $params = [':wid' => $code];
                    foreach ($row as $col => $val) {
                        $ph = ':' . $col;
                        $cast = is_array($val) ? '::jsonb' : '';
                        $sets[] = "{$col} = {$ph}{$cast}";
                        $params[$ph] = is_array($val) ? json_encode($val, JSON_UNESCAPED_UNICODE) : $val;
                    }
                    $this->db->execute(
                        'UPDATE documents SET ' . implode(', ', $sets) . ' WHERE doc_id = :wid',
                        $params,
                    );
                } else {
                    $cols = array_keys($row);
                    $phs = [];
                    $params = [];
                    foreach ($row as $col => $val) {
                        $ph = ':' . $col;
                        $phs[] = is_array($val) ? "{$ph}::jsonb" : $ph;
                        $params[$ph] = is_array($val) ? json_encode($val, JSON_UNESCAPED_UNICODE) : $val;
                    }
                    $this->db->execute(
                        'INSERT INTO documents (' . implode(', ', $cols) . ') VALUES (' . implode(', ', $phs) . ')',
                        $params,
                    );
                }
                return true;
            },
        );
    }

    /**
     * List documents with optional filters.
     *
     * @param array $filters Optional keys: cat, dept_code, status, search.
     * @return array List of document records.
     */
    public function listDocuments(array $filters = []): array
    {
        return $this->read(
            jsonReader: function () use ($filters): array {
                $docs = $this->loadCustomDocs();
                return $this->applyArrayFilters($docs, $filters);
            },
            pgReader: function () use ($filters): array {
                $qb = QueryBuilder::table('documents')->select('*');
                if (!empty($filters['cat'])) {
                    $qb->where('doc_category', strtoupper($filters['cat']));
                }
                if (!empty($filters['dept_code'])) {
                    $qb->where('dept_code', strtoupper($filters['dept_code']));
                }
                if (!empty($filters['status'])) {
                    $qb->where('status', $filters['status']);
                }
                if (!empty($filters['search'])) {
                    // DB-008: Escape LIKE wildcard characters to prevent injection
                    $search = str_replace(['\\', '%', '_'], ['\\\\', '\%', '\_'], $filters['search']);
                    $qb->where('title', 'ILIKE', '%' . $search . '%');
                }
                $qb->orderBy('doc_id');
                if (isset($filters['limit'])) {
                    $qb->limit((int)$filters['limit']);
                }
                if (isset($filters['offset'])) {
                    $qb->offset((int)$filters['offset']);
                }
                return $qb->get();
            },
        );
    }

    /**
     * Delete a document by its code.
     *
     * @param string $docId Document code.
     * @return bool Success.
     */
    public function deleteDocument(string $docId): bool
    {
        $code = strtoupper(trim($docId));
        return $this->write(
            jsonWriter: function () use ($code): bool {
                $docs = $this->loadCustomDocs();
                $docs = array_values(array_filter($docs, function (array $d) use ($code): bool {
                    return strtoupper(trim((string)($d['code'] ?? ''))) !== $code;
                }));
                $this->saveCustomDocs($docs);
                return true;
            },
            pgWriter: function () use ($code): bool {
                $this->db->execute('DELETE FROM documents WHERE doc_id = :id', [':id' => $code]);
                return true;
            },
        );
    }

    /**
     * Get version history for a document.
     *
     * @param string $docId Document code.
     * @return array List of version records.
     */
    public function getDocumentVersions(string $docId): array
    {
        return $this->read(
            jsonReader: function () use ($docId): array {
                // Versions are stored in per-folder _Archive manifest
                $code = strtoupper(trim($docId));
                $docs = $this->loadCustomDocs();
                foreach ($docs as $doc) {
                    if (strtoupper(trim((string)($doc['code'] ?? ''))) !== $code) {
                        continue;
                    }
                    $path = (string)($doc['path'] ?? '');
                    if ($path === '') {
                        return [];
                    }
                    $manifestPath = $this->rootDir . '/' . dirname($path) . '/_Archive/'
                        . pathinfo($path, PATHINFO_FILENAME) . '_manifest.json';
                    $manifest = $this->readJson($manifestPath);
                    return $manifest['versions'] ?? [];
                }
                return [];
            },
            pgReader: function () use ($docId): array {
                return $this->db->query(
                    'SELECT * FROM document_versions WHERE doc_id = :id ORDER BY valid_from DESC',
                    [':id' => strtoupper(trim($docId))],
                );
            },
        );
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  FORM OPERATIONS
    //  Maps to: form_schemas, form_entries tables + form_control_registry.json
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Get a form schema definition by form code (e.g. "FRM-631").
     *
     * @param string $formCode Form code.
     * @return array|null Schema data or null.
     */
    public function getFormSchema(string $formCode): ?array
    {
        $code = strtoupper(trim($formCode));
        return $this->read(
            jsonReader: function () use ($code): ?array {
                $file = $this->dataDir . '/online-forms/schemas/' . $code . '.json';
                if (!is_file($file)) {
                    return null;
                }
                $schema = $this->readJson($file);
                return $schema !== [] ? $schema : null;
            },
            pgReader: function () use ($code): ?array {
                return $this->db->queryOne(
                    'SELECT * FROM form_schemas WHERE form_code = :code AND valid_to IS NULL ORDER BY version DESC LIMIT 1',
                    [':code' => $code],
                );
            },
        );
    }

    /**
     * Save (upsert) a form schema.
     *
     * @param string $formCode Form code.
     * @param array  $schema   Schema data.
     * @return bool Success.
     */
    public function saveFormSchema(string $formCode, array $schema): bool
    {
        $code = strtoupper(trim($formCode));
        return $this->write(
            jsonWriter: function () use ($code, $schema): bool {
                $dir = $this->dataDir . '/online-forms/schemas';
                if (!is_dir($dir)) {
                    @mkdir($dir, 0755, true);
                }
                $file = $dir . '/' . $code . '.json';
                $schema['code'] = $code;
                $this->writeJson($file, $schema);
                return true;
            },
            pgWriter: function () use ($code, $schema): bool {
                $existing = $this->db->queryOne(
                    'SELECT form_code, version FROM form_schemas WHERE form_code = :code AND valid_to IS NULL ORDER BY version DESC LIMIT 1',
                    [':code' => $code],
                );
                $version = $existing ? ((int)$existing['version'] + 1) : 1;
                // Expire previous version
                if ($existing) {
                    $this->db->execute(
                        'UPDATE form_schemas SET valid_to = now() WHERE form_code = :code AND version = :ver',
                        [':code' => $code, ':ver' => $existing['version']],
                    );
                }
                $this->db->execute(
                    'INSERT INTO form_schemas (form_code, version, title, json_schema, ui_schema, dept_code, metadata)
                     VALUES (:code, :ver, :title, :json_schema::jsonb, :ui_schema::jsonb, :dept, :meta::jsonb)',
                    [
                        ':code'        => $code,
                        ':ver'         => $version,
                        ':title'       => $schema['title'] ?? $code,
                        ':json_schema' => json_encode($schema['json_schema'] ?? $schema, JSON_UNESCAPED_UNICODE),
                        ':ui_schema'   => json_encode($schema['ui_schema'] ?? [], JSON_UNESCAPED_UNICODE),
                        ':dept'        => $schema['dept_code'] ?? 'QA',
                        ':meta'        => json_encode($schema['metadata'] ?? [], JSON_UNESCAPED_UNICODE),
                    ],
                );
                return true;
            },
        );
    }

    /**
     * Get form entries for a given form code.
     *
     * @param string $formCode Form code.
     * @param array  $filters  Optional: status, submitted_by, date_from, date_to.
     * @return array List of entries.
     */
    public function getFormEntries(string $formCode, array $filters = []): array
    {
        $code = strtoupper(trim($formCode));
        return $this->read(
            jsonReader: function () use ($code, $filters): array {
                $entryFile = $this->dataDir . '/online-forms/entries/' . $code . '.json';
                if (!is_file($entryFile)) {
                    return [];
                }
                $raw = @file_get_contents($entryFile);
                $entries = $raw ? json_decode($raw, true) : [];
                if (!is_array($entries)) {
                    $entries = [];
                }
                return $this->applyArrayFilters($entries, $filters);
            },
            pgReader: function () use ($code, $filters): array {
                $qb = QueryBuilder::table('form_entries')
                    ->select('*')
                    ->where('form_code', $code)
                    ->orderBy('recorded_at', 'DESC');
                if (!empty($filters['status'])) {
                    $qb->where('workflow_state', $filters['status']);
                }
                if (isset($filters['limit'])) {
                    $qb->limit((int)$filters['limit']);
                }
                return $qb->get();
            },
        );
    }

    /**
     * Submit a new form entry.
     *
     * @param string $formCode Form code.
     * @param array  $data     Entry data.
     * @return string Entry ID.
     */
    public function submitFormEntry(string $formCode, array $data): string
    {
        $code = strtoupper(trim($formCode));
        // DB-013: Use cryptographically secure random bytes instead of microtime
        // NEW-R6-003: Validate user-supplied entry_id format to prevent injection via controlled IDs
        if (isset($data['entry_id'])) {
            $suppliedId = (string)$data['entry_id'];
            if (!preg_match('/^[A-Z0-9_\-]{1,64}$/', $suppliedId)) {
                throw new \InvalidArgumentException('Invalid entry_id format');
            }
            $entryId = $suppliedId;
        } else {
            $entryId = $code . '-' . bin2hex(random_bytes(16));
        }

        $this->write(
            jsonWriter: function () use ($code, $data): bool {
                $entriesDir = $this->dataDir . '/online-forms/entries';
                if (!is_dir($entriesDir)) {
                    @mkdir($entriesDir, 0755, true);
                }
                $entryFile = $entriesDir . '/' . $code . '.json';

                // Load existing entries (flat JSON array)
                $existing = [];
                if (is_file($entryFile)) {
                    $raw = @file_get_contents($entryFile);
                    $existing = $raw ? json_decode($raw, true) : [];
                    if (!is_array($existing)) {
                        $existing = [];
                    }
                }

                // Add server-side metadata
                $data['_server_time'] = date('c');
                $data['_status'] = $data['_status'] ?? $data['status'] ?? 'submitted';

                // Prepend new entry (newest first)
                array_unshift($existing, $data);

                // Keep max 1000 entries per form
                if (count($existing) > 1000) {
                    $existing = array_slice($existing, 0, 1000);
                }

                @file_put_contents(
                    $entryFile,
                    json_encode($existing, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE),
                    LOCK_EX,
                );
                return true;
            },
            pgWriter: function () use ($code, $data, $entryId): bool {
                $this->db->execute(
                    'INSERT INTO form_entries (entry_id, form_code, data, workflow_state, metadata)
                     VALUES (:id::uuid, :code, :data::jsonb, :state, :meta::jsonb)',
                    [
                        ':id'    => $entryId,
                        ':code'  => $code,
                        ':data'  => json_encode($data, JSON_UNESCAPED_UNICODE) ?: throw new \RuntimeException('JSON encoding failed: ' . json_last_error_msg()),
                        ':state' => $data['workflow_state'] ?? 'draft',
                        ':meta'  => json_encode($data['metadata'] ?? [], JSON_UNESCAPED_UNICODE) ?: throw new \RuntimeException('JSON encoding failed: ' . json_last_error_msg()),
                    ],
                );
                return true;
            },
        );

        return $entryId;
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  RECORD OPERATIONS
    //  Maps to: records, record_counters tables
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Retrieve a record by its ID (e.g. "NCR-2026-001").
     *
     * @param string $recordId Record identifier.
     * @return array|null Record data or null.
     */
    public function getRecord(string $recordId): ?array
    {
        return $this->read(
            jsonReader: function () use ($recordId): ?array {
                // Records stored in per-type directories
                $parts = explode('-', $recordId, 2);
                $type = strtoupper($parts[0] ?? '');
                $dir = $this->dataDir . '/records/' . $type;
                $file = $dir . '/' . $recordId . '.json';
                $data = $this->readJson($file);
                return $data !== [] ? $data : null;
            },
            pgReader: function () use ($recordId): ?array {
                return $this->db->queryOne(
                    'SELECT * FROM records WHERE record_id = :id',
                    [':id' => $recordId],
                );
            },
        );
    }

    /**
     * Create a new record with auto-generated ID.
     *
     * @param string $type       Record type (NCR, CAPA, FAI, etc.).
     * @param string $department Department code.
     * @param array  $data       Record data.
     * @return string Generated record ID.
     */
    public function createRecord(string $type, string $department, array $data): string
    {
        $type = strtoupper(trim($type));
        $recordId = $this->getNextRecordId($type);

        $this->write(
            jsonWriter: function () use ($type, $recordId, $data): bool {
                $dir = $this->dataDir . '/records/' . $type;
                if (!is_dir($dir)) {
                    @mkdir($dir, 0775, true);
                }
                $record = array_merge($data, [
                    'record_id'  => $recordId,
                    'type'       => $type,
                    'status'     => 'open',
                    'created_at' => $this->nowIso(),
                ]);
                $this->writeJson($dir . '/' . $recordId . '.json', $record);
                return true;
            },
            pgWriter: function () use ($type, $department, $recordId, $data): bool {
                $this->db->execute(
                    'INSERT INTO records (record_id, record_type, dept_code, status, title, data, metadata)
                     VALUES (:id, :type, :dept, :status, :title, :data::jsonb, :meta::jsonb)',
                    [
                        ':id'     => $recordId,
                        ':type'   => $type,
                        ':dept'   => strtoupper($department),
                        ':status' => 'open',
                        ':title'  => $data['title'] ?? $recordId,
                        ':data'   => json_encode($data, JSON_UNESCAPED_UNICODE) ?: throw new \RuntimeException('JSON encoding failed: ' . json_last_error_msg()),
                        ':meta'   => json_encode($data['metadata'] ?? [], JSON_UNESCAPED_UNICODE) ?: throw new \RuntimeException('JSON encoding failed: ' . json_last_error_msg()),
                    ],
                );
                return true;
            },
        );

        return $recordId;
    }

    /**
     * Update an existing record.
     *
     * @param string $recordId Record identifier.
     * @param array  $data     Fields to update.
     * @return bool Success.
     */
    public function updateRecord(string $recordId, array $data): bool
    {
        return $this->write(
            jsonWriter: function () use ($recordId, $data): bool {
                $parts = explode('-', $recordId, 2);
                $type = strtoupper($parts[0] ?? '');
                $file = $this->dataDir . '/records/' . $type . '/' . $recordId . '.json';
                $existing = $this->readJson($file);
                if ($existing === []) {
                    return false;
                }
                $merged = array_merge($existing, $data, ['updated_at' => $this->nowIso()]);
                $this->writeJson($file, $merged);
                return true;
            },
            pgWriter: function () use ($recordId, $data): bool {
                $sets = ['updated_at = now()'];
                $params = [':wid' => $recordId];
                foreach (['status', 'title', 'assigned_to', 'due_date', 'closed_date'] as $field) {
                    if (array_key_exists($field, $data)) {
                        $ph = ':' . $field;
                        $sets[] = "{$field} = {$ph}";
                        $params[$ph] = $data[$field];
                    }
                }
                if (isset($data['data']) || isset($data['metadata'])) {
                    $sets[] = 'data = data || :merge_data::jsonb';
                    $params[':merge_data'] = json_encode($data['data'] ?? $data, JSON_UNESCAPED_UNICODE);
                }
                $this->db->execute(
                    'UPDATE records SET ' . implode(', ', $sets) . ' WHERE record_id = :wid',
                    $params,
                );
                return true;
            },
        );
    }

    /**
     * Generate the next sequential record ID for a given type.
     *
     * @param string $type Record type (NCR, CAPA, FAI, etc.).
     * @return string Generated ID (e.g. "NCR-2026-001").
     */
    public function getNextRecordId(string $type, ?string $year = null): string
    {
        $prefix = strtoupper(trim($type));
        $year = $year ?? date('Y');

        if ($this->usesPostgres()) {
            $row = $this->db->insertReturning(
                'INSERT INTO record_counters (record_type, fiscal_year, last_number)
                 VALUES (:type, :year, 1)
                 ON CONFLICT (record_type, fiscal_year)
                 DO UPDATE SET last_number = record_counters.last_number + 1
                 RETURNING last_number, counter_digits',
                [':type' => $prefix, ':year' => (int)$year],
            );
            $num = (int)($row['last_number'] ?? 1);
            $digits = (int)($row['counter_digits'] ?? 3);
        } else {
            // Validate prefix against registry
            $regFile = $this->dataDir . '/counters/_registry.json';
            $registry = $this->readJson($regFile);
            if (!isset($registry[$prefix])) {
                throw new RuntimeException("Prefix '{$prefix}' not found in counter registry.");
            }
            $digits = (int)($registry[$prefix]['digits'] ?? 3);

            // Atomic counter with file lock
            $countersDir = $this->dataDir . '/counters';
            if (!is_dir($countersDir)) {
                @mkdir($countersDir, 0755, true);
            }
            $counterFile = $countersDir . '/' . $prefix . '-' . $year . '.txt';

            $fp = @fopen($counterFile, 'c+');
            if (!$fp) {
                throw new RuntimeException("Cannot open counter file: {$counterFile}");
            }
            if (!flock($fp, LOCK_EX)) {
                fclose($fp);
                throw new RuntimeException("Cannot lock counter file: {$counterFile}");
            }
            $raw = fread($fp, 20);
            $current = $raw !== false ? (int)trim($raw) : 0;
            $num = $current + 1;
            $padded = str_pad((string)$num, $digits, '0', STR_PAD_LEFT);
            ftruncate($fp, 0);
            rewind($fp);
            fwrite($fp, $padded);
            fflush($fp);
            flock($fp, LOCK_UN);
            fclose($fp);

            // Log the allocation
            $logFile = $countersDir . '/_allocation_log.jsonl';
            $recordId = $prefix . '-' . $year . '-' . $padded;
            $logEntry = json_encode([
                'record_id' => $recordId,
                'prefix'    => $prefix,
                'year'      => $year,
                'seq'       => $num,
                'user'      => $_SESSION['user'] ?? 'anonymous',
                'ip'        => $_SERVER['REMOTE_ADDR'] ?? '',
                'time'      => date('c'),
            ], JSON_UNESCAPED_UNICODE) . "\n";
            @file_put_contents($logFile, $logEntry, FILE_APPEND | LOCK_EX);
        }

        $padded = str_pad((string)$num, $digits, '0', STR_PAD_LEFT);
        return $prefix . '-' . $year . '-' . $padded;
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  USER OPERATIONS
    //  Maps to: users, roles tables + users.json
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Get a user by username or user_id.
     *
     * @param string $userId Username or UUID.
     * @return array|null User data.
     */
    public function getUser(string $userId): ?array
    {
        return $this->read(
            jsonReader: function () use ($userId): ?array {
                $store = $this->readJson($this->confDir() . '/users.json');
                $u = strtolower(trim($userId));
                foreach (($store['users'] ?? []) as $user) {
                    if (strtolower((string)($user['username'] ?? '')) === $u) {
                        return $user;
                    }
                }
                return null;
            },
            pgReader: function () use ($userId): ?array {
                // Try by username first, then by UUID
                $row = $this->db->queryOne(
                    'SELECT u.*, r.role_code, r.permissions AS role_permissions
                     FROM users u
                     LEFT JOIN roles r ON u.primary_role_id = r.role_id
                     WHERE u.username = :id OR u.user_id::text = :id
                     LIMIT 1',
                    [':id' => trim($userId)],
                );
                return $row;
            },
        );
    }

    /**
     * List users with optional filters.
     *
     * @param array $filters Optional keys: dept, role, active, search.
     * @return array List of users.
     */
    public function listUsers(array $filters = []): array
    {
        return $this->read(
            jsonReader: function () use ($filters): array {
                $store = $this->readJson($this->confDir() . '/users.json');
                $users = $store['users'] ?? [];
                return $this->applyArrayFilters($users, $filters);
            },
            pgReader: function () use ($filters): array {
                $qb = QueryBuilder::table('users', 'u')
                    ->select('u.*', 'r.role_code', 'r.role_label')
                    ->leftJoin('roles r', 'u.primary_role_id = r.role_id');
                if (!empty($filters['dept'])) {
                    $qb->where('u.dept_code', strtoupper($filters['dept']));
                }
                if (!empty($filters['role'])) {
                    $qb->where('r.role_code', $filters['role']);
                }
                if (isset($filters['active'])) {
                    $status = $filters['active'] ? 'active' : 'inactive';
                    $qb->where('u.status', $status);
                }
                if (!empty($filters['search'])) {
                    // DB-009: Escape LIKE wildcard characters to prevent injection
                    $search = str_replace(['\\', '%', '_'], ['\\\\', '\%', '\_'], $filters['search']);
                    $qb->where('u.full_name', 'ILIKE', '%' . $search . '%');
                }
                $qb->orderBy('u.full_name');
                return $qb->get();
            },
        );
    }

    /**
     * Create or update a user.
     *
     * @param array $data User data with at least 'username' key.
     * @return bool Success.
     */
    public function upsertUser(array $data): bool
    {
        $username = strtolower(trim((string)($data['username'] ?? '')));
        if ($username === '') {
            return false;
        }

        return $this->write(
            jsonWriter: function () use ($data, $username): bool {
                $file = $this->confDir() . '/users.json';
                $store = $this->readJson($file);
                if (!isset($store['users'])) {
                    $store['users'] = [];
                }
                $found = false;
                foreach ($store['users'] as &$user) {
                    if (strtolower((string)($user['username'] ?? '')) === $username) {
                        $user = array_merge($user, $data);
                        $found = true;
                        break;
                    }
                }
                unset($user);
                if (!$found) {
                    $store['users'][] = $data;
                }
                $this->writeJson($file, $store);
                return true;
            },
            pgWriter: function () use ($data, $username): bool {
                $existing = $this->db->queryOne(
                    'SELECT user_id FROM users WHERE username = :u',
                    [':u' => $username],
                );
                if ($existing) {
                    $sets = ['updated_at = now()'];
                    $params = [':wuser' => $username];
                    $fieldMap = [
                        'name' => 'full_name', 'email' => 'email', 'dept' => 'dept_code',
                        'active' => 'status', 'phone' => 'metadata',
                    ];
                    foreach (['full_name', 'email', 'dept_code'] as $col) {
                        $src = array_search($col, $fieldMap, true) ?: $col;
                        if (isset($data[$src]) || isset($data[$col])) {
                            $val = $data[$col] ?? $data[$src];
                            $ph = ':' . $col;
                            $sets[] = "{$col} = {$ph}";
                            $params[$ph] = $val;
                        }
                    }
                    if (isset($data['active'])) {
                        $sets[] = 'status = :status';
                        $params[':status'] = $data['active'] ? 'active' : 'inactive';
                    }
                    $this->db->execute(
                        'UPDATE users SET ' . implode(', ', $sets) . ' WHERE username = :wuser',
                        $params,
                    );
                } else {
                    $this->db->execute(
                        'INSERT INTO users (employee_id, username, email, full_name, password_hash, dept_code, status)
                         VALUES (:eid, :user, :email, :name, :pw, :dept, :status)',
                        [
                            ':eid'    => $data['employee_id'] ?? strtoupper($username),
                            ':user'   => $username,
                            ':email'  => $data['email'] ?? $username . '@hesem.com.vn',
                            ':name'   => $data['name'] ?? $data['full_name'] ?? $username,
                            ':pw'     => $data['password_hash'] ?? $data['pw_hash'] ?? '',
                            ':dept'   => strtoupper($data['dept'] ?? $data['dept_code'] ?? 'QA'),
                            ':status' => ($data['active'] ?? true) ? 'active' : 'inactive',
                        ],
                    );
                }
                return true;
            },
        );
    }

    /**
     * Delete a user by username.
     *
     * @param string $userId Username.
     * @return bool Success.
     */
    public function deleteUser(string $userId): bool
    {
        $username = strtolower(trim($userId));
        return $this->write(
            jsonWriter: function () use ($username): bool {
                $file = $this->confDir() . '/users.json';
                $store = $this->readJson($file);
                $store['users'] = array_values(array_filter(
                    $store['users'] ?? [],
                    fn(array $u) => strtolower((string)($u['username'] ?? '')) !== $username,
                ));
                $this->writeJson($file, $store);
                return true;
            },
            pgWriter: function () use ($username): bool {
                $this->db->execute('DELETE FROM users WHERE username = :u', [':u' => $username]);
                return true;
            },
        );
    }

    /**
     * Get effective permissions for a user.
     *
     * @param string $userId Username.
     * @return array Permissions array.
     */
    public function getUserPermissions(string $userId): array
    {
        return $this->read(
            jsonReader: function () use ($userId): array {
                $permFile = $this->confDir() . '/role_permissions.json';
                $perms = $this->readJson($permFile);
                $user = $this->getUser($userId);
                $role = (string)($user['role'] ?? '');
                return $perms[$role] ?? [];
            },
            pgReader: function () use ($userId): array {
                $row = $this->db->queryOne(
                    'SELECT r.permissions
                     FROM users u
                     JOIN roles r ON u.primary_role_id = r.role_id
                     WHERE u.username = :u',
                    [':u' => strtolower(trim($userId))],
                );
                if ($row && isset($row['permissions'])) {
                    $p = $row['permissions'];
                    return is_string($p) ? (json_decode($p, true) ?? []) : (is_array($p) ? $p : []);
                }
                return [];
            },
        );
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  AUTH OPERATIONS
    //  Maps to: sessions table + PHP session
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Verify user credentials.
     *
     * @param string $email    Email or username.
     * @param string $password Plain-text password.
     * @return array|null User record on success, null on failure.
     */
    public function verifyCredentials(string $email, string $password): ?array
    {
        return $this->read(
            jsonReader: function () use ($email, $password): ?array {
                $store = $this->readJson($this->confDir() . '/users.json');
                $emailLower = strtolower(trim($email));
                foreach (($store['users'] ?? []) as $user) {
                    $userEmail = strtolower((string)($user['username'] ?? ''));
                    if ($userEmail === $emailLower && password_verify($password, (string)($user['pw_hash'] ?? ''))) {
                        return $user;
                    }
                }
                return null;
            },
            pgReader: function () use ($email, $password): ?array {
                $row = $this->db->queryOne(
                    'SELECT * FROM users WHERE (email = :e OR username = :e) AND status = :s LIMIT 1',
                    [':e' => strtolower(trim($email)), ':s' => 'active'],
                );
                if ($row && password_verify($password, (string)($row['password_hash'] ?? ''))) {
                    return $row;
                }
                return null;
            },
        );
    }

    /**
     * Save a session record.
     *
     * @param string $sessionId Session identifier.
     * @param array  $data      Session payload.
     * @return bool Success.
     */
    public function saveSession(string $sessionId, array $data): bool
    {
        if (!$this->usesPostgres()) {
            // JSON mode uses PHP's native session handler
            return true;
        }
        return $this->write(
            jsonWriter: fn(): bool => true,
            pgWriter: function () use ($sessionId, $data): bool {
                $this->db->execute(
                    'INSERT INTO sessions (session_id, user_id, token_hash, csrf_token, mfa_verified, expires_at)
                     VALUES (:sid::uuid, :uid::uuid, :token, :csrf, :mfa, :exp)
                     ON CONFLICT (session_id) DO UPDATE SET
                         last_active_at = now(),
                         mfa_verified = EXCLUDED.mfa_verified',
                    [
                        ':sid'   => $sessionId,
                        ':uid'   => $data['user_id'] ?? '00000000-0000-0000-0000-000000000000',
                        ':token' => $data['token_hash'] ?? hash('sha256', $sessionId),
                        ':csrf'  => $data['csrf_token'] ?? '',
                        ':mfa'   => $data['mfa_verified'] ?? false,
                        ':exp'   => $data['expires_at'] ?? date('c', time() + 14400),
                    ],
                );
                return true;
            },
        );
    }

    /**
     * Get a session by its ID.
     *
     * @param string $sessionId Session identifier.
     * @return array|null Session data.
     */
    public function getSession(string $sessionId): ?array
    {
        if (!$this->usesPostgres()) {
            return null; // PHP session handles this in JSON mode
        }
        return $this->db->queryOne(
            'SELECT * FROM sessions WHERE session_id = :sid::uuid AND expires_at > now()',
            [':sid' => $sessionId],
        );
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  CONFIG OPERATIONS
    //  Maps to: variable_registry, naming_patterns, portal_display_config
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Get a configuration value by key.
     *
     * @param string $key Configuration key (e.g. "portal_display_config", "role_permissions").
     * @return mixed Configuration value.
     */
    public function getConfig(string $key): mixed
    {
        return $this->read(
            jsonReader: function () use ($key): mixed {
                if (\function_exists('portal_system_config_shadow_read')) {
                    $shadow = \portal_system_config_shadow_read($key);
                    if (\is_array($shadow)) {
                        return $shadow;
                    }
                }
                $fileMap = [
                    'portal_display_config' => $this->confDir() . '/portal_display_config.json',
                    'role_permissions'       => $this->confDir() . '/role_permissions.json',
                    'docs_visibility'        => $this->confDir() . '/docs_visibility.json',
                    'form_control_registry'  => $this->confDir() . '/form_control_registry.json',
                ];
                $file = $fileMap[$key] ?? ($this->confDir() . '/' . $key . '.json');
                return $this->readJson($file) ?: null;
            },
            pgReader: function () use ($key): mixed {
                $row = $this->db->queryOne(
                    "SELECT value FROM (
                        SELECT label AS key, to_jsonb(enum_values) AS value FROM variable_registry WHERE category = 'config' AND key = :k
                     ) sub LIMIT 1",
                    [':k' => $key],
                );
                if ($row && isset($row['value'])) {
                    $v = $row['value'];
                    return is_string($v) ? (json_decode($v, true) ?? $v) : $v;
                }
                return null;
            },
        );
    }

    /**
     * Save a configuration value.
     *
     * @param string $key   Configuration key.
     * @param mixed  $value Configuration value.
     * @return bool Success.
     */
    public function saveConfig(string $key, mixed $value): bool
    {
        return $this->write(
            jsonWriter: function () use ($key, $value): bool {
                $fileMap = [
                    'portal_display_config' => $this->confDir() . '/portal_display_config.json',
                    'role_permissions'       => $this->confDir() . '/role_permissions.json',
                    'docs_visibility'        => $this->confDir() . '/docs_visibility.json',
                ];
                $file = $fileMap[$key] ?? ($this->confDir() . '/' . $key . '.json');
                $data = is_array($value) ? $value : ['value' => $value];
                $data['updated_at'] = $this->nowIso();
                $this->writeJson($file, $data);
                if (\function_exists('portal_system_config_shadow_write')) {
                    \portal_system_config_shadow_write($key, $data);
                }
                return true;
            },
            pgWriter: function () use ($key, $value): bool {
                $jsonVal = is_array($value)
                    ? json_encode($value, JSON_UNESCAPED_UNICODE)
                    : json_encode(['value' => $value], JSON_UNESCAPED_UNICODE);
                $this->db->execute(
                    "INSERT INTO variable_registry (category, key, label, data_type, enum_values)
                     VALUES ('config', :k, :k, 'json', :v::jsonb)
                     ON CONFLICT (category, key) DO UPDATE SET enum_values = EXCLUDED.enum_values",
                    [':k' => $key, ':v' => $jsonVal],
                );
                return true;
            },
        );
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  AUDIT TRAIL
    //  Maps to: audit_events table (append-only, partitioned)
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Log an audit event.
     *
     * @param string $eventType     Event type (e.g. "doc.created", "user.login").
     * @param string $aggregateType Entity type (e.g. "document", "user").
     * @param string $aggregateId   Entity identifier.
     * @param array  $payload       Event payload/details.
     */
    public function logEvent(string $eventType, string $aggregateType, string $aggregateId, array $payload, array $options = []): void
    {
        $metadata = is_array($options['metadata'] ?? null) ? (array)$options['metadata'] : [];
        $entry = [
            'event_type'     => $eventType,
            'aggregate_type' => $aggregateType,
            'aggregate_id'   => $aggregateId,
            'payload'        => $payload,
            'recorded_at'    => $this->nowIso(),
        ];
        if (isset($options['actor_id']) && is_scalar($options['actor_id'])) {
            $entry['actor_id'] = (string)$options['actor_id'];
        }
        if (isset($options['actor_name']) && is_scalar($options['actor_name'])) {
            $entry['actor_name'] = (string)$options['actor_name'];
        }
        if (isset($options['ip_address']) && is_scalar($options['ip_address'])) {
            $entry['ip_address'] = (string)$options['ip_address'];
        }
        if (isset($options['session_id']) && is_scalar($options['session_id'])) {
            $entry['session_id'] = (string)$options['session_id'];
        }
        if ($metadata !== []) {
            $entry['metadata'] = $metadata;
        }

        // Regulated audit authority is singular when Postgres is enabled.
        // JSONL is only a non-Postgres migration fallback and must never
        // become a competing governed audit sink.
        if (!$this->usesPostgres()) {
            $logDir = $this->dataDir . '/audit';
            if (!is_dir($logDir)) {
                @mkdir($logDir, 0775, true);
            }
            $logFile = $logDir . '/audit_' . date('Y-m') . '.jsonl';
            @file_put_contents(
                $logFile,
                json_encode($entry, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n",
                FILE_APPEND | LOCK_EX,
            );
        }

        if (!$this->usesPostgres() && \function_exists('portal_system_audit_shadow_write')) {
            \portal_system_audit_shadow_write($entry);
        }

        // Also write to Postgres when enabled
        if ($this->usesPostgres()) {
            try {
                $this->db->execute(
                    'INSERT INTO audit_events (
                        event_type,
                        aggregate_type,
                        aggregate_id,
                        actor_id,
                        actor_name,
                        payload,
                        metadata,
                        ip_address,
                        session_id
                     )
                     VALUES (
                        :type,
                        :agg_type,
                        :agg_id,
                        :actor_id,
                        :actor_name,
                        :payload::jsonb,
                        :meta::jsonb,
                        :ip_address::inet,
                        :session_id::uuid
                     )',
                    [
                        ':type'     => $eventType,
                        ':agg_type' => $aggregateType,
                        ':agg_id'   => $aggregateId,
                        ':actor_id' => isset($entry['actor_id']) && trim((string)$entry['actor_id']) !== '' ? (string)$entry['actor_id'] : null,
                        ':actor_name' => isset($entry['actor_name']) && trim((string)$entry['actor_name']) !== '' ? (string)$entry['actor_name'] : null,
                        ':payload'  => json_encode($payload, JSON_UNESCAPED_UNICODE) ?: throw new \RuntimeException('JSON encoding failed: ' . json_last_error_msg()),
                        ':meta'     => json_encode($metadata !== [] ? $metadata : ['source' => 'api'], JSON_UNESCAPED_UNICODE) ?: throw new \RuntimeException('JSON encoding failed: ' . json_last_error_msg()),
                        ':ip_address' => isset($entry['ip_address']) && trim((string)$entry['ip_address']) !== '' ? (string)$entry['ip_address'] : null,
                        ':session_id' => isset($entry['session_id']) && trim((string)$entry['session_id']) !== '' ? (string)$entry['session_id'] : null,
                    ],
                );
            } catch (\Throwable $e) {
                // Audit log failures must not break the main operation
                @error_log('[DataLayer] audit write failed: ' . $e->getMessage());
            }
        }
    }

    /**
     * Query the audit log.
     *
     * @param array $filters Optional: event_type, aggregate_type, aggregate_id, from, to, limit.
     * @return array List of audit events.
     */
    public function getAuditLog(array $filters = []): array
    {
        return $this->read(
            jsonReader: function () use ($filters): array {
                if (\function_exists('portal_system_audit_shadow_read')) {
                    $shadow = \portal_system_audit_shadow_read($filters);
                    if (\is_array($shadow)) {
                        return $shadow;
                    }
                }
                $dir = $this->dataDir . '/audit';
                if (!is_dir($dir)) {
                    return [];
                }
                $entries = [];
                foreach ((array)@scandir($dir) as $fn) {
                    if (!str_ends_with((string)$fn, '.jsonl')) {
                        continue;
                    }
                    $lines = @file($dir . '/' . $fn, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
                    foreach ($lines ?: [] as $line) {
                        $entry = json_decode($line, true);
                        if ($entry) {
                            $entries[] = $entry;
                        }
                    }
                }
                if (!empty($filters['event_type'])) {
                    $entries = array_values(array_filter($entries, static fn(array $row): bool => (string)($row['event_type'] ?? $row['action'] ?? '') === (string)$filters['event_type']));
                }
                if (!empty($filters['aggregate_type'])) {
                    $entries = array_values(array_filter($entries, static fn(array $row): bool => (string)($row['aggregate_type'] ?? 'api_action') === (string)$filters['aggregate_type']));
                }
                if (!empty($filters['aggregate_id'])) {
                    $entries = array_values(array_filter($entries, static fn(array $row): bool => (string)($row['aggregate_id'] ?? '') === (string)$filters['aggregate_id']));
                }
                if (!empty($filters['actor_name'])) {
                    $entries = array_values(array_filter($entries, static fn(array $row): bool => (string)($row['actor_name'] ?? $row['user'] ?? '') === (string)$filters['actor_name']));
                }
                if (!empty($filters['from'])) {
                    $from = (string)$filters['from'];
                    $entries = array_values(array_filter($entries, static fn(array $row): bool => (string)($row['recorded_at'] ?? $row['timestamp'] ?? '') >= $from));
                }
                if (!empty($filters['to'])) {
                    $to = (string)$filters['to'];
                    $entries = array_values(array_filter($entries, static fn(array $row): bool => (string)($row['recorded_at'] ?? $row['timestamp'] ?? '') <= $to));
                }
                if (!empty($filters['search'])) {
                    $needle = mb_strtolower((string)$filters['search']);
                    $entries = array_values(array_filter($entries, static function (array $row) use ($needle): bool {
                        $haystack = mb_strtolower(json_encode([
                            'actor_name' => $row['actor_name'] ?? $row['user'] ?? '',
                            'event_type' => $row['event_type'] ?? $row['action'] ?? '',
                            'aggregate_type' => $row['aggregate_type'] ?? '',
                            'aggregate_id' => $row['aggregate_id'] ?? '',
                            'payload' => $row['payload'] ?? [],
                        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?: '');
                        return $needle === '' || str_contains($haystack, $needle);
                    }));
                }
                // Newest first
                usort($entries, fn($a, $b) => strcmp(
                    (string)($b['recorded_at'] ?? ''),
                    (string)($a['recorded_at'] ?? ''),
                ));
                $limit = (int)($filters['limit'] ?? 100);
                return array_slice($entries, 0, $limit);
            },
            pgReader: function () use ($filters): array {
                $qb = QueryBuilder::table('audit_events')
                    ->select('*')
                    ->orderBy('recorded_at', 'DESC');
                if (!empty($filters['event_type'])) {
                    $qb->where('event_type', $filters['event_type']);
                }
                if (!empty($filters['aggregate_type'])) {
                    $qb->where('aggregate_type', $filters['aggregate_type']);
                }
                if (!empty($filters['aggregate_id'])) {
                    $qb->where('aggregate_id', $filters['aggregate_id']);
                }
                if (!empty($filters['actor_name'])) {
                    $qb->where('actor_name', $filters['actor_name']);
                }
                if (!empty($filters['from'])) {
                    $qb->where('recorded_at', '>=', $filters['from']);
                }
                if (!empty($filters['to'])) {
                    $qb->where('recorded_at', '<=', $filters['to']);
                }
                if (!empty($filters['search'])) {
                    // DB-008: Escape LIKE wildcard characters to prevent injection
                    $search = str_replace(['\\', '%', '_'], ['\\\\', '\%', '\_'], (string)$filters['search']);
                    $needle = '%' . $search . '%';
                    $qb->whereRaw('(coalesce(actor_name, \'\') ILIKE ? OR coalesce(event_type, \'\') ILIKE ? OR coalesce(aggregate_type, \'\') ILIKE ? OR coalesce(aggregate_id, \'\') ILIKE ? OR CAST(payload AS text) ILIKE ?)', [
                        $needle,
                        $needle,
                        $needle,
                        $needle,
                        $needle,
                    ]);
                }
                $qb->limit((int)($filters['limit'] ?? 100));
                return $qb->get();
            },
        );
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  DICTIONARY (GLOSSARY)
    //  Maps to: glossary/terminology table + dict-data.json
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Get dictionary/glossary entries.
     *
     * @param array $filters Optional: cat, search, limit.
     * @return array List of dictionary entries.
     */
    public function getDictEntries(array $filters = []): array
    {
        return $this->read(
            jsonReader: function () use ($filters): array {
                $dictFile = $this->rootDir . '/mom/docs/glossary/dict-data.json';
                $items = $this->readJson($dictFile);
                return $this->applyArrayFilters($items, $filters);
            },
            pgReader: function () use ($filters): array {
                // Use variable_registry with category = 'glossary' or a dedicated table
                $qb = QueryBuilder::table('variable_registry')
                    ->select('*')
                    ->where('category', 'glossary')
                    ->orderBy('label');
                if (!empty($filters['search'])) {
                    // DB-008: Escape LIKE wildcard characters to prevent injection
                    $search = str_replace(['\\', '%', '_'], ['\\\\', '\%', '\_'], $filters['search']);
                    $qb->where('label', 'ILIKE', '%' . $search . '%');
                }
                if (isset($filters['limit'])) {
                    $qb->limit((int)$filters['limit']);
                }
                return $qb->get();
            },
        );
    }

    /**
     * Create or update a dictionary entry.
     *
     * @param array $data Dictionary entry data with 'term' key.
     * @return bool Success.
     */
    public function upsertDictEntry(array $data): bool
    {
        $term = trim((string)($data['term'] ?? ''));
        if ($term === '') {
            return false;
        }
        $originalTerm = trim((string)($data['originalTerm'] ?? $term));

        if (function_exists('dict_validate_item')) {
            $validationError = dict_validate_item($data, $originalTerm);
            if ($validationError !== null) {
                return false;
            }
            $data = dict_prepare_item($data);
            $term = $data['term'];
        } else {
            $meaning = trim((string)($data['meaning'] ?? ''));
            $def = trim((string)($data['def'] ?? ''));
            if ($meaning === '' || $def === '') {
                return false;
            }
            $isStatus = in_array(strtoupper($term), ['PASS', 'FAIL', 'REJECT', 'REWORK'], true);
            $isAbbreviation = !$isStatus
                && !str_contains($term, ' ')
                && preg_match('/^[A-Z0-9][A-Z0-9\/&+.\-]{1,}$/', $term) === 1;
            $isAlias = preg_match('/^(.*?)\s*\(([A-Z0-9][A-Z0-9\/&+.\-]{1,})\)$/', $term) === 1;
            if ($isAlias && strcasecmp($originalTerm, $term) !== 0) {
                return false;
            }
            if ($isAbbreviation && strcasecmp($meaning, $term) === 0) {
                return false;
            }
        }

        return $this->write(
            jsonWriter: function () use ($data, $term): bool {
                $dictFile = $this->rootDir . '/mom/docs/glossary/dict-data.json';
                $jsFile = $this->rootDir . '/mom/docs/glossary/dict-data.js';
                $items = $this->readJson($dictFile);
                $found = false;
                foreach ($items as &$it) {
                    if (strcasecmp(trim((string)($it['term'] ?? '')), $term) === 0) {
                        $it = array_merge($it, $data);
                        $found = true;
                        break;
                    }
                }
                unset($it);
                if (!$found) {
                    $items[] = $data;
                }
                // Sort by term
                usort($items, fn($a, $b) => strcasecmp((string)($a['term'] ?? ''), (string)($b['term'] ?? '')));
                $this->writeJson($dictFile, $items);
                // Rebuild JS
                $payload = json_encode($items, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
                $js = "window.HESEM_GLOSSARY = " . $payload . ";\nwindow.DICT_DATA = window.HESEM_GLOSSARY;\n";
                @file_put_contents($jsFile, $js, LOCK_EX);
                return true;
            },
            pgWriter: function () use ($data, $term): bool {
                $this->db->execute(
                    "INSERT INTO variable_registry (category, key, label, data_type, description, enum_values)
                     VALUES ('glossary', :key, :label, 'text', :desc, :meta::jsonb)
                     ON CONFLICT (category, key) DO UPDATE SET
                         label = EXCLUDED.label,
                         description = EXCLUDED.description,
                         enum_values = EXCLUDED.enum_values",
                    [
                        ':key'   => strtolower(str_replace(' ', '_', $term)),
                        ':label' => $term,
                        ':desc'  => $data['meaning'] ?? $data['def'] ?? '',
                        ':meta'  => json_encode($data, JSON_UNESCAPED_UNICODE),
                    ],
                );
                return true;
            },
        );
    }

    /**
     * Delete a dictionary entry.
     *
     * @param string $id Term string or unique identifier.
     * @return bool Success.
     */
    public function deleteDictEntry(string $id): bool
    {
        $term = trim($id);
        return $this->write(
            jsonWriter: function () use ($term): bool {
                $dictFile = $this->rootDir . '/mom/docs/glossary/dict-data.json';
                $jsFile = $this->rootDir . '/mom/docs/glossary/dict-data.js';
                $items = $this->readJson($dictFile);
                $items = array_values(array_filter($items, function ($it) use ($term): bool {
                    return strcasecmp(trim((string)($it['term'] ?? '')), $term) !== 0;
                }));
                $this->writeJson($dictFile, $items);
                $payload = json_encode($items, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
                $js = "window.HESEM_GLOSSARY = " . $payload . ";\nwindow.DICT_DATA = window.HESEM_GLOSSARY;\n";
                @file_put_contents($jsFile, $js, LOCK_EX);
                return true;
            },
            pgWriter: function () use ($term): bool {
                $this->db->execute(
                    "DELETE FROM variable_registry WHERE category = 'glossary' AND (key = :k OR label = :l)",
                    [':k' => strtolower(str_replace(' ', '_', $term)), ':l' => $term],
                );
                return true;
            },
        );
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  KPI / ANALYTICS
    //  Maps to: kpi_definitions, kpi_snapshots tables
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Get KPI snapshot data for a metric and period.
     *
     * @param string $metricCode Metric code / KPI ID.
     * @param string $period     Period identifier (e.g. "2026-Q1", "2026-03").
     * @return array Snapshot records.
     */
    public function getKpiSnapshot(string $metricCode, string $period): array
    {
        return $this->read(
            jsonReader: function () use ($metricCode, $period): array {
                $file = $this->dataDir . '/kpi/' . $metricCode . '.json';
                $data = $this->readJson($file);
                if (isset($data['snapshots']) && is_array($data['snapshots'])) {
                    return array_values(array_filter(
                        $data['snapshots'],
                        fn($s) => ($s['period'] ?? '') === $period,
                    ));
                }
                return $data !== [] ? [$data] : [];
            },
            pgReader: function () use ($metricCode, $period): array {
                return $this->db->query(
                    "SELECT ks.*
                     FROM kpi_snapshots ks
                     JOIN kpi_definitions kd ON ks.kpi_id = kd.kpi_id
                     WHERE kd.metric_code = :code
                       AND to_char(ks.period_start, 'YYYY-MM') = :period
                     ORDER BY ks.period_start",
                    [':code' => $metricCode, ':period' => $period],
                );
            },
        );
    }

    /**
     * Save a KPI snapshot.
     *
     * @param string $metricCode Metric code.
     * @param array  $data       Snapshot data.
     * @return bool Success.
     */
    public function saveKpiSnapshot(string $metricCode, array $data): bool
    {
        return $this->write(
            jsonWriter: function () use ($metricCode, $data): bool {
                $dir = $this->dataDir . '/kpi';
                if (!is_dir($dir)) {
                    @mkdir($dir, 0775, true);
                }
                $file = $dir . '/' . $metricCode . '.json';
                $existing = $this->readJson($file);
                if (!isset($existing['snapshots'])) {
                    $existing = ['metric_code' => $metricCode, 'snapshots' => []];
                }
                $existing['snapshots'][] = array_merge($data, ['recorded_at' => $this->nowIso()]);
                $this->writeJson($file, $existing);
                return true;
            },
            pgWriter: function () use ($metricCode, $data): bool {
                // Resolve kpi_id from metric_code
                $kpi = $this->db->queryOne(
                    'SELECT kpi_id FROM kpi_definitions WHERE metric_code = :code',
                    [':code' => $metricCode],
                );
                if (!$kpi) {
                    return false;
                }
                $this->db->execute(
                    'INSERT INTO kpi_snapshots (kpi_id, period_start, period_end, actual_value, target_value, metadata)
                     VALUES (:kid::uuid, :ps, :pe, :av, :tv, :meta::jsonb)',
                    [
                        ':kid'  => $kpi['kpi_id'],
                        ':ps'   => $data['period_start'] ?? date('Y-m-01'),
                        ':pe'   => $data['period_end'] ?? date('Y-m-t'),
                        ':av'   => $data['actual_value'] ?? null,
                        ':tv'   => $data['target_value'] ?? null,
                        ':meta' => json_encode($data, JSON_UNESCAPED_UNICODE),
                    ],
                );
                return true;
            },
        );
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  REGISTRY / LIBRARY ACCESSORS
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Get the counter registry (prefix definitions for record IDs).
     *
     * @return array Associative array keyed by prefix (e.g. "NCR", "CAPA").
     */
    public function getCounterRegistry(): array
    {
        return $this->readJson($this->dataDir . '/counters/_registry.json');
    }

    /**
     * Get the document type registry.
     *
     * @return array Document type definitions.
     */
    public function getDocumentTypeRegistry(): array
    {
        return $this->readJson($this->confDir() . '/document_type_registry.json');
    }

    /**
     * Get the variable library.
     *
     * @return array Variable library data.
     */
    public function getVariableLibrary(): array
    {
        return $this->readJson($this->confDir() . '/variable_library.json');
    }

    // ═══════════════════════════════════════════════════════════════════════
    //  GENERIC HELPERS (PRIVATE)
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Read a JSON file and return its contents as an array.
     *
     * @param string $filePath Absolute path to JSON file.
     * @return array Decoded data (empty array if file missing or invalid).
     */
    private function readJson(string $filePath): array
    {
        if (!is_file($filePath)) {
            return [];
        }
        $raw = @file_get_contents($filePath);
        if ($raw === false) {
            return [];
        }
        $data = json_decode($raw, true);
        return is_array($data) ? $data : [];
    }

    /**
     * Write an array as JSON to a file (atomic via tmp + rename).
     *
     * @param string $filePath Absolute path.
     * @param array  $data     Data to encode.
     * @return bool Success.
     */
    private function writeJson(string $filePath, array $data): bool
    {
        $dir = dirname($filePath);
        if (!is_dir($dir)) {
            @mkdir($dir, 0775, true);
        }
        $json = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
        if ($json === false) {
            return false;
        }
        $tmp = $filePath . '.tmp';
        if (@file_put_contents($tmp, $json, LOCK_EX) === false) {
            return false;
        }
        @rename($tmp, $filePath);
        return true;
    }

    /**
     * Strategy dispatcher for READ operations.
     *
     * @param callable $jsonReader Returns data from JSON source.
     * @param callable $pgReader   Returns data from PostgreSQL.
     * @return mixed
     */
    private function read(callable $jsonReader, callable $pgReader): mixed
    {
        return match ($this->mode) {
            self::MODE_JSON_ONLY,
            self::MODE_SHADOW_WRITE => $this->jsonRead($jsonReader),

            self::MODE_POSTGRES_PRIMARY => $this->pgWithFallback($pgReader, $jsonReader),

            self::MODE_POSTGRES_ONLY => $this->pgRead($pgReader),
            default => throw new RuntimeException("Unsupported data layer read mode: {$this->mode}"),
        };
    }

    /**
     * Read using the global mode unless a per-domain override is configured.
     *
     * Supported override values:
     * - default          => follow global mode
     * - json             => force JSON
     * - postgres_primary => force PostgreSQL with JSON fallback
     * - postgres_only    => force PostgreSQL only
     */
    private function readForDomain(string $domain, callable $jsonReader, callable $pgReader): mixed
    {
        $override = $this->domainReadMode($domain);

        return match ($override) {
            'json' => $this->jsonRead($jsonReader),
            'postgres_primary' => $this->pgWithFallback($pgReader, $jsonReader),
            'postgres_only' => $this->pgRead($pgReader),
            default => $this->read($jsonReader, $pgReader),
        };
    }

    /**
     * Strategy dispatcher for WRITE operations.
     *
     * @param callable $jsonWriter Writes to JSON (returns bool).
     * @param callable $pgWriter   Writes to PostgreSQL (returns bool).
     * @return bool
     */
    private function write(callable $jsonWriter, callable $pgWriter): bool
    {
        return match ($this->mode) {
            self::MODE_JSON_ONLY => $jsonWriter(),

            self::MODE_SHADOW_WRITE => $this->shadowWriteBoth($jsonWriter, $pgWriter),

            self::MODE_POSTGRES_PRIMARY,
            self::MODE_POSTGRES_ONLY => $pgWriter(),
            default => throw new RuntimeException("Unsupported data layer write mode: {$this->mode}"),
        };
    }

    /**
     * Shadow-write: write to PostgreSQL first (authoritative), then JSON (cache/fallback).
     * PostgreSQL failures are logged but JSON write still proceeds.
     *
     * @param callable $jsonWriter JSON writer.
     * @param callable $pgWriter   PostgreSQL writer.
     * @return bool JSON writer result.
     */
    private function shadowWriteBoth(callable $jsonWriter, callable $pgWriter): bool
    {
        $pgOk = false;
        try {
            $pgWriter();
            $pgOk = true;
        } catch (\Throwable $e) {
            error_log('[DataLayer] shadow write to PG failed: ' . $e->getMessage());
        }

        $result = $jsonWriter();
        if (!$pgOk) {
            error_log('[DataLayer] WARNING: PG write failed but JSON write succeeded - data may diverge');
        }

        return $result;
    }

    /**
     * Attempt PostgreSQL read, fall back to JSON on error.
     *
     * @param callable $pgReader   PostgreSQL reader.
     * @param callable $jsonReader JSON fallback reader.
     * @return mixed
     */
    private function pgWithFallback(callable $pgReader, callable $jsonReader): mixed
    {
        $attempts = max(1, $this->getReadRetryCount());
        $delayMs = max(0, $this->getReadRetryDelayMs());
        $lastError = null;

        for ($attempt = 1; $attempt <= $attempts; $attempt++) {
            try {
                $result = $pgReader();
                $this->setReadMeta('postgres', false, '', ['attempts' => $attempt]);
                return $result;
            } catch (\Throwable $e) {
                $lastError = $e;
                if ($attempt < $attempts && $delayMs > 0) {
                    usleep($delayMs * 1000);
                }
            }
        }

        if ($lastError !== null) {
            @error_log('[DataLayer] PG read failed after retries, falling back to JSON: ' . $lastError->getMessage());
        }

        $result = $jsonReader();
        $this->setReadMeta(
            'json_fallback',
            true,
            $lastError?->getMessage() ?? 'postgres_read_failed',
            ['attempts' => $attempts]
        );
        return $result;
    }

    /**
     * Execute a read against the JSON store and capture source metadata.
     */
    private function jsonRead(callable $jsonReader): mixed
    {
        $result = $jsonReader();
        $this->setReadMeta('json', false, '', ['attempts' => 1]);
        return $result;
    }

    /**
     * Execute a read against PostgreSQL and capture source metadata.
     */
    private function pgRead(callable $pgReader): mixed
    {
        $result = $pgReader();
        $this->setReadMeta('postgres', false, '', ['attempts' => 1]);
        return $result;
    }

    /**
     * Persist the metadata for the most recent read decision.
     */
    private function setReadMeta(string $source, bool $fallback = false, string $error = '', array $extra = []): void
    {
        $this->lastReadMeta = [
            'source' => $source,
            'fallback' => $fallback,
            'error' => $error,
            'mode' => $this->mode,
            'timestamp' => date(DATE_ATOM),
            'attempts' => 1,
        ];
        foreach ($extra as $key => $value) {
            $this->lastReadMeta[$key] = $value;
        }
    }

    private function getReadRetryCount(): int
    {
        return max(1, (int)($this->config['read_retry_count'] ?? 3));
    }

    private function getReadRetryDelayMs(): int
    {
        return max(0, (int)($this->config['read_retry_delay_ms'] ?? 150));
    }

    /**
     * Check if the current mode involves PostgreSQL.
     */
    private function usesPostgres(): bool
    {
        return $this->mode !== self::MODE_JSON_ONLY;
    }

    private function domainReadMode(string $domain): string
    {
        $key = strtolower(trim($domain)) . '_read_mode';
        $raw = strtolower(trim((string)($this->config[$key] ?? 'default')));
        return in_array($raw, ['default', 'json', 'postgres_primary', 'postgres_only'], true)
            ? $raw
            : 'default';
    }

    /**
     * Lazy constructor for runtime JSON -> PG shadow sync adapter.
     */
    private function runtimeShadow(): RuntimeShadowSync
    {
        if ($this->runtimeShadow === null) {
            if (!$this->usesPostgres()) {
                throw new RuntimeException('Runtime shadow sync requested in JSON-only mode.');
            }
            $this->runtimeShadow = new RuntimeShadowSync($this->db);
        }
        return $this->runtimeShadow;
    }

    /**
     * Rebuild the governed runtime master-data JSON shape from PostgreSQL mirrors.
     */
    private function loadRuntimeMasterDataFromPg(): array
    {
        $customerRows = $this->db->query('SELECT metadata, updated_at FROM customers ORDER BY customer_id');
        $supplierRows = $this->db->query('SELECT metadata, updated_at FROM vendors ORDER BY vendor_id');
        $partRows = $this->db->query('SELECT metadata, updated_at FROM items ORDER BY item_id');
        $revisionRows = $this->db->query('SELECT metadata, valid_from FROM item_revisions ORDER BY item_id, rev');
        $workCenterRows = $this->db->query('SELECT metadata, updated_at FROM work_centers ORDER BY work_center_id');
        $machineRows = $this->db->query('SELECT metadata, updated_at FROM equipment ORDER BY equipment_id');
        $toolingRows = $this->db->query("SELECT metadata, updated_at FROM tools WHERE COALESCE(metadata->>'shadow_source', '') <> 'mes_runtime' ORDER BY tool_id");
        $capaRows = $this->db->query("SELECT data, updated_at FROM records WHERE record_type = 'CAPA' ORDER BY record_id");
        $employeeRows = $this->db->query('SELECT employee_id, employee_name, user_id_code, role_code, role_label, dept_code, shift, is_active, metadata, updated_at FROM employees ORDER BY employee_id');
        $programRows = $this->db->query('SELECT metadata, updated_at FROM mes_nc_release_packages ORDER BY package_id');
        $adapterRows = $this->db->query('SELECT metadata, updated_at FROM mes_connectivity_adapters ORDER BY adapter_id');
        $alarmCatalogRows = $this->db->query('SELECT metadata, updated_at FROM mes_alarm_catalog ORDER BY alarm_code');
        $alarmPlaybookRows = $this->db->query('SELECT metadata, updated_at FROM mes_alarm_playbooks ORDER BY playbook_id');
        $toolAssemblyRows = $this->db->query('SELECT metadata, updated_at FROM mes_tool_assemblies ORDER BY assembly_id');
        $reasonRows = $this->db->query("SELECT key, label, label_vi, example FROM variable_registry WHERE category = 'runtime_downtime_reason' ORDER BY key");
        $resolutionRows = $this->db->query("SELECT key, label, label_vi, example FROM variable_registry WHERE category = 'runtime_downtime_resolution' ORDER BY key");

        $store = [
            '_meta' => $this->buildRuntimeStoreMeta('master_data', [
                $customerRows,
                $supplierRows,
                $partRows,
                $revisionRows,
                $workCenterRows,
                $machineRows,
                $toolingRows,
                $capaRows,
                $employeeRows,
                $programRows,
                $adapterRows,
                $alarmCatalogRows,
                $alarmPlaybookRows,
                $toolAssemblyRows,
            ]),
            'customers' => $this->extractMetadataRows($customerRows),
            'suppliers' => $this->extractMetadataRows($supplierRows),
            'parts' => $this->extractMetadataRows($partRows),
            'revisions' => $this->extractMetadataRows($revisionRows),
            'work_centers' => $this->extractMetadataRows($workCenterRows),
            'machines' => $this->extractMetadataRows($machineRows),
            'tooling_assets' => $this->extractMetadataRows($toolingRows),
            'capas' => $this->extractMetadataRows($capaRows, 'data'),
            'operators' => $this->extractEmployeeOperatorRows($employeeRows),
            'nc_program_releases' => $this->extractMetadataRows($programRows),
            'downtime_reason_codes' => $this->extractVariableMirrorRows($reasonRows, 'reason_code', 'reason_name', 'reason_name_vi'),
            'downtime_resolution_codes' => $this->extractVariableMirrorRows($resolutionRows, 'resolution_code', 'resolution_name', 'resolution_name_vi'),
            'mes_connectivity_adapters' => $this->extractMetadataRows($adapterRows),
            'mes_alarm_catalog' => $this->extractMetadataRows($alarmCatalogRows),
            'mes_alarm_playbooks' => $this->extractMetadataRows($alarmPlaybookRows),
            'tool_assemblies' => $this->extractMetadataRows($toolAssemblyRows),
        ];

        if ($this->storeCollectionCount($store, ['customers', 'parts', 'machines']) === 0) {
            throw new RuntimeException('runtime_master_pg_empty');
        }

        return $store;
    }

    /**
     * Rebuild the governed runtime order store from PostgreSQL mirrors.
     */
    private function loadRuntimeOrdersFromPg(): array
    {
        $salesRows = $this->db->query('SELECT metadata, updated_at FROM sales_orders ORDER BY sales_order_number');
        $jobRows = $this->db->query('SELECT metadata, updated_at FROM job_orders ORDER BY job_number');
        $workRows = $this->db->query('SELECT metadata, updated_at FROM job_operations ORDER BY updated_at, operation_seq');

        $salesOrders = $this->extractMetadataRows($salesRows);
        $jobOrders = $this->extractMetadataRows($jobRows);
        $workOrders = $this->extractMetadataRows($workRows);

        $store = [
            '_meta' => $this->buildRuntimeStoreMeta('orders', [$salesRows, $jobRows, $workRows]),
            'sales_orders' => $salesOrders,
            'job_orders' => $jobOrders,
            'work_orders' => $workOrders,
            'form_links' => $this->collectRuntimeFormLinks($salesOrders, $jobOrders, $workOrders),
        ];

        if ($this->storeCollectionCount($store, ['sales_orders', 'job_orders', 'work_orders']) === 0) {
            throw new RuntimeException('runtime_orders_pg_empty');
        }

        return $store;
    }

    /**
     * Rebuild the governed MES runtime overlay from PostgreSQL mirrors.
     */
    private function loadRuntimeMesRuntimeFromPg(): array
    {
        $toolRows = $this->db->query("SELECT metadata, updated_at FROM tools WHERE COALESCE(metadata->>'shadow_source', '') = 'mes_runtime' ORDER BY updated_at DESC");
        $equipmentRuntimeRows = $this->db->query('SELECT equipment_id, work_center_id, mtconnect_agent_url, opc_ua_endpoint, controller_type, current_e10_state, current_program, current_job_number, current_operator_id, last_heartbeat_at, metadata, updated_at FROM mes_equipment_extended ORDER BY equipment_id');
        $progressRows = $this->db->query('SELECT metadata, updated_at FROM mes_operation_execution ORDER BY updated_at DESC');
        $downtimeRows = $this->db->query('SELECT metadata, start_time FROM mes_downtime_events ORDER BY start_time DESC');
        $maintenanceRows = $this->db->query('SELECT metadata, updated_at FROM maintenance_work_orders ORDER BY updated_at DESC');
        $connectivityEventRows = $this->db->query('SELECT metadata, recorded_at FROM mes_connectivity_events ORDER BY recorded_at DESC');
        $alarmRows = $this->db->query('SELECT metadata, alarm_time FROM mes_machine_alarms ORDER BY alarm_time DESC');
        $receiptRows = $this->db->query('SELECT metadata, updated_at FROM mes_nc_download_receipts ORDER BY updated_at DESC');
        $offsetRows = $this->db->query('SELECT metadata, updated_at FROM mes_tool_preset_offsets ORDER BY updated_at DESC');
        $materialRows = $this->db->query('SELECT metadata, created_at FROM mes_material_consumption ORDER BY created_at DESC');
        $genealogyRows = $this->db->query('SELECT metadata, updated_at FROM mes_part_genealogy ORDER BY updated_at DESC');
        $handoverRows = $this->db->query('SELECT metadata, created_at FROM mes_shift_handover ORDER BY created_at DESC');
        $dppRows = $this->db->query('SELECT metadata, updated_at FROM mes_dpp_passports ORDER BY updated_at DESC');
        $energyRows = $this->db->query('SELECT metadata, updated_at FROM mes_energy_snapshots ORDER BY updated_at DESC');
        $costRows = $this->db->query('SELECT metadata, updated_at FROM mes_cost_tracking ORDER BY updated_at DESC');

        [$connectorFeeds, $machineSignals] = $this->extractEquipmentRuntimeRows($equipmentRuntimeRows);

        $store = [
            '_meta' => $this->buildRuntimeStoreMeta('mes', [
                $toolRows,
                $equipmentRuntimeRows,
                $progressRows,
                $downtimeRows,
                $maintenanceRows,
                $connectivityEventRows,
                $alarmRows,
                $receiptRows,
                $offsetRows,
                $materialRows,
                $genealogyRows,
                $handoverRows,
                $dppRows,
                $energyRows,
                $costRows,
            ]),
            'downtime_events' => $this->extractMetadataRows($downtimeRows),
            'maintenance_requests' => $this->extractMetadataRows($maintenanceRows),
            'progress_reports' => $this->extractMetadataRows($progressRows),
            'tooling_status' => $this->extractMetadataRows($toolRows),
            'connector_feeds' => $connectorFeeds,
            'machine_signals' => $machineSignals,
            'mes_connectivity_events' => $this->extractMetadataRows($connectivityEventRows),
            'machine_alarm_events' => $this->extractMetadataRows($alarmRows),
            'nc_download_receipts' => $this->extractMetadataRows($receiptRows),
            'mes_tool_preset_offsets' => $this->extractMetadataRows($offsetRows),
            'material_consumption' => $this->extractMetadataRows($materialRows),
            'part_genealogy' => $this->extractMetadataRows($genealogyRows),
            'shift_handover' => $this->extractMetadataRows($handoverRows),
            'dpp_passports' => $this->extractMetadataRows($dppRows),
            'energy_snapshots' => $this->extractMetadataRows($energyRows),
            'cost_tracking' => $this->extractMetadataRows($costRows),
        ];

        if ($this->storeCollectionCount($store, ['connector_feeds', 'machine_signals', 'progress_reports', 'tooling_status', 'material_consumption', 'part_genealogy', 'shift_handover', 'dpp_passports', 'energy_snapshots', 'cost_tracking']) === 0) {
            throw new RuntimeException('runtime_mes_pg_empty');
        }

        return $store;
    }

    /**
     * Rebuild the governed Epicor integration runtime overlay from PostgreSQL mirrors.
     */
    private function loadRuntimeEpicorIntegrationFromPg(): array
    {
        $syncRunRows = $this->db->query('SELECT metadata, updated_at FROM mes_erp_sync_runs ORDER BY started_at DESC');
        $reconciliationRows = $this->db->query('SELECT metadata, updated_at FROM mes_erp_reconciliation_exceptions ORDER BY detected_at DESC');
        $outboxRows = $this->db->query('SELECT payload, erp_response, entity_type, entity_id, created_at, sent_at, send_status, error_message, retry_count FROM mes_erp_outbound_queue ORDER BY created_at DESC');

        $syncRuns = $this->extractMetadataRows($syncRunRows);
        $reconciliation = $this->extractMetadataRows($reconciliationRows);
        $outbox = $this->extractEpicorOutboxRows($outboxRows);

        $checkpoints = [];
        foreach ($syncRuns as $row) {
            if (!is_array($row)) {
                continue;
            }
            $checkpointKey = trim((string)($row['checkpoint_key'] ?? ''));
            $checkpointValue = trim((string)($row['checkpoint_value'] ?? ''));
            if ($checkpointKey === '' || $checkpointValue === '') {
                continue;
            }
            $status = strtolower(trim((string)($row['status'] ?? '')));
            if (!in_array($status, ['success', 'ok', 'completed'], true)) {
                continue;
            }
            $candidate = trim((string)($row['finished_at'] ?? $row['updated_at'] ?? $row['started_at'] ?? ''));
            $current = trim((string)($checkpoints[$checkpointKey]['updated_at'] ?? ''));
            if ($current !== '' && $candidate < $current) {
                continue;
            }
            $checkpoints[$checkpointKey] = [
                'checkpoint_key' => $checkpointKey,
                'checkpoint_value' => $checkpointValue,
                'updated_at' => $candidate,
                'sync_run_id' => (string)($row['sync_run_id'] ?? ''),
                'sync_domain' => (string)($row['sync_domain'] ?? ''),
            ];
        }

        $store = [
            '_meta' => $this->buildRuntimeStoreMeta('epicor', [$syncRunRows, $reconciliationRows, $outboxRows]),
            'sync_runs' => $syncRuns,
            'reconciliation_exceptions' => $reconciliation,
            'outbox_events' => $outbox,
            'checkpoints' => array_values($checkpoints),
            'health' => [],
        ];

        if ($this->storeCollectionCount($store, ['sync_runs', 'reconciliation_exceptions', 'outbox_events']) === 0) {
            throw new RuntimeException('runtime_epicor_pg_empty');
        }

        return $store;
    }

    /**
     * Build a consistent _meta block for a mirrored runtime store.
     *
     * @param string $domain Runtime store domain name.
     * @param array<int, array<int, array<string, mixed>>> $rowSets
     */
    private function buildRuntimeStoreMeta(string $domain, array $rowSets): array
    {
        return [
            'version' => 'pg-shadow-v1',
            'updated' => $this->latestTimestampFromRowSets($rowSets) ?: date(DATE_ATOM),
            'source' => 'postgres_primary_pilot',
            'description' => 'Governed runtime ' . $domain . ' rebuilt from PostgreSQL mirror tables.',
        ];
    }

    /**
     * Keep legacy and current field names aligned for master-data consumers.
     */
    private function normalizeRuntimeMasterDataStore(array $store): array
    {
        $parts = array_values(is_array($store['parts'] ?? null) ? $store['parts'] : []);
        $store['parts'] = array_map(static function ($row): array {
            if (!is_array($row)) {
                return [];
            }
            $partDescription = trim((string)($row['part_description'] ?? ''));
            $legacyDescription = trim((string)($row['description'] ?? ''));
            $canonicalDescription = $partDescription !== '' ? $partDescription : $legacyDescription;
            if ($canonicalDescription !== '') {
                $row['part_description'] = $canonicalDescription;
                $row['description'] = $canonicalDescription;
            }
            return $row;
        }, $parts);
        return $store;
    }

    /**
     * Extract decoded metadata rows from result rows.
     *
     * @param array<int, array<string, mixed>> $rows
     * @return array<int, array<string, mixed>>
     */
    private function extractMetadataRows(array $rows, string $column = 'metadata'): array
    {
        $items = [];
        foreach ($rows as $row) {
            $item = $this->decodeJsonArray($row[$column] ?? null);
            if ($item !== []) {
                $items[] = $item;
            }
        }
        return $items;
    }

    /**
     * Build the runtime operator lookup from the governed employee table.
     *
     * Operators are not an editable master-data bucket; they are an operational
     * projection of Admin/HCM employees that can execute or supervise shop-floor
     * work. Legacy metadata rows are still honoured to avoid data loss during
     * migration.
     *
     * @param array<int, array<string, mixed>> $rows
     * @return array<int, array<string, mixed>>
     */
    private function extractEmployeeOperatorRows(array $rows): array
    {
        $items = [];
        foreach ($rows as $row) {
            $meta = $this->decodeJsonArray($row['metadata'] ?? null);
            $role = strtolower(trim((string)($meta['role'] ?? $row['role_code'] ?? '')));
            $title = strtolower(trim((string)($meta['role_label'] ?? $meta['operator_name'] ?? $row['role_label'] ?? $row['employee_name'] ?? '')));
            $legacyOperatorId = trim((string)($meta['operator_id'] ?? ''));
            if ($legacyOperatorId === '' && !$this->isExecutionOperatorRole($role, $title)) {
                continue;
            }

            $employeeId = trim((string)($row['employee_id'] ?? ''));
            $operatorId = $legacyOperatorId !== '' ? $legacyOperatorId : $employeeId;
            if ($operatorId === '') {
                continue;
            }

            $base = [
                'operator_id' => $operatorId,
                'operator_name' => trim((string)($meta['operator_name'] ?? $meta['name'] ?? $row['employee_name'] ?? $operatorId)),
                'role' => $role,
                'role_code' => $role,
                'role_label' => trim((string)($meta['role_label'] ?? $row['role_label'] ?? $role)),
                'department' => strtoupper(trim((string)($meta['department'] ?? $row['dept_code'] ?? ''))),
                'department_code' => strtoupper(trim((string)($meta['department_code'] ?? $row['dept_code'] ?? ''))),
                'user_id' => trim((string)($meta['user_id'] ?? $row['user_id_code'] ?? '')),
                'username' => trim((string)($meta['username'] ?? $row['user_id_code'] ?? '')),
                'status' => ((bool)($row['is_active'] ?? true)) ? 'active' : 'inactive',
                'source_system' => trim((string)($meta['source_system'] ?? 'employees')),
                'authority' => 'employees',
                'editable_in' => 'admin.users_orgchart',
                'qualification_status' => trim((string)($meta['qualification_status'] ?? 'active')),
                'shift' => trim((string)($meta['shift'] ?? $row['shift'] ?? '')),
                'updated_at' => trim((string)($row['updated_at'] ?? $meta['updated_at'] ?? '')),
            ];
            $items[] = array_merge($base, $meta);
        }
        return $items;
    }

    private function isExecutionOperatorRole(string $role, string $title = ''): bool
    {
        $executionRoles = [
            'cnc_operator',
            'setup_technician',
            'deburr_technician',
            'cleaning_packaging_technician',
            'cleaning_packaging_supervisor',
            'qc_inspector',
            'maintenance_technician',
            'shift_leader',
            'cnc_workshop_manager',
        ];
        if (in_array($role, $executionRoles, true)) {
            return true;
        }
        return $title !== '' && (str_contains($title, 'operator') || str_contains($title, 'technician') || str_contains($title, 'inspector'));
    }

    /**
     * Extract mirrored variable-registry rows back into runtime list items.
     *
     * @param array<int, array<string, mixed>> $rows
     * @return array<int, array<string, mixed>>
     */
    private function extractVariableMirrorRows(array $rows, string $keyField, string $labelField, string $labelViField): array
    {
        $items = [];
        foreach ($rows as $row) {
            $item = $this->decodeJsonArray($row['example'] ?? null);
            if ($item === []) {
                $item = [
                    $keyField => (string)($row['key'] ?? ''),
                    $labelField => (string)($row['label'] ?? $row['key'] ?? ''),
                    $labelViField => (string)($row['label_vi'] ?? $row['label'] ?? $row['key'] ?? ''),
                ];
            }
            $items[] = $item;
        }
        return $items;
    }

    /**
     * Rebuild connector feed + machine signal arrays from MES equipment runtime rows.
     *
     * @param array<int, array<string, mixed>> $rows
     * @return array{0: array<int, array<string, mixed>>, 1: array<int, array<string, mixed>>}
     */
    private function extractEquipmentRuntimeRows(array $rows): array
    {
        $feeds = [];
        $signals = [];

        foreach ($rows as $row) {
            $meta = $this->decodeJsonArray($row['metadata'] ?? null);
            $machine = is_array($meta['machine'] ?? null) ? $meta['machine'] : $meta;
            $feed = is_array($meta['connector_feed'] ?? null) ? $meta['connector_feed'] : [];
            $signal = is_array($meta['machine_signal'] ?? null) ? $meta['machine_signal'] : [];

            $machineId = trim((string)($row['equipment_id'] ?? $machine['machine_id'] ?? ''));
            if ($machineId === '') {
                continue;
            }

            if ($feed === []) {
                $connectorType = trim((string)($machine['connector_type'] ?? ($row['mtconnect_agent_url'] ? 'mtconnect' : ($row['opc_ua_endpoint'] ? 'opcua' : 'manual_bridge'))));
                $feed = [
                    'machine_id' => $machineId,
                    'machine_name' => (string)($machine['machine_name'] ?? ''),
                    'work_center_id' => (string)($row['work_center_id'] ?? $machine['work_center_id'] ?? ''),
                    'connector_type' => $connectorType,
                    'connector_name' => (string)($row['controller_type'] ?? $machine['connector_name'] ?? ''),
                    'connector_endpoint' => (string)($row['mtconnect_agent_url'] ?? $row['opc_ua_endpoint'] ?? $machine['connector_endpoint'] ?? ''),
                    'telemetry_mode' => (string)($machine['telemetry_mode'] ?? ($connectorType === 'manual_bridge' ? 'manual' : 'machine')),
                    'heartbeat_sla_seconds' => (int)($machine['heartbeat_sla_seconds'] ?? 120),
                    'last_heartbeat_at' => (string)($row['last_heartbeat_at'] ?? ''),
                    'last_signal_at' => (string)($row['last_heartbeat_at'] ?? ''),
                    'connection_status' => (string)($row['current_e10_state'] ?? ''),
                    'enabled' => true,
                    'updated_at' => (string)($row['updated_at'] ?? ''),
                    'updated_by' => 'postgres-primary',
                ];
            }
            if ($signal === []) {
                $signal = [
                    'machine_id' => $machineId,
                    'machine_name' => (string)($machine['machine_name'] ?? ''),
                    'work_center_id' => (string)($row['work_center_id'] ?? $machine['work_center_id'] ?? ''),
                    'source' => (string)($feed['connector_type'] ?? 'manual_bridge'),
                    'connector_type' => (string)($feed['connector_type'] ?? 'manual_bridge'),
                    'machine_state' => (string)($row['current_e10_state'] ?? ''),
                    'signal_at' => (string)($row['last_heartbeat_at'] ?? ''),
                    'last_heartbeat_at' => (string)($row['last_heartbeat_at'] ?? ''),
                    'wo_number' => (string)($row['current_job_number'] ?? ''),
                    'operator_id' => (string)($row['current_operator_id'] ?? ''),
                    'current_program_id' => (string)($row['current_program'] ?? ''),
                    'updated_at' => (string)($row['updated_at'] ?? ''),
                    'updated_by' => 'postgres-primary',
                ];
            }

            $feeds[] = $feed;
            $signals[] = $signal;
        }

        return [$feeds, $signals];
    }

    /**
     * Collect and de-duplicate order-linked evidence records.
     *
     * @param array<int, array<string, mixed>> $salesOrders
     * @param array<int, array<string, mixed>> $jobOrders
     * @param array<int, array<string, mixed>> $workOrders
     * @return array<int, array<string, mixed>>
     */
    private function collectRuntimeFormLinks(array $salesOrders, array $jobOrders, array $workOrders): array
    {
        $unique = [];
        $lists = [
            'so' => $salesOrders,
            'jo' => $jobOrders,
            'wo' => $workOrders,
        ];

        foreach ($lists as $orderType => $rows) {
            $idKey = $orderType === 'so' ? 'so_number' : ($orderType === 'jo' ? 'jo_number' : 'wo_number');
            foreach ($rows as $row) {
                if (!is_array($row)) {
                    continue;
                }
                $orderId = trim((string)($row[$idKey] ?? ''));
                foreach ((array)($row['linked_forms'] ?? []) as $link) {
                    if (!is_array($link)) {
                        continue;
                    }
                    $normalized = $link;
                    $normalized['order_type'] = $orderType;
                    $normalized['order_id'] = $orderId;
                    $signature = implode('|', [
                        $orderType,
                        $orderId,
                        (string)($normalized['record_id'] ?? ''),
                        (string)($normalized['form_code'] ?? ''),
                        (string)($normalized['allocation_id'] ?? ''),
                    ]);
                    $unique[$signature] = $normalized;
                }
            }
        }

        return array_values($unique);
    }

    /**
     * Decode a JSON/JSONB field that may already be returned as an array.
     */
    private function decodeJsonArray(mixed $value): array
    {
        if (is_array($value)) {
            return $value;
        }
        if (!is_string($value) || trim($value) === '') {
            return [];
        }
        $decoded = json_decode($value, true);
        return is_array($decoded) ? $decoded : [];
    }

    /**
     * Rebuild Epicor outbox rows from PostgreSQL queue mirrors.
     *
     * @param array<int, array<string, mixed>> $rows
     * @return array<int, array<string, mixed>>
     */
    private function extractEpicorOutboxRows(array $rows): array
    {
        $items = [];
        foreach ($rows as $row) {
            $payload = $this->decodeJsonArray($row['payload'] ?? null);
            $erpResponse = $this->decodeJsonArray($row['erp_response'] ?? null);
            $payload['entity_type'] = (string)($row['entity_type'] ?? ($payload['entity_type'] ?? ''));
            $payload['entity_id'] = (string)($row['entity_id'] ?? ($payload['entity_id'] ?? ''));
            $payload['created_at'] = (string)($row['created_at'] ?? ($payload['created_at'] ?? $payload['first_queued_at'] ?? ''));
            $payload['first_queued_at'] = (string)($payload['first_queued_at'] ?? $payload['created_at']);
            $payload['sent_at'] = (string)($row['sent_at'] ?? ($payload['sent_at'] ?? $payload['last_attempt_at'] ?? ''));
            $payload['last_attempt_at'] = (string)($payload['last_attempt_at'] ?? $payload['sent_at']);
            $payload['send_status'] = (string)($row['send_status'] ?? ($payload['send_status'] ?? $payload['publish_status'] ?? ''));
            $payload['publish_status'] = (string)($payload['publish_status'] ?? $payload['send_status']);
            $payload['error_message'] = (string)($row['error_message'] ?? ($payload['error_message'] ?? ''));
            $payload['retry_count'] = (int)($row['retry_count'] ?? ($payload['retry_count'] ?? 0));
            $payload['erp_response'] = $erpResponse;
            if ($payload !== []) {
                $items[] = $payload;
            }
        }
        return $items;
    }

    /**
     * Count items across the named collections in a runtime store.
     *
     * @param array<string, mixed> $store
     * @param array<int, string>   $collections
     */
    private function storeCollectionCount(array $store, array $collections): int
    {
        $count = 0;
        foreach ($collections as $collection) {
            $count += count((array)($store[$collection] ?? []));
        }
        return $count;
    }

    /**
     * Find the latest ISO timestamp across multiple query row sets.
     *
     * @param array<int, array<int, array<string, mixed>>> $rowSets
     */
    private function latestTimestampFromRowSets(array $rowSets): string
    {
        $latest = '';
        foreach ($rowSets as $rows) {
            foreach ($rows as $row) {
                foreach (['updated_at', 'recorded_at', 'event_time', 'alarm_time', 'start_time', 'valid_from', 'measured_at', 'downloaded_at'] as $field) {
                    $value = trim((string)($row[$field] ?? ''));
                    if ($value !== '' && ($latest === '' || strcmp($value, $latest) > 0)) {
                        $latest = $value;
                    }
                }
            }
        }
        return $latest;
    }

    /**
     * Return the config directory path.
     */
    private function confDir(): string
    {
        return $this->dataDir . '/config';
    }

    /**
     * Load custom docs from docs_custom.json.
     *
     * @return array List of document entries.
     */
    private function loadCustomDocs(): array
    {
        $file = $this->confDir() . '/docs_custom.json';
        $data = $this->readJson($file);
        if (isset($data['docs']) && is_array($data['docs'])) {
            return $data['docs'];
        }
        // Support plain array format
        if ($data !== [] && array_is_list($data)) {
            return $data;
        }
        return [];
    }

    /**
     * Save custom docs to docs_custom.json.
     *
     * @param array $docs Document entries.
     */
    private function saveCustomDocs(array $docs): void
    {
        $file = $this->confDir() . '/docs_custom.json';
        $this->writeJson($file, ['docs' => array_values($docs), 'updated_at' => $this->nowIso()]);
    }

    /**
     * Infer document type enum from doc code prefix.
     *
     * @param string $code Document code (e.g. "SOP-606").
     * @return string doc_type_enum value.
     */
    private function inferDocType(string $code): string
    {
        $code = strtoupper($code);
        return match (true) {
            str_starts_with($code, 'SOP-')   => 'SOP',
            str_starts_with($code, 'WI-')    => 'WI',
            str_starts_with($code, 'FRM-')   => 'FRM',
            str_starts_with($code, 'ANNEX-') => 'ANNEX',
            str_starts_with($code, 'POL-')   => 'POL',
            str_starts_with($code, 'QMS-MAN') => 'MAN',
            str_starts_with($code, 'JD-')    => 'JD',
            str_starts_with($code, 'DEPT-')  => 'DEPT',
            default => 'REF',
        };
    }

    /**
     * Apply simple array-based filters to an in-memory dataset.
     *
     * @param array $items   Items to filter.
     * @param array $filters Key-value filter criteria.
     * @return array Filtered items.
     */
    private function applyArrayFilters(array $items, array $filters): array
    {
        if ($filters === []) {
            return $items;
        }

        $search = strtolower(trim((string)($filters['search'] ?? '')));

        return array_values(array_filter($items, function (array $item) use ($filters, $search): bool {
            foreach (['cat', 'status', 'dept', 'dept_code', 'role', 'type'] as $key) {
                if (!empty($filters[$key])) {
                    $itemVal = strtoupper((string)($item[$key] ?? ''));
                    if ($itemVal !== strtoupper($filters[$key])) {
                        return false;
                    }
                }
            }
            if (isset($filters['active'])) {
                $isActive = (bool)($item['active'] ?? true);
                if ($isActive !== (bool)$filters['active']) {
                    return false;
                }
            }
            if ($search !== '') {
                $haystack = strtolower(
                    ($item['title'] ?? '') . ' ' . ($item['code'] ?? '') . ' '
                    . ($item['name'] ?? '') . ' ' . ($item['term'] ?? '') . ' '
                    . ($item['username'] ?? ''),
                );
                if (!str_contains($haystack, $search)) {
                    return false;
                }
            }
            return true;
        }));
    }

    /**
     * ISO 8601 timestamp in UTC.
     */
    private function nowIso(): string
    {
        return gmdate('Y-m-d\TH:i:s\Z');
    }

}

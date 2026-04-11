<?php

declare(strict_types=1);

namespace MOM\Database;

use RuntimeException;

/**
 * One-Time JSON-to-PostgreSQL Migration Importer for HESEM MOM Portal.
 *
 * Reads existing JSON data files and imports them into the corresponding
 * PostgreSQL tables defined in schema.sql. Designed for a single migration
 * run, with:
 * - Dry-run mode (validate without writing)
 * - Progress reporting via callback
 * - Error collection and summary
 * - Idempotent upsert logic (safe to re-run)
 *
 * @package MOM\Database
 * @since   1.0.0
 */
class JsonImporter
{
    private Connection $db;

    /** Absolute path to data directory. */
    private string $dataDir;

    /** Project root (parent of mom). */
    private string $rootDir;

    /** Dry-run flag: when true, validate only without writing. */
    private bool $dryRun;

    /** Collected errors during import. */
    private array $errors = [];

    /** Collected warnings during import. */
    private array $warnings = [];

    /** Import statistics per table. */
    private array $stats = [];

    /** Progress callback: fn(string $message, int $current, int $total). */
    private mixed $progressCallback;

    // -- Construction -----------------------------------------------------------

    /**
     * @param string        $dataDir  Absolute path to data.
     * @param string        $rootDir  Absolute path to project root.
     * @param bool          $dryRun   Validate only, do not write.
     * @param callable|null $progress Progress callback.
     */
    public function __construct(
        string $dataDir,
        string $rootDir,
        bool $dryRun = false,
        ?callable $progress = null,
    ) {
        $this->dataDir = rtrim(str_replace('\\', '/', $dataDir), '/');
        $this->rootDir = rtrim(str_replace('\\', '/', $rootDir), '/');
        $this->dryRun = $dryRun;
        $this->progressCallback = $progress;
        $this->db = Connection::getInstance();
    }

    // -- Public API -------------------------------------------------------------

    /**
     * Run the full import pipeline.
     *
     * @return array Summary report with stats, errors, and warnings.
     */
    public function runAll(): array
    {
        $this->report('Starting JSON to PostgreSQL import' . ($this->dryRun ? ' (DRY RUN)' : ''));

        $steps = [
            'users'             => [$this, 'importUsers'],
            'roles'             => [$this, 'importRoles'],
            'form_schemas'      => [$this, 'importFormSchemas'],
            'form_entries'      => [$this, 'importFormEntries'],
            'documents'         => [$this, 'importDocuments'],
            'glossary'          => [$this, 'importGlossary'],
            'record_counters'   => [$this, 'importRecordCounters'],
        ];

        $total = count($steps);
        $current = 0;

        foreach ($steps as $name => $callable) {
            $current++;
            $this->report("Importing {$name}...", $current, $total);
            try {
                $callable();
            } catch (\Throwable $e) {
                $this->errors[] = "[{$name}] Fatal: " . $e->getMessage();
            }
        }

        $this->report('Import complete.', $total, $total);

        return [
            'dry_run'  => $this->dryRun,
            'stats'    => $this->stats,
            'errors'   => $this->errors,
            'warnings' => $this->warnings,
        ];
    }

    // -- Individual Importers ---------------------------------------------------

    /**
     * Import users.json into the users table.
     */
    public function importUsers(): void
    {
        $file = $this->dataDir . '/config/users.json';
        $store = $this->readJson($file);
        $users = $store['users'] ?? [];

        $imported = 0;
        $skipped = 0;

        foreach ($users as $user) {
            if (!is_array($user)) {
                $skipped++;
                continue;
            }

            $username = strtolower(trim((string)($user['username'] ?? '')));
            if ($username === '') {
                $this->warnings[] = '[users] Skipped entry with empty username';
                $skipped++;
                continue;
            }

            if ($this->dryRun) {
                $imported++;
                continue;
            }

            try {
                $this->db->execute(
                    'INSERT INTO users (employee_id, username, email, full_name, password_hash, dept_code, mfa_secret, mfa_enabled, status, metadata)
                     VALUES (:eid, :user, :email, :name, :pw, :dept, :mfa_secret, :mfa_enabled, :status, :meta::jsonb)
                     ON CONFLICT (username) DO UPDATE SET
                         full_name = EXCLUDED.full_name,
                         email = EXCLUDED.email,
                         dept_code = EXCLUDED.dept_code,
                         status = EXCLUDED.status,
                         metadata = EXCLUDED.metadata,
                         updated_at = now()',
                    [
                        ':eid'         => strtoupper($user['employee_id'] ?? $username),
                        ':user'        => $username,
                        ':email'       => $user['email'] ?? $username . '@hesem.com.vn',
                        ':name'        => $user['name'] ?? $username,
                        ':pw'          => $user['pw_hash'] ?? '',
                        ':dept'        => $this->mapDeptCode($user['dept'] ?? 'QA'),
                        ':mfa_secret'  => $user['mfa']['secret'] ?? null,
                        ':mfa_enabled' => (bool)($user['mfa']['enabled'] ?? false),
                        ':status'      => ($user['active'] ?? true) ? 'active' : 'inactive',
                        ':meta'        => json_encode($this->extractUserMeta($user), JSON_UNESCAPED_UNICODE),
                    ],
                );
                $imported++;
            } catch (\Throwable $e) {
                $this->errors[] = "[users] {$username}: " . $e->getMessage();
                $skipped++;
            }
        }

        $this->stats['users'] = ['imported' => $imported, 'skipped' => $skipped, 'total' => count($users)];
    }

    /**
     * Import role_permissions.json into the roles table.
     */
    public function importRoles(): void
    {
        $file = $this->dataDir . '/config/role_permissions.json';
        $perms = $this->readJson($file);
        if ($perms === []) {
            $this->stats['roles'] = ['imported' => 0, 'skipped' => 0, 'total' => 0];
            return;
        }

        $imported = 0;
        $skipped = 0;
        $total = count($perms);

        foreach ($perms as $roleCode => $permissions) {
            if (!is_string($roleCode) || $roleCode === '') {
                $skipped++;
                continue;
            }

            if ($this->dryRun) {
                $imported++;
                continue;
            }

            try {
                $this->db->execute(
                    'INSERT INTO roles (role_code, role_label, permissions)
                     VALUES (:code, :label, :perms::jsonb)
                     ON CONFLICT (role_code) DO UPDATE SET
                         permissions = EXCLUDED.permissions,
                         updated_at = now()',
                    [
                        ':code'  => $roleCode,
                        ':label' => $this->humanizeRoleCode($roleCode),
                        ':perms' => json_encode(is_array($permissions) ? $permissions : [], JSON_UNESCAPED_UNICODE),
                    ],
                );
                $imported++;
            } catch (\Throwable $e) {
                $this->errors[] = "[roles] {$roleCode}: " . $e->getMessage();
                $skipped++;
            }
        }

        $this->stats['roles'] = ['imported' => $imported, 'skipped' => $skipped, 'total' => $total];
    }

    /**
     * Import form_control_registry.json into form_schemas table.
     */
    public function importFormSchemas(): void
    {
        $file = $this->dataDir . '/config/form_control_registry.json';
        $registry = $this->readJson($file);

        $imported = 0;
        $skipped = 0;

        foreach ($registry as $entry) {
            if (!is_array($entry)) {
                $skipped++;
                continue;
            }

            $code = strtoupper(trim((string)($entry['code'] ?? '')));
            if ($code === '') {
                $this->warnings[] = '[form_schemas] Skipped entry with empty code';
                $skipped++;
                continue;
            }

            if ($this->dryRun) {
                $imported++;
                continue;
            }

            try {
                $this->db->execute(
                    'INSERT INTO form_schemas (form_code, version, title, json_schema, dept_code, status, metadata)
                     VALUES (:code, 1, :title, :schema::jsonb, :dept, :status, :meta::jsonb)
                     ON CONFLICT (form_code, version) DO UPDATE SET
                         title = EXCLUDED.title,
                         json_schema = EXCLUDED.json_schema,
                         metadata = EXCLUDED.metadata',
                    [
                        ':code'   => $code,
                        ':title'  => $entry['title'] ?? $code,
                        ':schema' => json_encode($entry, JSON_UNESCAPED_UNICODE),
                        ':dept'   => $this->mapDeptCode($entry['dept'] ?? 'QA'),
                        ':status' => $this->mapDocStatus($entry['status'] ?? 'approved'),
                        ':meta'   => json_encode([
                            'path'           => $entry['path'] ?? '',
                            'delivery_mode'  => $entry['delivery_mode'] ?? 'download',
                            'control_status' => $entry['control_status'] ?? 'RELEASED',
                        ], JSON_UNESCAPED_UNICODE),
                    ],
                );
                $imported++;
            } catch (\Throwable $e) {
                $this->errors[] = "[form_schemas] {$code}: " . $e->getMessage();
                $skipped++;
            }
        }

        $this->stats['form_schemas'] = ['imported' => $imported, 'skipped' => $skipped, 'total' => count($registry)];
    }

    /**
     * Import online-forms/entries/*.json into form_entries table.
     */
    public function importFormEntries(): void
    {
        $entriesRoot = $this->dataDir . '/online-forms/entries';
        if (!is_dir($entriesRoot)) {
            $this->stats['form_entries'] = ['imported' => 0, 'skipped' => 0, 'total' => 0];
            return;
        }

        $imported = 0;
        $skipped = 0;
        $total = 0;

        $formDirs = @scandir($entriesRoot) ?: [];
        foreach ($formDirs as $formCode) {
            if ($formCode === '.' || $formCode === '..') {
                continue;
            }
            $formDir = $entriesRoot . '/' . $formCode;
            if (!is_dir($formDir)) {
                continue;
            }

            $files = @scandir($formDir) ?: [];
            foreach ($files as $fn) {
                if (!str_ends_with((string)$fn, '.json')) {
                    continue;
                }
                $total++;
                $entryData = $this->readJson($formDir . '/' . $fn);
                if ($entryData === []) {
                    $skipped++;
                    continue;
                }

                if ($this->dryRun) {
                    $imported++;
                    continue;
                }

                $entryId = $entryData['entry_id'] ?? pathinfo($fn, PATHINFO_FILENAME);

                try {
                    $this->db->execute(
                        'INSERT INTO form_entries (entry_id, form_code, data, workflow_state, metadata)
                         VALUES (:id::uuid, :code, :data::jsonb, :state, :meta::jsonb)
                         ON CONFLICT (entry_id) DO UPDATE SET
                             data = EXCLUDED.data,
                             workflow_state = EXCLUDED.workflow_state',
                        [
                            ':id'    => $this->ensureUuid($entryId),
                            ':code'  => strtoupper($formCode),
                            ':data'  => json_encode($entryData, JSON_UNESCAPED_UNICODE),
                            ':state' => $entryData['workflow_state'] ?? 'draft',
                            ':meta'  => json_encode(['source_file' => $fn], JSON_UNESCAPED_UNICODE),
                        ],
                    );
                    $imported++;
                } catch (\Throwable $e) {
                    $this->errors[] = "[form_entries] {$formCode}/{$fn}: " . $e->getMessage();
                    $skipped++;
                }
            }
        }

        $this->stats['form_entries'] = ['imported' => $imported, 'skipped' => $skipped, 'total' => $total];
    }

    /**
     * Import docs_custom.json into the documents table.
     */
    public function importDocuments(): void
    {
        $file = $this->dataDir . '/config/docs_custom.json';
        $data = $this->readJson($file);
        $docs = $data['docs'] ?? (array_is_list($data) ? $data : []);

        $imported = 0;
        $skipped = 0;

        foreach ($docs as $doc) {
            if (!is_array($doc)) {
                $skipped++;
                continue;
            }

            $code = strtoupper(trim((string)($doc['code'] ?? '')));
            if ($code === '') {
                $skipped++;
                continue;
            }

            if ($this->dryRun) {
                $imported++;
                continue;
            }

            try {
                $docType = $this->inferDocType($code);
                $docCat = $doc['cat'] ?? $docType;
                $this->db->execute(
                    'INSERT INTO documents (doc_id, doc_type, doc_category, title, dept_code, status, current_rev, metadata)
                     VALUES (:id, :type, :cat, :title, :dept, :status, :rev, :meta::jsonb)
                     ON CONFLICT (doc_id) DO UPDATE SET
                         title = EXCLUDED.title,
                         status = EXCLUDED.status,
                         current_rev = EXCLUDED.current_rev,
                         metadata = EXCLUDED.metadata,
                         updated_at = now()',
                    [
                        ':id'     => $code,
                        ':type'   => $docType,
                        ':cat'    => $docCat,
                        ':title'  => $doc['title'] ?? $code,
                        ':dept'   => $this->mapDeptCode($doc['dept'] ?? 'QA'),
                        ':status' => $this->mapDocStatus($doc['status'] ?? 'draft'),
                        ':rev'    => $doc['rev'] ?? $doc['revision'] ?? 'V1.0',
                        ':meta'   => json_encode($doc, JSON_UNESCAPED_UNICODE),
                    ],
                );
                $imported++;
            } catch (\Throwable $e) {
                $this->errors[] = "[documents] {$code}: " . $e->getMessage();
                $skipped++;
            }
        }

        $this->stats['documents'] = ['imported' => $imported, 'skipped' => $skipped, 'total' => count($docs)];
    }

    /**
     * Import dict-data.json into the variable_registry table (category = glossary).
     */
    public function importGlossary(): void
    {
        $file = $this->rootDir . '/mom/docs/glossary/dict-data.json';
        $items = $this->readJson($file);

        $imported = 0;
        $skipped = 0;

        foreach ($items as $item) {
            if (!is_array($item)) {
                $skipped++;
                continue;
            }

            $term = trim((string)($item['term'] ?? ''));
            if ($term === '') {
                $skipped++;
                continue;
            }

            if ($this->dryRun) {
                $imported++;
                continue;
            }

            try {
                $key = strtolower(preg_replace('/[^a-z0-9]+/i', '_', $term));
                $this->db->execute(
                    "INSERT INTO variable_registry (category, key, label, data_type, description, enum_values)
                     VALUES ('glossary', :key, :label, 'text', :desc, :meta::jsonb)
                     ON CONFLICT (category, key) DO UPDATE SET
                         label = EXCLUDED.label,
                         description = EXCLUDED.description,
                         enum_values = EXCLUDED.enum_values",
                    [
                        ':key'   => substr($key, 0, 100),
                        ':label' => $term,
                        ':desc'  => $item['meaning'] ?? $item['def'] ?? '',
                        ':meta'  => json_encode($item, JSON_UNESCAPED_UNICODE),
                    ],
                );
                $imported++;
            } catch (\Throwable $e) {
                $this->errors[] = "[glossary] {$term}: " . $e->getMessage();
                $skipped++;
            }
        }

        $this->stats['glossary'] = ['imported' => $imported, 'skipped' => $skipped, 'total' => count($items)];
    }

    /**
     * Import record counter state into the record_counters table.
     */
    public function importRecordCounters(): void
    {
        $file = $this->dataDir . '/config/record_counters.json';
        $counters = $this->readJson($file);

        $imported = 0;
        $skipped = 0;

        foreach ($counters as $key => $value) {
            if (!is_string($key) || !is_numeric($value)) {
                $skipped++;
                continue;
            }

            // Key format: TYPE_YEAR (e.g. NCR_2026)
            $parts = explode('_', $key, 2);
            if (count($parts) !== 2) {
                $this->warnings[] = "[record_counters] Unknown key format: {$key}";
                $skipped++;
                continue;
            }

            [$type, $year] = $parts;

            if ($this->dryRun) {
                $imported++;
                continue;
            }

            try {
                $this->db->execute(
                    'INSERT INTO record_counters (record_type, fiscal_year, last_number)
                     VALUES (:type, :year, :num)
                     ON CONFLICT (record_type, fiscal_year) DO UPDATE SET
                         last_number = GREATEST(record_counters.last_number, EXCLUDED.last_number)',
                    [
                        ':type' => strtoupper($type),
                        ':year' => (int)$year,
                        ':num'  => (int)$value,
                    ],
                );
                $imported++;
            } catch (\Throwable $e) {
                $this->errors[] = "[record_counters] {$key}: " . $e->getMessage();
                $skipped++;
            }
        }

        $this->stats['record_counters'] = ['imported' => $imported, 'skipped' => $skipped, 'total' => count($counters)];
    }

    // -- Helpers ----------------------------------------------------------------

    /**
     * Read a JSON file and return its decoded contents.
     */
    private function readJson(string $filePath): array
    {
        if (!is_file($filePath)) {
            $this->warnings[] = "File not found: {$filePath}";
            return [];
        }
        $raw = @file_get_contents($filePath);
        if ($raw === false) {
            $this->errors[] = "Cannot read file: {$filePath}";
            return [];
        }
        $data = json_decode($raw, true);
        if (!is_array($data)) {
            $this->warnings[] = "Invalid JSON in: {$filePath}";
            return [];
        }
        return $data;
    }

    /**
     * Map a department string to a valid dept_code enum value.
     */
    private function mapDeptCode(string $dept): string
    {
        $dept = strtoupper(trim($dept));
        $valid = ['QA', 'PRO', 'ENG', 'SCM', 'HR', 'EXE', 'SAL', 'WH', 'IT', 'EHS'];
        if (in_array($dept, $valid, true)) {
            return $dept;
        }
        // Common aliases
        $aliases = [
            'QUALITY' => 'QA', 'QC' => 'QA', 'QMS' => 'QA',
            'PRODUCTION' => 'PRO', 'CNC' => 'PRO', 'MFG' => 'PRO',
            'ENGINEERING' => 'ENG', 'DESIGN' => 'ENG',
            'SUPPLY' => 'SCM', 'PURCHASING' => 'SCM', 'PROCUREMENT' => 'SCM', 'WAREHOUSE' => 'WH',
            'FINANCE' => 'EXE', 'FIN' => 'EXE', 'ADMIN' => 'EXE', 'BOD' => 'EXE',
            'SALES' => 'SAL', 'HSE' => 'EHS',
        ];
        return $aliases[$dept] ?? 'QA';
    }

    /**
     * Map a document status string to a valid doc_status enum value.
     */
    private function mapDocStatus(string $status): string
    {
        $status = strtolower(trim($status));
        $valid = ['draft', 'review', 'approved', 'superseded', 'obsolete'];
        if (in_array($status, $valid, true)) {
            return $status;
        }
        $map = [
            'released' => 'approved', 'current' => 'approved', 'active' => 'approved',
            'in_review' => 'review', 'pending' => 'review', 'pending_approval' => 'review',
            'initial_release' => 'approved',
        ];
        return $map[$status] ?? 'draft';
    }

    /**
     * Infer doc_type_enum from document code prefix.
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
     * Convert a role_code like "qa_manager" to "QA Manager".
     */
    private function humanizeRoleCode(string $code): string
    {
        return ucwords(str_replace('_', ' ', $code));
    }

    /**
     * Extract extra user metadata for the JSONB metadata column.
     */
    private function extractUserMeta(array $user): array
    {
        $meta = [];
        $extraKeys = ['title', 'cccd', 'phone', 'personal_email', 'role', 'dept'];
        foreach ($extraKeys as $key) {
            if (isset($user[$key]) && $user[$key] !== '') {
                $meta[$key] = $user[$key];
            }
        }
        return $meta;
    }

    /**
     * Ensure a string is a valid UUID; generate one if not.
     */
    private function ensureUuid(string $value): string
    {
        if (preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $value)) {
            return $value;
        }
        // Generate deterministic UUID from the value
        $hash = md5($value);
        return sprintf(
            '%s-%s-%s-%s-%s',
            substr($hash, 0, 8),
            substr($hash, 8, 4),
            '4' . substr($hash, 13, 3),
            dechex(8 | (hexdec(substr($hash, 16, 1)) & 3)) . substr($hash, 17, 3),
            substr($hash, 20, 12),
        );
    }

    /**
     * Emit a progress report.
     */
    private function report(string $message, int $current = 0, int $total = 0): void
    {
        if ($this->progressCallback !== null) {
            ($this->progressCallback)($message, $current, $total);
        }
    }

    /**
     * Get the accumulated errors.
     *
     * @return string[]
     */
    public function getErrors(): array
    {
        return $this->errors;
    }

    /**
     * Get the accumulated warnings.
     *
     * @return string[]
     */
    public function getWarnings(): array
    {
        return $this->warnings;
    }

    /**
     * Get import statistics.
     *
     * @return array<string, array{imported: int, skipped: int, total: int}>
     */
    public function getStats(): array
    {
        return $this->stats;
    }
}

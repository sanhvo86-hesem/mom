<?php

declare(strict_types=1);

namespace MOM\Database;

/**
 * Database Health Check for HESEM MOM Portal.
 *
 * Provides a comprehensive diagnostic of the PostgreSQL database state,
 * including connection health, table existence, row counts, migration
 * status, and JSON-vs-PostgreSQL data comparison.
 *
 * Returns a structured JSON-serialisable status report suitable for
 * admin dashboards and monitoring endpoints.
 *
 * @package MOM\Database
 * @since   1.0.0
 */
class HealthCheck
{
    private Connection $db;

    /** Path to data directory. */
    private string $dataDir;

    /** Project root. */
    private string $rootDir;

    /** Expected tables in the schema (core subset). */
    private const EXPECTED_TABLES = [
        'departments',
        'roles',
        'users',
        'user_roles',
        'sessions',
        'audit_events',
        'documents',
        'document_versions',
        'form_schemas',
        'form_entries',
        'form_attachments',
        'records',
        'record_counters',
        'record_links',
        'items',
        'variable_registry',
        'naming_patterns',
        'notifications',
        'kpi_definitions',
        'kpi_snapshots',
    ];

    // ── Construction ────────────────────────────────────────────────────────

    /**
     * @param string $dataDir Absolute path to data.
     * @param string $rootDir Absolute path to project root.
     */
    public function __construct(string $dataDir, string $rootDir)
    {
        $this->dataDir = rtrim(str_replace('\\', '/', $dataDir), '/');
        $this->rootDir = rtrim(str_replace('\\', '/', $rootDir), '/');
        $this->db = Connection::getInstance();
    }

    // ── Public API ──────────────────────────────────────────────────────────

    /**
     * Run all health checks and return a structured report.
     *
     * @return array Health check report.
     */
    public function run(): array
    {
        $start = microtime(true);

        $report = [
            'status'       => 'unknown',
            'timestamp'    => gmdate('Y-m-d\TH:i:s\Z'),
            'checks'       => [],
            'duration_ms'  => 0,
        ];

        // 1. Connection test
        $report['checks']['connection'] = $this->checkConnection();

        // Only run table checks if connection succeeded
        if ($report['checks']['connection']['ok']) {
            // 2. Table existence
            $report['checks']['tables'] = $this->checkTables();

            // 3. Row counts
            $report['checks']['row_counts'] = $this->checkRowCounts();

            // 4. Migration status
            $report['checks']['migration'] = $this->checkMigrationStatus();

            // 5. Data comparison
            $report['checks']['data_comparison'] = $this->checkDataComparison();

            // 6. Database server info
            $report['checks']['server_info'] = $this->checkServerInfo();
        }

        // Determine overall status
        $allOk = true;
        $hasWarning = false;
        foreach ($report['checks'] as $check) {
            if (!($check['ok'] ?? false)) {
                $allOk = false;
            }
            if (($check['warning'] ?? false)) {
                $hasWarning = true;
            }
        }

        $report['status'] = $allOk ? ($hasWarning ? 'degraded' : 'healthy') : 'unhealthy';
        $report['duration_ms'] = round((microtime(true) - $start) * 1000, 2);

        return $report;
    }

    // -- Individual Checks ------------------------------------------------------

    /**
     * Test database connectivity.
     *
     * @return array Check result.
     */
    private function checkConnection(): array
    {
        try {
            $connected = $this->db->isConnected();
            if (!$connected) {
                // Force connection attempt
                $this->db->getPdo();
                $connected = true;
            }
            $latencyStart = microtime(true);
            $this->db->queryScalar('SELECT 1');
            $latencyMs = round((microtime(true) - $latencyStart) * 1000, 2);

            return [
                'ok'         => true,
                'message'    => 'Connected to PostgreSQL',
                'latency_ms' => $latencyMs,
            ];
        } catch (\Throwable $e) {
            return [
                'ok'      => false,
                'message' => 'Connection failed: ' . $e->getMessage(),
            ];
        }
    }

    /**
     * Verify that all expected tables exist.
     *
     * @return array Check result with table details.
     */
    private function checkTables(): array
    {
        try {
            $rows = $this->db->query(
                "SELECT table_name FROM information_schema.tables
                 WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
                 ORDER BY table_name",
            );
            $existing = array_column($rows, 'table_name');

            $missing = [];
            $found = [];
            foreach (self::EXPECTED_TABLES as $table) {
                if (in_array($table, $existing, true)) {
                    $found[] = $table;
                } else {
                    $missing[] = $table;
                }
            }

            $extra = array_values(array_diff($existing, self::EXPECTED_TABLES));

            return [
                'ok'            => $missing === [],
                'warning'       => $missing !== [],
                'expected'      => count(self::EXPECTED_TABLES),
                'found'         => count($found),
                'missing'       => $missing,
                'extra_tables'  => count($extra),
                'total_in_db'   => count($existing),
            ];
        } catch (\Throwable $e) {
            return [
                'ok'      => false,
                'message' => 'Table check failed: ' . $e->getMessage(),
            ];
        }
    }

    /**
     * Get row counts for core tables.
     *
     * @return array Check result with row counts.
     */
    private function checkRowCounts(): array
    {
        $counts = [];
        $totalRows = 0;

        $tablesToCount = [
            'users', 'roles', 'documents', 'document_versions',
            'form_schemas', 'form_entries', 'records', 'record_counters',
            'audit_events', 'variable_registry', 'kpi_snapshots',
        ];

        foreach ($tablesToCount as $table) {
            try {
                $count = (int)$this->db->queryScalar("SELECT COUNT(*) FROM {$table}");
                $counts[$table] = $count;
                $totalRows += $count;
            } catch (\Throwable) {
                $counts[$table] = -1; // Table may not exist
            }
        }

        return [
            'ok'         => true,
            'total_rows' => $totalRows,
            'tables'     => $counts,
        ];
    }

    /**
     * Check migration status by comparing JSON source counts vs PostgreSQL.
     *
     * @return array Migration status report.
     */
    private function checkMigrationStatus(): array
    {
        $jsonCounts = $this->countJsonSources();
        $pgCounts = [];

        $mapping = [
            'users'         => 'users',
            'roles'         => 'roles',
            'documents'     => 'documents',
            'form_schemas'  => 'form_schemas',
            'form_entries'  => 'form_entries',
            'glossary'      => 'variable_registry',
        ];

        foreach ($mapping as $source => $table) {
            try {
                $where = $source === 'glossary' ? " WHERE category = 'glossary'" : '';
                $pgCounts[$source] = (int)$this->db->queryScalar("SELECT COUNT(*) FROM {$table}{$where}");
            } catch (\Throwable) {
                $pgCounts[$source] = 0;
            }
        }

        $synced = true;
        $details = [];
        foreach ($jsonCounts as $source => $jsonCount) {
            $pgCount = $pgCounts[$source] ?? 0;
            $isSynced = $pgCount >= $jsonCount;
            if (!$isSynced) {
                $synced = false;
            }
            $details[$source] = [
                'json'   => $jsonCount,
                'pg'     => $pgCount,
                'synced' => $isSynced,
                'delta'  => $pgCount - $jsonCount,
            ];
        }

        return [
            'ok'      => $synced,
            'warning' => !$synced,
            'message' => $synced ? 'All data migrated' : 'Migration incomplete',
            'details' => $details,
        ];
    }

    /**
     * Detailed data comparison: spot-check key records.
     *
     * @return array Comparison result.
     */
    private function checkDataComparison(): array
    {
        $issues = [];

        // Check a sample user
        $usersFile = $this->dataDir . '/config/users.json';
        if (is_file($usersFile)) {
            $store = $this->readJson($usersFile);
            $jsonUsers = $store['users'] ?? [];
            if ($jsonUsers !== []) {
                $sampleUser = $jsonUsers[0];
                $username = strtolower((string)($sampleUser['username'] ?? ''));
                if ($username !== '') {
                    try {
                        $pgUser = $this->db->queryOne(
                            'SELECT username, full_name FROM users WHERE username = :u',
                            [':u' => $username],
                        );
                        if (!$pgUser) {
                            $issues[] = "User '{$username}' exists in JSON but not in PostgreSQL";
                        }
                    } catch (\Throwable) {
                        // Table may not exist
                    }
                }
            }
        }

        // Check a sample document
        $docsFile = $this->dataDir . '/config/docs_custom.json';
        if (is_file($docsFile)) {
            $data = $this->readJson($docsFile);
            $docs = $data['docs'] ?? (array_is_list($data) ? $data : []);
            if ($docs !== []) {
                $sampleDoc = $docs[0];
                $code = strtoupper(trim((string)($sampleDoc['code'] ?? '')));
                if ($code !== '') {
                    try {
                        $pgDoc = $this->db->queryOne(
                            'SELECT doc_id FROM documents WHERE doc_id = :id',
                            [':id' => $code],
                        );
                        if (!$pgDoc) {
                            $issues[] = "Document '{$code}' exists in JSON but not in PostgreSQL";
                        }
                    } catch (\Throwable) {
                        // Table may not exist
                    }
                }
            }
        }

        return [
            'ok'     => $issues === [],
            'issues' => $issues,
        ];
    }

    /**
     * Get PostgreSQL server information.
     *
     * @return array Server info.
     */
    private function checkServerInfo(): array
    {
        try {
            $version = (string)$this->db->queryScalar('SELECT version()');
            $dbSize = (string)$this->db->queryScalar(
                "SELECT pg_size_pretty(pg_database_size(current_database()))",
            );
            $uptime = (string)$this->db->queryScalar(
                "SELECT now() - pg_postmaster_start_time()",
            );
            $currentDb = (string)$this->db->queryScalar('SELECT current_database()');
            $currentUser = (string)$this->db->queryScalar('SELECT current_user');

            return [
                'ok'           => true,
                'version'      => $version,
                'database'     => $currentDb,
                'user'         => $currentUser,
                'database_size' => $dbSize,
                'uptime'       => $uptime,
            ];
        } catch (\Throwable $e) {
            return [
                'ok'      => false,
                'message' => 'Server info unavailable: ' . $e->getMessage(),
            ];
        }
    }

    // ── Private Helpers ─────────────────────────────────────────────────────

    /**
     * Count records in JSON source files.
     *
     * @return array<string, int> Source name to count.
     */
    private function countJsonSources(): array
    {
        $counts = [];

        // Users
        $usersFile = $this->dataDir . '/config/users.json';
        $store = $this->readJson($usersFile);
        $counts['users'] = count($store['users'] ?? []);

        // Roles
        $rolesFile = $this->dataDir . '/config/role_permissions.json';
        $perms = $this->readJson($rolesFile);
        $counts['roles'] = count($perms);

        // Documents
        $docsFile = $this->dataDir . '/config/docs_custom.json';
        $data = $this->readJson($docsFile);
        $docs = $data['docs'] ?? (array_is_list($data) ? $data : []);
        $counts['documents'] = count($docs);

        // Form schemas
        $formsFile = $this->dataDir . '/config/form_control_registry.json';
        $registry = $this->readJson($formsFile);
        $counts['form_schemas'] = count($registry);

        // Form entries
        $entriesRoot = $this->dataDir . '/online-forms/entries';
        $entryCount = 0;
        if (is_dir($entriesRoot)) {
            foreach ((array)@scandir($entriesRoot) as $dir) {
                if ($dir === '.' || $dir === '..') {
                    continue;
                }
                $subDir = $entriesRoot . '/' . $dir;
                if (!is_dir($subDir)) {
                    continue;
                }
                foreach ((array)@scandir($subDir) as $fn) {
                    if (str_ends_with((string)$fn, '.json')) {
                        $entryCount++;
                    }
                }
            }
        }
        $counts['form_entries'] = $entryCount;

        // Glossary
        $dictFile = $this->rootDir . '/mom/docs/glossary/dict-data.json';
        $dictItems = $this->readJson($dictFile);
        $counts['glossary'] = count($dictItems);

        return $counts;
    }

    /**
     * Read and decode a JSON file.
     */
    private function readJson(string $path): array
    {
        if (!is_file($path)) {
            return [];
        }
        $raw = @file_get_contents($path);
        if ($raw === false) {
            return [];
        }
        $data = json_decode($raw, true);
        return is_array($data) ? $data : [];
    }
}

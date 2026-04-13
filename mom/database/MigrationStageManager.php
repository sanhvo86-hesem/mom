<?php

declare(strict_types=1);

namespace MOM\Database;

/**
 * MigrationStageManager - Operational tooling for the 4-stage JSON→PostgreSQL migration.
 *
 * Provides a clean API to:
 *   - Check current migration stage and readiness for the next stage
 *   - Run pre-flight checks before stage transitions
 *   - Validate data parity between JSON and PostgreSQL
 *   - Generate stage transition reports
 *   - Provide runbook guidance for each transition
 *
 * Stages: JSON_ONLY → SHADOW_WRITE → POSTGRES_PRIMARY → POSTGRES_ONLY
 *
 * @package MOM\Database
 * @since   2.1.0
 */
final class MigrationStageManager
{
    private DataLayer $dataLayer;
    private string $dataDir;
    private string $rootDir;

    /** Minimum row counts expected after shadow sync */
    private const MIN_EXPECTED_TABLES = [
        'departments' => 0,
        'users'       => 1,
        'roles'       => 0,
        'items'       => 0,
    ];

    /** JSON data stores and their PostgreSQL table mappings */
    private const DATA_STORE_MAP = [
        'master-data' => [
            'json_path'  => '/master-data/master-data.json',
            'pg_tables'  => ['customers', 'vendors', 'items', 'work_centers', 'equipment', 'tools_inventory'],
            'sync_method' => 'syncMasterDataStore',
        ],
        'orders' => [
            'json_path'  => '/orders/orders.json',
            'pg_tables'  => ['sales_orders', 'job_orders', 'work_orders'],
            'sync_method' => 'syncOrdersStore',
        ],
        'users' => [
            'json_path'  => '/config/users.json',
            'pg_tables'  => ['users'],
            'sync_method' => null, // Handled by AuthUserShadowSyncService
        ],
        'mes-runtime' => [
            'json_path'  => '/mes/mes-runtime.json',
            'pg_tables'  => ['machine_alarms', 'downtime_events'],
            'sync_method' => 'syncMesRuntimeStore',
        ],
    ];

    public function __construct(string $dataDir, string $rootDir, ?DataLayer $dataLayer = null)
    {
        $this->dataDir = rtrim($dataDir, '/');
        $this->rootDir = rtrim($rootDir, '/');
        $this->dataLayer = $dataLayer ?? new DataLayer($this->dataDir, $this->rootDir);
    }

    // ── Stage Assessment ────────────────────────────────────────────────────

    /**
     * Get the current migration stage as a human-readable report.
     */
    public function getCurrentStage(): array
    {
        $mode = $this->dataLayer->getMode();
        $summary = $this->dataLayer->getModeSummary();

        return [
            'current_stage' => $mode,
            'stage_label'   => $this->stageLabel($mode),
            'next_stage'    => $this->nextStage($mode),
            'next_label'    => $this->nextStage($mode) ? $this->stageLabel($this->nextStage($mode)) : 'N/A (final stage)',
            'postgres_configured' => ($summary['postgres_reachable'] ?? false) || ($summary['uses_postgres'] ?? false),
            'postgres_reachable'  => $summary['postgres_reachable'] ?? false,
            'database_name'       => $summary['database_name'] ?? 'N/A',
            'summary' => $summary,
        ];
    }

    /**
     * Run pre-flight checks for transitioning to the next stage.
     *
     * @return array{ready: bool, checks: list<array{name: string, status: string, message: string}>}
     */
    public function preflightCheck(?string $targetStage = null): array
    {
        $current = $this->dataLayer->getMode();
        $target = $targetStage ?? $this->nextStage($current);

        if ($target === null) {
            return [
                'ready'  => false,
                'target' => null,
                'checks' => [['name' => 'stage', 'status' => 'skip', 'message' => 'Already at final stage (POSTGRES_ONLY)']],
            ];
        }

        $checks = [];

        // Check 1: PostgreSQL connectivity
        $checks[] = $this->checkPostgresConnection();

        // Check 2: Schema migrations applied
        $checks[] = $this->checkMigrationsApplied();

        // Check 3: Core tables exist
        $checks[] = $this->checkCoreTables();

        // Stage-specific checks
        switch ($target) {
            case DataLayer::MODE_SHADOW_WRITE:
                $checks[] = $this->checkJsonDataExists();
                break;

            case DataLayer::MODE_POSTGRES_PRIMARY:
                $checks[] = $this->checkDataParity();
                $checks[] = $this->checkShadowWriteDuration();
                break;

            case DataLayer::MODE_POSTGRES_ONLY:
                $checks[] = $this->checkDataParity();
                $checks[] = $this->checkNoRecentFallbacks();
                $checks[] = $this->checkPostgresPrimaryDuration();
                break;
        }

        $allPassed = true;
        foreach ($checks as $check) {
            if ($check['status'] === 'fail') {
                $allPassed = false;
                break;
            }
        }

        return [
            'ready'   => $allPassed,
            'current' => $current,
            'target'  => $target,
            'checks'  => $checks,
            'env_vars' => $this->envVarsForStage($target),
            'runbook' => $this->runbookForTransition($current, $target),
        ];
    }

    // ── Data Parity ─────────────────────────────────────────────────────────

    /**
     * Compare JSON and PostgreSQL data stores and report discrepancies.
     *
     * @return array{parity: bool, stores: array<string, array>}
     */
    public function checkDataParityReport(): array
    {
        $stores = [];
        $allParity = true;

        foreach (self::DATA_STORE_MAP as $storeName => $config) {
            $jsonPath = $this->dataDir . $config['json_path'];
            $jsonExists = is_file($jsonPath);
            $jsonCount = 0;

            if ($jsonExists) {
                $raw = @file_get_contents($jsonPath);
                if ($raw !== false) {
                    $data = json_decode($raw, true);
                    if (is_array($data)) {
                        $jsonCount = $this->countJsonRecords($data);
                    }
                }
            }

            $pgCounts = [];
            $pgTotal = 0;
            $pgError = null;

            $conn = $this->dataLayer->getConnection();
            if ($conn) {
                foreach ($config['pg_tables'] as $table) {
                    try {
                        $count = $conn->queryScalar("SELECT COUNT(*) FROM {$table}");
                        $pgCounts[$table] = (int)$count;
                        $pgTotal += (int)$count;
                    } catch (\Throwable $e) {
                        $pgCounts[$table] = 'error: ' . $e->getMessage();
                        $pgError = $e->getMessage();
                    }
                }
            }

            $hasParity = ($pgError === null) && ($pgTotal > 0 || $jsonCount === 0);
            if (!$hasParity) {
                $allParity = false;
            }

            $stores[$storeName] = [
                'json_exists' => $jsonExists,
                'json_records' => $jsonCount,
                'pg_counts'    => $pgCounts,
                'pg_total'     => $pgTotal,
                'pg_error'     => $pgError,
                'parity'       => $hasParity,
            ];
        }

        return [
            'parity' => $allParity,
            'stores' => $stores,
            'checked_at' => gmdate('Y-m-d\TH:i:s\Z'),
        ];
    }

    /**
     * Run a shadow sync backfill for all JSON data stores.
     *
     * @return array{synced: list<string>, errors: array<string, string>}
     */
    public function runShadowSyncBackfill(): array
    {
        $synced = [];
        $errors = [];

        $conn = $this->dataLayer->getConnection();
        if (!$conn) {
            return ['synced' => [], 'errors' => ['connection' => 'No PostgreSQL connection available']];
        }

        // Master data
        try {
            $jsonPath = $this->dataDir . '/master-data/master-data.json';
            if (is_file($jsonPath)) {
                $store = $this->loadJson($jsonPath);
                if ($store) {
                    $this->dataLayer->syncMasterDataStore($store);
                    $synced[] = 'master-data';
                }
            }
        } catch (\Throwable $e) {
            $errors['master-data'] = $e->getMessage();
        }

        // Orders
        try {
            $jsonPath = $this->dataDir . '/orders/orders.json';
            if (is_file($jsonPath)) {
                $store = $this->loadJson($jsonPath);
                if ($store) {
                    $this->dataLayer->syncOrdersStore($store);
                    $synced[] = 'orders';
                }
            }
        } catch (\Throwable $e) {
            $errors['orders'] = $e->getMessage();
        }

        // MES runtime
        try {
            $jsonPath = $this->dataDir . '/mes/mes-runtime.json';
            $ordersPath = $this->dataDir . '/orders/orders.json';
            $masterPath = $this->dataDir . '/master-data/master-data.json';
            if (is_file($jsonPath)) {
                $mesStore = $this->loadJson($jsonPath);
                $ordersStore = is_file($ordersPath) ? ($this->loadJson($ordersPath) ?? []) : [];
                $masterStore = is_file($masterPath) ? ($this->loadJson($masterPath) ?? []) : [];
                if ($mesStore) {
                    $this->dataLayer->syncMesRuntimeStore($mesStore, $ordersStore, $masterStore);
                    $synced[] = 'mes-runtime';
                }
            }
        } catch (\Throwable $e) {
            $errors['mes-runtime'] = $e->getMessage();
        }

        return [
            'synced' => $synced,
            'errors' => $errors,
            'completed_at' => gmdate('Y-m-d\TH:i:s\Z'),
        ];
    }

    // ── Environment Guidance ────────────────────────────────────────────────

    /**
     * Get the environment variables needed for a given stage.
     */
    public function envVarsForStage(string $stage): array
    {
        return match ($stage) {
            DataLayer::MODE_JSON_ONLY => [
                'USE_POSTGRES'  => 'false',
                'SHADOW_WRITE'  => 'false',
                'JSON_FALLBACK' => 'false',
            ],
            DataLayer::MODE_SHADOW_WRITE => [
                'USE_POSTGRES'  => 'true',
                'SHADOW_WRITE'  => 'true',
                'JSON_FALLBACK' => 'false',
                'DB_LOG_QUERIES' => 'true',
            ],
            DataLayer::MODE_POSTGRES_PRIMARY => [
                'USE_POSTGRES'  => 'true',
                'SHADOW_WRITE'  => 'false',
                'JSON_FALLBACK' => 'true',
                'DB_READ_RETRY_COUNT' => '3',
                'DB_READ_RETRY_DELAY_MS' => '150',
            ],
            DataLayer::MODE_POSTGRES_ONLY => [
                'USE_POSTGRES'  => 'true',
                'SHADOW_WRITE'  => 'false',
                'JSON_FALLBACK' => 'false',
            ],
            default => [],
        };
    }

    /**
     * Get runbook steps for a stage transition.
     */
    public function runbookForTransition(string $from, string $to): array
    {
        $steps = match ($to) {
            DataLayer::MODE_SHADOW_WRITE => [
                '1. Ensure PostgreSQL is running and accessible',
                '2. Run: php database/migrate.php --status  (verify all migrations applied)',
                '3. Run: php database/migrate.php  (apply any pending migrations)',
                '4. Set environment: USE_POSTGRES=true SHADOW_WRITE=true',
                '5. Restart PHP-FPM: sudo systemctl restart php-fpm',
                '6. Run: php scripts/migration-cli.php backfill  (sync existing JSON data)',
                '7. Monitor error logs for shadow write failures',
                '8. Run for 2-4 weeks before progressing to POSTGRES_PRIMARY',
            ],
            DataLayer::MODE_POSTGRES_PRIMARY => [
                '1. Run: php scripts/migration-cli.php preflight  (verify all checks pass)',
                '2. Run: php scripts/migration-cli.php parity  (verify data parity)',
                '3. Set environment: USE_POSTGRES=true SHADOW_WRITE=false JSON_FALLBACK=true',
                '4. Restart PHP-FPM: sudo systemctl restart php-fpm',
                '5. Monitor fallback events in logs (grep "json_fallback")',
                '6. If fallbacks spike, roll back to SHADOW_WRITE',
                '7. Run POSTGRES_PRIMARY for 2-4 weeks with zero fallbacks before proceeding',
            ],
            DataLayer::MODE_POSTGRES_ONLY => [
                '1. Run: php scripts/migration-cli.php preflight  (verify all checks pass)',
                '2. Confirm zero fallback events in the last 2 weeks',
                '3. Create a JSON data backup: tar czf json-backup-$(date +%Y%m%d).tar.gz data/',
                '4. Set environment: USE_POSTGRES=true SHADOW_WRITE=false JSON_FALLBACK=false',
                '5. Restart PHP-FPM: sudo systemctl restart php-fpm',
                '6. Monitor for errors in first 24 hours',
                '7. JSON files can be archived/deleted after 30 days of stable operation',
            ],
            default => ['No transition steps available for this target stage.'],
        };

        return [
            'from'  => $this->stageLabel($from),
            'to'    => $this->stageLabel($to),
            'steps' => $steps,
        ];
    }

    // ── Individual Checks ───────────────────────────────────────────────────

    private function checkPostgresConnection(): array
    {
        try {
            $conn = Connection::getInstance($this->dataLayer->getDatabaseConfig());
            $version = $conn->queryScalar('SELECT version()');
            return [
                'name'    => 'PostgreSQL Connection',
                'status'  => 'pass',
                'message' => 'Connected. ' . substr((string)$version, 0, 60),
            ];
        } catch (\Throwable $e) {
            return [
                'name'    => 'PostgreSQL Connection',
                'status'  => 'fail',
                'message' => 'Cannot connect: ' . $e->getMessage(),
            ];
        }
    }

    private function checkMigrationsApplied(): array
    {
        try {
            $conn = Connection::getInstance();
            $pending = $conn->queryScalar(
                "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'schema_migrations'"
            );

            if (!(int)$pending) {
                return [
                    'name'    => 'Schema Migrations',
                    'status'  => 'fail',
                    'message' => 'schema_migrations table not found. Run: php database/migrate.php',
                ];
            }

            $applied = (int)$conn->queryScalar("SELECT COUNT(*) FROM schema_migrations");
            $migrationDir = $this->rootDir . '/mom/database/migrations';
            if (!is_dir($migrationDir)) {
                $migrationDir = dirname(__DIR__) . '/database/migrations';
            }

            $totalFiles = 0;
            if (is_dir($migrationDir)) {
                $files = glob($migrationDir . '/*.sql');
                $totalFiles = $files ? count($files) : 0;
            }

            if ($totalFiles > 0 && $applied < $totalFiles) {
                return [
                    'name'    => 'Schema Migrations',
                    'status'  => 'warn',
                    'message' => "{$applied}/{$totalFiles} migrations applied. Run: php database/migrate.php",
                ];
            }

            return [
                'name'    => 'Schema Migrations',
                'status'  => 'pass',
                'message' => "{$applied} migrations applied" . ($totalFiles > 0 ? " of {$totalFiles}" : ''),
            ];
        } catch (\Throwable $e) {
            return [
                'name'    => 'Schema Migrations',
                'status'  => 'fail',
                'message' => 'Cannot check migrations: ' . $e->getMessage(),
            ];
        }
    }

    private function checkCoreTables(): array
    {
        try {
            $conn = Connection::getInstance();
            $missing = [];

            foreach (self::MIN_EXPECTED_TABLES as $table => $minRows) {
                $exists = (int)$conn->queryScalar(
                    "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = :t",
                    ['t' => $table]
                );
                if (!$exists) {
                    $missing[] = $table;
                }
            }

            if (!empty($missing)) {
                return [
                    'name'    => 'Core Tables',
                    'status'  => 'fail',
                    'message' => 'Missing tables: ' . implode(', ', $missing),
                ];
            }

            return [
                'name'    => 'Core Tables',
                'status'  => 'pass',
                'message' => 'All ' . count(self::MIN_EXPECTED_TABLES) . ' core tables exist',
            ];
        } catch (\Throwable $e) {
            return [
                'name'    => 'Core Tables',
                'status'  => 'fail',
                'message' => 'Cannot check tables: ' . $e->getMessage(),
            ];
        }
    }

    private function checkJsonDataExists(): array
    {
        $missing = [];
        foreach (self::DATA_STORE_MAP as $name => $config) {
            $path = $this->dataDir . $config['json_path'];
            if (!is_file($path)) {
                $missing[] = $name;
            }
        }

        if (!empty($missing)) {
            return [
                'name'    => 'JSON Data Stores',
                'status'  => 'warn',
                'message' => 'Missing JSON stores (will be empty in PG): ' . implode(', ', $missing),
            ];
        }

        return [
            'name'    => 'JSON Data Stores',
            'status'  => 'pass',
            'message' => 'All ' . count(self::DATA_STORE_MAP) . ' JSON stores found',
        ];
    }

    private function checkDataParity(): array
    {
        try {
            $report = $this->checkDataParityReport();
            if ($report['parity']) {
                return [
                    'name'    => 'Data Parity (JSON vs PG)',
                    'status'  => 'pass',
                    'message' => 'Data parity OK across all stores',
                ];
            }

            $issues = [];
            foreach ($report['stores'] as $name => $store) {
                if (!$store['parity']) {
                    $issues[] = "{$name}: JSON={$store['json_records']} PG={$store['pg_total']}";
                }
            }

            return [
                'name'    => 'Data Parity (JSON vs PG)',
                'status'  => 'warn',
                'message' => 'Parity issues: ' . implode('; ', $issues),
            ];
        } catch (\Throwable $e) {
            return [
                'name'    => 'Data Parity (JSON vs PG)',
                'status'  => 'fail',
                'message' => 'Cannot check parity: ' . $e->getMessage(),
            ];
        }
    }

    private function checkShadowWriteDuration(): array
    {
        // Check if shadow write has been running long enough (look for sync logs)
        $logFile = $this->dataDir . '/db_queries.log';
        if (!is_file($logFile)) {
            return [
                'name'    => 'Shadow Write Duration',
                'status'  => 'warn',
                'message' => 'No query log found. Recommend running SHADOW_WRITE for 2+ weeks before proceeding',
            ];
        }

        $mtime = filemtime($logFile);
        $size = filesize($logFile);
        if ($size < 1024) {
            return [
                'name'    => 'Shadow Write Duration',
                'status'  => 'warn',
                'message' => 'Query log is very small. SHADOW_WRITE may not have run long enough',
            ];
        }

        return [
            'name'    => 'Shadow Write Duration',
            'status'  => 'pass',
            'message' => 'Query log exists (' . round($size / 1024) . ' KB), last modified ' . date('Y-m-d H:i', $mtime),
        ];
    }

    private function checkNoRecentFallbacks(): array
    {
        // Check error log for recent fallback events
        $errorLog = ini_get('error_log') ?: '/var/log/php-fpm/error.log';
        if (!is_file($errorLog) || !is_readable($errorLog)) {
            return [
                'name'    => 'Recent Fallbacks',
                'status'  => 'warn',
                'message' => 'Cannot read error log to check for fallback events',
            ];
        }

        // Read last 50KB of error log
        $fp = @fopen($errorLog, 'r');
        if (!$fp) {
            return [
                'name'    => 'Recent Fallbacks',
                'status'  => 'warn',
                'message' => 'Cannot open error log',
            ];
        }

        $size = filesize($errorLog);
        $readSize = min($size, 51200);
        fseek($fp, max(0, $size - $readSize));
        $tail = fread($fp, $readSize);
        fclose($fp);

        $fallbackCount = substr_count($tail, 'json_fallback');
        $fallbackCount += substr_count($tail, 'JSON fallback');

        if ($fallbackCount > 0) {
            return [
                'name'    => 'Recent Fallbacks',
                'status'  => 'fail',
                'message' => "{$fallbackCount} fallback events found in recent logs. Resolve before proceeding to POSTGRES_ONLY",
            ];
        }

        return [
            'name'    => 'Recent Fallbacks',
            'status'  => 'pass',
            'message' => 'No fallback events in recent logs',
        ];
    }

    private function checkPostgresPrimaryDuration(): array
    {
        return [
            'name'    => 'POSTGRES_PRIMARY Duration',
            'status'  => 'info',
            'message' => 'Verify POSTGRES_PRIMARY has been running stable for 2+ weeks before switching to POSTGRES_ONLY',
        ];
    }

    // ── Helpers ─────────────────────────────────────────────────────────────

    private function stageLabel(string $mode): string
    {
        return match ($mode) {
            DataLayer::MODE_JSON_ONLY        => 'Stage 1: JSON Only',
            DataLayer::MODE_SHADOW_WRITE     => 'Stage 2: Shadow Write (JSON primary + PG mirror)',
            DataLayer::MODE_POSTGRES_PRIMARY => 'Stage 3: PostgreSQL Primary (with JSON fallback)',
            DataLayer::MODE_POSTGRES_ONLY    => 'Stage 4: PostgreSQL Only (final)',
            default => 'Unknown',
        };
    }

    private function nextStage(string $current): ?string
    {
        return match ($current) {
            DataLayer::MODE_JSON_ONLY        => DataLayer::MODE_SHADOW_WRITE,
            DataLayer::MODE_SHADOW_WRITE     => DataLayer::MODE_POSTGRES_PRIMARY,
            DataLayer::MODE_POSTGRES_PRIMARY => DataLayer::MODE_POSTGRES_ONLY,
            DataLayer::MODE_POSTGRES_ONLY    => null,
            default => null,
        };
    }

    private function countJsonRecords(array $data): int
    {
        $count = 0;
        foreach ($data as $key => $value) {
            if (is_array($value) && !empty($value)) {
                // If it's a list of records (sequential array)
                if (array_is_list($value)) {
                    $count += count($value);
                } else {
                    // It's a nested object — count its children
                    $count += $this->countJsonRecords($value);
                }
            }
        }
        return $count;
    }

    private function loadJson(string $path): ?array
    {
        if (!is_file($path)) return null;
        $raw = @file_get_contents($path);
        if ($raw === false) return null;
        $data = json_decode($raw, true);
        return is_array($data) ? $data : null;
    }
}

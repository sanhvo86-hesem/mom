#!/usr/bin/env php
<?php

declare(strict_types=1);

/**
 * AI Knowledge Index Generator for HESEM MOM ERP
 *
 * Standalone PHP CLI script. No framework, no Composer dependency at runtime.
 * Run: php tools/scripts/ai-index/generate.php [--verbose]
 *
 * Outputs to .ai/ at repo root:
 *   repo-map.json       — project topology
 *   route-map.json      — API routes → controller → method → services → domain
 *   db-map.json         — SQL tables: migration, PK, FK, related services
 *   symbols.json        — PHP classes + public methods + file paths
 *   contracts-map.json  — domain contract objects
 *   module-summaries/   — per-domain Markdown stubs (never overwritten once created)
 */

// ── Bootstrap ─────────────────────────────────────────────────────────────────

$REPO_ROOT = realpath(dirname(__DIR__, 3));   // /path/to/mom  (repo root)
$MOM_ROOT  = $REPO_ROOT . '/mom';
$AI_DIR    = $REPO_ROOT . '/.ai';
$verbose   = in_array('--verbose', $argv ?? [], true);

function out(string $msg): void {
    echo $msg . "\n";
}

function vout(string $msg, bool $verbose): void {
    if ($verbose) {
        echo '  ' . $msg . "\n";
    }
}

// ── Paths ─────────────────────────────────────────────────────────────────────

$PATHS = [
    'controllers' => $MOM_ROOT . '/api/controllers',
    'services'    => $MOM_ROOT . '/api/services',
    'middleware'  => $MOM_ROOT . '/api/middleware',
    'migrations'  => $MOM_ROOT . '/database/migrations',
    'contracts'   => $MOM_ROOT . '/contracts/objects',
    'router_file' => $MOM_ROOT . '/api/index.php',
    'composer'    => $MOM_ROOT . '/composer.json',
];

// ── PHP File Parser ───────────────────────────────────────────────────────────

/**
 * Parse a PHP file using token_get_all() to extract:
 *   - namespace
 *   - class/interface/trait/enum name and type modifier
 *   - use statements (imports)
 *   - public method names
 */
function parse_php_file(string $filePath): array {
    $src = @file_get_contents($filePath);
    if ($src === false) return [];

    $tokens = token_get_all($src, TOKEN_PARSE);
    $count  = count($tokens);

    $result = [
        'namespace' => '',
        'class'     => '',
        'type'      => '',
        'uses'      => [],
        'methods'   => [],
    ];

    $i = 0;
    while ($i < $count) {
        $tok = $tokens[$i];

        if (!is_array($tok)) { $i++; continue; }

        [$id, $val] = $tok;

        // ── namespace ─────────────────────────────────────────────────────────
        if ($id === T_NAMESPACE) {
            $ns = '';
            $i++;
            while ($i < $count) {
                $t = $tokens[$i];
                if (is_array($t) && in_array($t[0], [T_NAME_QUALIFIED, T_STRING, T_NS_SEPARATOR], true)) {
                    $ns .= $t[1];
                } elseif (!is_array($t) && ($t === '{' || $t === ';')) {
                    break;
                }
                $i++;
            }
            $result['namespace'] = trim($ns);
            continue;
        }

        // ── use statement ─────────────────────────────────────────────────────
        if ($id === T_USE) {
            $useStr = '';
            $i++;
            while ($i < $count) {
                $t = $tokens[$i];
                if (is_array($t) && in_array($t[0], [T_NAME_QUALIFIED, T_STRING, T_NS_SEPARATOR], true)) {
                    $useStr .= $t[1];
                } elseif (!is_array($t) && $t === ';') {
                    break;
                } elseif (!is_array($t) && $t === ',') {
                    if (trim($useStr) !== '') $result['uses'][] = trim($useStr);
                    $useStr = '';
                } elseif (!is_array($t) && $t === '{') {
                    // grouped use: MOM\Services\{A, B} — skip inner
                    break;
                }
                $i++;
            }
            if (trim($useStr) !== '') $result['uses'][] = trim($useStr);
            continue;
        }

        // ── class / interface / trait / enum ──────────────────────────────────
        if (in_array($id, [T_CLASS, T_INTERFACE, T_TRAIT, T_ENUM], true)) {
            $typeWord = strtolower($val);
            $modifier = '';
            for ($b = $i - 1; $b >= max(0, $i - 6); $b--) {
                $prev = $tokens[$b];
                if (!is_array($prev)) continue;
                if ($prev[0] === T_FINAL)    { $modifier = 'final '; break; }
                if ($prev[0] === T_ABSTRACT) { $modifier = 'abstract '; break; }
            }
            $result['type'] = $modifier . $typeWord;

            $i++;
            while ($i < $count) {
                $t = $tokens[$i];
                if (is_array($t) && $t[0] === T_WHITESPACE) { $i++; continue; }
                if (is_array($t) && $t[0] === T_STRING) {
                    $result['class'] = $t[1];
                }
                break;
            }
            continue;
        }

        // ── public function ───────────────────────────────────────────────────
        if ($id === T_FUNCTION) {
            $isPublic = false;
            $isStatic = false;
            for ($b = $i - 1; $b >= max(0, $i - 8); $b--) {
                $prev = $tokens[$b];
                if (!is_array($prev)) continue;
                if ($prev[0] === T_WHITESPACE) continue;
                if ($prev[0] === T_PUBLIC)   $isPublic = true;
                if ($prev[0] === T_STATIC)   $isStatic = true;
                if ($prev[0] === T_PRIVATE || $prev[0] === T_PROTECTED) break;
            }
            $i++;  // always advance past T_FUNCTION token
            if ($isPublic) {
                while ($i < $count) {
                    $t = $tokens[$i];
                    if (is_array($t) && $t[0] === T_WHITESPACE) { $i++; continue; }
                    if (is_array($t) && $t[0] === T_STRING) {
                        $result['methods'][] = $t[1] . ($isStatic ? ' [static]' : '');
                    }
                    break;
                }
            }
            continue;
        }

        $i++;
    }

    return $result;
}

// ── Route Parser ──────────────────────────────────────────────────────────────

/**
 * Extract routes from api/index.php:
 *   Action routes: 'action_key' => [SomeController::class, 'method']
 *   REST routes:   $router->get('/path', Controller::class, 'method')
 */
function parse_routes(string $indexFile): array {
    $src = @file_get_contents($indexFile);
    if ($src === false) return ['actions' => [], 'rest' => []];

    $routes = ['actions' => [], 'rest' => []];

    // Action routes
    preg_match_all(
        "/['\"]([a-zA-Z0-9_\.]+)['\"]\s*=>\s*\[([A-Za-z][A-Za-z0-9]+Controller)::class\s*,\s*['\"]([a-zA-Z][a-zA-Z0-9_]+)['\"]\]/",
        $src,
        $m,
        PREG_SET_ORDER
    );
    foreach ($m as $match) {
        $routes['actions'][] = [
            'action'     => $match[1],
            'controller' => $match[2],
            'method'     => $match[3],
        ];
    }

    // RESTful routes
    preg_match_all(
        "/\\\$router->(get|post|put|delete|patch)\s*\(\s*['\"]([^'\"]+)['\"]\s*,\s*([A-Za-z][A-Za-z0-9]+(?:Controller)?)::class\s*,\s*['\"]([a-zA-Z][a-zA-Z0-9_]+)['\"]/",
        $src,
        $m,
        PREG_SET_ORDER
    );
    foreach ($m as $match) {
        $routes['rest'][] = [
            'http_method' => strtoupper($match[1]),
            'path'        => $match[2],
            'controller'  => $match[3],
            'handler'     => $match[4],
        ];
    }

    return $routes;
}

// ── SQL Migration Parser ──────────────────────────────────────────────────────

/**
 * Extract from SQL migration file:
 *   - Description comment (-- Description: ...)
 *   - Dependencies comment (-- Dependencies: ...)
 *   - CREATE TABLE definitions with columns and foreign keys
 *   - ALTER TABLE additions
 */
function parse_migration(string $filePath): array {
    $src = @file_get_contents($filePath);
    if ($src === false) return [];

    $result = [
        'file'         => basename($filePath),
        'description'  => '',
        'dependencies' => [],
        'tables'       => [],
        'alter_tables' => [],
    ];

    if (preg_match('/^--\s*Description:\s*(.+)$/m', $src, $m)) {
        $result['description'] = trim($m[1]);
    }
    if (preg_match('/^--\s*Dependencies?:\s*(.+)$/m', $src, $m)) {
        $result['dependencies'] = array_map('trim', explode(',', $m[1]));
    }

    // CREATE TABLE blocks
    preg_match_all(
        '/CREATE TABLE\s+(?:IF NOT EXISTS\s+)?([a-z_][a-z0-9_]*)\s*\(([^;]+?)\);/si',
        $src,
        $tableMatches,
        PREG_SET_ORDER
    );

    foreach ($tableMatches as $tm) {
        $tableName   = strtolower($tm[1]);
        $body        = $tm[2];
        $columns     = [];
        $primaryKey  = '';
        $foreignKeys = [];

        $lines = preg_split('/,\s*\n/', $body);
        foreach ($lines as $line) {
            $line = trim($line);
            if ($line === '') continue;

            if (preg_match('/PRIMARY KEY\s*\(([^)]+)\)/i', $line, $pkm)) {
                $primaryKey = trim($pkm[1]);
                continue;
            }
            if (preg_match('/FOREIGN KEY\s*\(([^)]+)\)\s*REFERENCES\s+([a-z_][a-z0-9_]*)\s*\(([^)]+)\)/i', $line, $fkm)) {
                $foreignKeys[] = ['col' => trim($fkm[1]), 'ref' => $fkm[2] . '(' . trim($fkm[3]) . ')'];
                continue;
            }

            $skip = ['CONSTRAINT', 'UNIQUE', 'CHECK', 'INDEX', 'EXCLUDE', 'PRIMARY'];
            if (in_array(strtoupper(strtok($line, " \t")), $skip, true)) continue;

            if (preg_match('/^([a-z_][a-z0-9_]*)\s+(\S+)/i', $line, $colm)) {
                $isPk = (bool)preg_match('/PRIMARY KEY/i', $line);
                if ($isPk && $primaryKey === '') $primaryKey = $colm[1];

                $fkRef = '';
                if (preg_match('/REFERENCES\s+([a-z_][a-z0-9_]*)\s*\(([^)]+)\)/i', $line, $rfm)) {
                    $fkRef = $rfm[1] . '(' . trim($rfm[2]) . ')';
                    $foreignKeys[] = ['col' => $colm[1], 'ref' => $fkRef];
                }

                $columns[] = ['name' => $colm[1], 'type' => $colm[2], 'is_pk' => $isPk, 'fk' => $fkRef];
            }
        }

        $result['tables'][] = [
            'name'        => $tableName,
            'primary_key' => $primaryKey,
            'columns'     => $columns,
            'foreign_keys'=> $foreignKeys,
        ];
    }

    // ALTER TABLE additions
    preg_match_all('/ALTER TABLE\s+([a-z_][a-z0-9_]*)\s+ADD\s+COLUMN/i', $src, $am, PREG_SET_ORDER);
    foreach ($am as $a) {
        $result['alter_tables'][] = strtolower($a[1]);
    }

    return $result;
}

// ── Contract Parser ───────────────────────────────────────────────────────────

function parse_contract(string $contractDir): ?array {
    $file = $contractDir . '/contract.json';
    if (!is_file($file)) return null;

    $raw  = @file_get_contents($file);
    $data = json_decode($raw ?: '', true);
    if (!is_array($data)) return null;

    return [
        'resource'      => $data['canonicalResource'] ?? '',
        'canonical_name'=> $data['canonicalName'] ?? '',
        'display_name'  => $data['displayName'] ?? '',
        'domain'        => $data['ownerDomain'] ?? '',
        'purpose'       => $data['purpose'] ?? '',
        'primary_table' => $data['storage']['primaryTable'] ?? '',
        'primary_key'   => $data['storage']['primaryKey'] ?? '',
        'status_field'  => $data['storage']['statusField'] ?? '',
        'child_tables'  => $data['storage']['childTables'] ?? [],
        'object_role'   => $data['objectRole'] ?? '',
        'workflow'      => [
            'implemented' => $data['workflow']['implemented'] ?? false,
            'state_model' => $data['workflow']['stateModelKey'] ?? '',
        ],
        'contract_dir'  => 'mom/contracts/objects/' . basename($contractDir),
    ];
}

// ── Domain map: controller → domain ──────────────────────────────────────────

const DOMAIN_MAP = [
    'OrderController'                   => 'planning_production',
    'DispatchController'                => 'planning_production',
    'AllocationController'              => 'planning_production',
    'AiSchedulingController'            => 'planning_production',
    'MobileController'                  => 'mes_execution',
    'CncProgramController'              => 'mes_execution',
    'FmeaController'                    => 'quality_improvement',
    'ApqpController'                    => 'quality_improvement',
    'ComplianceReportController'        => 'quality_improvement',
    'ExceptionController'               => 'quality_improvement',
    'EvidenceController'                => 'quality_improvement',
    'CiController'                      => 'quality_improvement',
    'OperationalOverrideController'     => 'quality_improvement',
    'ApprovalGroupController'           => 'quality_improvement',
    'SupplierController'                => 'procurement_supplier_quality',
    'QuoteController'                   => 'commercial_customer',
    'CustomerPortalController'          => 'commercial_customer',
    'LogisticsController'               => 'inventory_logistics',
    'FinanceController'                 => 'finance',
    'MasterDataController'              => 'master_data',
    'ProductPassportController'         => 'traceability_serialization',
    'EnergyController'                  => 'maintenance_ehs',
    'DashboardController'               => 'analytics',
    'KnowledgeController'               => 'core_infrastructure',
    'AdminController'                   => 'core_infrastructure',
    'AdminMetadataStudioController'     => 'core_infrastructure',
    'ModuleSchemaController'            => 'core_infrastructure',
    'SchemaStudioController'            => 'core_infrastructure',
    'AuthController'                    => 'core_infrastructure',
    'ApiKeyController'                  => 'core_infrastructure',
    'UserController'                    => 'core_infrastructure',
    'DocumentController'                => 'core_infrastructure',
    'FormController'                    => 'core_infrastructure',
    'FileController'                    => 'core_infrastructure',
    'DictController'                    => 'core_infrastructure',
    'HealthController'                  => 'core_infrastructure',
    'EventStreamController'             => 'core_infrastructure',
    'VpsController'                     => 'core_infrastructure',
    'GenericCrudController'             => 'core_infrastructure',
    'RegistryController'                => 'core_infrastructure',
];

// ── Ensure dirs exist ─────────────────────────────────────────────────────────

if (!is_dir($AI_DIR))                       mkdir($AI_DIR, 0755, true);
if (!is_dir($AI_DIR . '/module-summaries')) mkdir($AI_DIR . '/module-summaries', 0755, true);

out("AI Index Generator — HESEM MOM ERP");
out("Repo root: $REPO_ROOT");
out(str_repeat('─', 60));

// ── Phase 1: Parse PHP files ──────────────────────────────────────────────────

$phpDirs = ['controllers' => $PATHS['controllers'], 'services' => $PATHS['services'], 'middleware' => $PATHS['middleware']];

$parsedByType  = ['controllers' => [], 'services' => [], 'middleware' => []];
$allSymbols    = [];
$controllerUses = [];   // ControllerClass => [UsedClassName, ...]

foreach ($phpDirs as $type => $dir) {
    $files = glob($dir . '/*.php') ?: [];
    foreach ($files as $file) {
        $info = parse_php_file($file);
        if ($info['class'] === '') continue;

        $relPath = 'mom/api/' . $type . '/' . basename($file);
        $info['rel_path'] = $relPath;
        $parsedByType[$type][] = $info;

        $allSymbols[] = [
            'class'     => $info['class'],
            'type'      => $info['type'],
            'namespace' => $info['namespace'],
            'file'      => $relPath,
            'methods'   => $info['methods'],
        ];

        if ($type === 'controllers') {
            $shortNames = [];
            foreach ($info['uses'] as $use) {
                $parts = explode('\\', $use);
                $shortNames[] = end($parts);
            }
            $controllerUses[$info['class']] = $shortNames;
        }
    }
    out("  Parsed " . count($parsedByType[$type]) . " $type");
}

// ── Phase 2: Parse routes ─────────────────────────────────────────────────────

$routes = parse_routes($PATHS['router_file']);
out("  Routes: " . count($routes['actions']) . " action, " . count($routes['rest']) . " REST");

// Enrich with services + domain
$isService = fn(string $name): bool =>
    str_contains($name, 'Service') || str_contains($name, 'Engine') ||
    str_contains($name, 'Worker')  || str_contains($name, 'Adapter') ||
    str_contains($name, 'Registry') || str_contains($name, 'Gateway') ||
    str_contains($name, 'Bridge');

$enrichedActions = [];
foreach ($routes['actions'] as $r) {
    $uses = $controllerUses[$r['controller']] ?? [];
    $r['services'] = array_values(array_filter($uses, $isService));
    $r['domain']   = DOMAIN_MAP[$r['controller']] ?? 'unknown';
    $enrichedActions[] = $r;
}

$enrichedRest = [];
foreach ($routes['rest'] as $r) {
    $uses = $controllerUses[$r['controller']] ?? [];
    $r['services'] = array_values(array_filter($uses, $isService));
    $r['domain']   = DOMAIN_MAP[$r['controller']] ?? 'unknown';
    $enrichedRest[] = $r;
}

// ── Phase 3: Parse migrations ─────────────────────────────────────────────────

$migrationFiles = glob($PATHS['migrations'] . '/*.sql') ?: [];
sort($migrationFiles);

$parsedMigrations = [];
$tableIndex       = [];   // table_name => {defined_in, primary_key, foreign_keys, extended_in[]}

foreach ($migrationFiles as $mf) {
    $m = parse_migration($mf);
    if (empty($m)) continue;
    $parsedMigrations[] = $m;

    foreach ($m['tables'] as $tbl) {
        $tableIndex[$tbl['name']] = [
            'defined_in'  => $m['file'],
            'primary_key' => $tbl['primary_key'],
            'foreign_keys'=> $tbl['foreign_keys'],
            'extended_in' => [],
        ];
    }
    foreach ($m['alter_tables'] as $alt) {
        if (!isset($tableIndex[$alt])) $tableIndex[$alt] = ['defined_in' => null, 'primary_key' => '', 'foreign_keys' => [], 'extended_in' => []];
        $tableIndex[$alt]['extended_in'][] = $m['file'];
    }
}
out("  Migrations: " . count($parsedMigrations) . ", Tables: " . count($tableIndex));

// ── Phase 4: Parse contracts ──────────────────────────────────────────────────

$contractDirs      = glob($PATHS['contracts'] . '/*') ?: [];
$contracts         = [];
$contractsByDomain = [];

foreach ($contractDirs as $cd) {
    if (!is_dir($cd)) continue;
    $c = parse_contract($cd);
    if ($c === null) continue;
    $contracts[] = $c;
    $contractsByDomain[$c['domain']][] = $c;
}
out("  Contracts: " . count($contracts) . " across " . count($contractsByDomain) . " domains");

// ── Phase 5: Build table → service heuristic map ──────────────────────────────

$tableToServices = [];
foreach ($parsedByType['services'] as $svc) {
    $cls = $svc['class'];
    foreach (array_keys($tableIndex) as $tbl) {
        $words = array_filter(explode('_', $tbl), fn($w) => strlen($w) > 3);
        foreach ($words as $word) {
            if (stripos($cls, $word) !== false) {
                $tableToServices[$tbl][] = $cls;
                break;
            }
        }
    }
}

// ── Phase 6: Write output files ───────────────────────────────────────────────

out(str_repeat('─', 60));
out("Writing .ai/ index files...");

// 6a. repo-map.json
$repoMap = [
    '_meta' => [
        'generated_at' => date(DATE_ATOM),
        'generator'    => 'tools/scripts/ai-index/generate.php',
        'description'  => 'High-level project topology. Read this first to orient.',
    ],
    'project' => [
        'name'        => 'HESEM MOM ERP Portal',
        'stack'       => ['PHP 8.2+', 'PostgreSQL', 'Redis', 'RabbitMQ'],
        'entry_point' => 'mom/api/index.php',
        'composer'    => 'mom/composer.json',
    ],
    'namespaces' => [
        'MOM\\Api\\Controllers\\' => 'mom/api/controllers/',
        'MOM\\Api\\Services\\'    => 'mom/api/services/',
        'MOM\\Services\\'         => 'mom/api/services/',
        'MOM\\Api\\Middleware\\'  => 'mom/api/middleware/',
        'MOM\\Database\\'         => 'mom/database/',
    ],
    'counts' => [
        'controllers'  => count($parsedByType['controllers']),
        'services'     => count($parsedByType['services']),
        'middleware'   => count($parsedByType['middleware']),
        'migrations'   => count($parsedMigrations),
        'db_tables'    => count($tableIndex),
        'contracts'    => count($contracts),
        'action_routes'=> count($routes['actions']),
        'rest_routes'  => count($routes['rest']),
    ],
    'domains' => array_keys($contractsByDomain),
    'key_files' => [
        'router'          => 'mom/api/index.php',
        'router_class'    => 'mom/api/Router.php',
        'base_controller' => 'mom/api/controllers/BaseController.php',
        'data_layer'      => 'mom/database/DataLayer.php',
        'db_connection'   => 'mom/database/Connection.php',
        'migrations_dir'  => 'mom/database/migrations/',
        'contracts_dir'   => 'mom/contracts/objects/',
        'composer'        => 'mom/composer.json',
    ],
    'infrastructure_services' => [
        'CacheService'    => 'mom/api/services/CacheService.php',
        'QueueService'    => 'mom/api/services/QueueService.php',
        'EventBus'        => 'mom/api/services/EventBus.php',
        'EventBroadcaster'=> 'mom/api/services/EventBroadcaster.php',
        'WorkflowEngine'  => 'mom/api/services/WorkflowEngine.php',
        'AuthGuard'       => 'mom/api/services/AuthGuard.php',
        'CsrfService'     => 'mom/api/services/CsrfService.php',
        'InputSanitizer'  => 'mom/api/services/InputSanitizer.php',
        'CircuitBreaker'  => 'mom/api/services/CircuitBreaker.php',
        'IdempotencyService' => 'mom/api/services/IdempotencyService.php',
        'StorageService'  => 'mom/api/services/StorageService.php',
        'LogTransport'    => 'mom/api/services/LogTransport.php',
        'ResponseHelper'  => 'mom/api/services/ResponseHelper.php',
    ],
    'middleware_pipeline' => [
        '1_cors'      => 'mom/api/middleware/CorsMiddleware.php',
        '2_api_key'   => 'mom/api/middleware/ApiKeyMiddleware.php',
        '3_auth'      => 'mom/api/middleware/AuthMiddleware.php',
        '4_rate_limit'=> 'mom/api/middleware/RateLimitMiddleware.php',
        '5_audit'     => 'mom/api/middleware/AuditMiddleware.php',
    ],
    'data_layer_modes' => [
        '1_JSON_ONLY'         => 'legacy JSON files only',
        '2_SHADOW_WRITE'      => 'write to both JSON + PostgreSQL',
        '3_POSTGRES_PRIMARY'  => 'read from PostgreSQL, fallback to JSON',
        '4_POSTGRES_ONLY'     => 'PostgreSQL only (final state)',
    ],
];

file_put_contents($AI_DIR . '/repo-map.json', json_encode($repoMap, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
vout("repo-map.json", $verbose);

// 6b. route-map.json
$routeMap = [
    '_meta' => [
        'generated_at' => date(DATE_ATOM),
        'description'  => 'All API routes with controller, method, services used, and domain. Search by action key or URL path.',
        'usage'        => 'Find the right controller by searching action key or path. Then open only that controller file.',
    ],
    'action_routes' => $enrichedActions,
    'rest_routes'   => $enrichedRest,
];

file_put_contents($AI_DIR . '/route-map.json', json_encode($routeMap, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
vout("route-map.json", $verbose);

// 6c. db-map.json
$dbMap = [
    '_meta' => [
        'generated_at'     => date(DATE_ATOM),
        'description'      => 'Database tables: which migration defines them, primary key, foreign keys, related services/contracts.',
        'migrations_dir'   => 'mom/database/migrations/',
        'total_migrations' => count($parsedMigrations),
        'total_tables'     => count($tableIndex),
    ],
    'migrations' => array_map(fn($m) => [
        'file'         => $m['file'],
        'description'  => $m['description'],
        'dependencies' => $m['dependencies'],
        'tables_created'  => array_column($m['tables'], 'name'),
        'tables_extended' => $m['alter_tables'],
    ], $parsedMigrations),
    'tables' => (static function() use ($tableIndex, $tableToServices, $contracts): array {
        $out = [];
        foreach ($tableIndex as $tableName => $info) {
            $ownerContract = null;
            foreach ($contracts as $c) {
                if ($c['primary_table'] === $tableName || in_array($tableName, $c['child_tables'], true)) {
                    $ownerContract = $c['resource'];
                    break;
                }
            }
            $out[$tableName] = [
                'defined_in'      => $info['defined_in'],
                'extended_in'     => $info['extended_in'],
                'primary_key'     => $info['primary_key'],
                'foreign_keys'    => $info['foreign_keys'],
                'contract'        => $ownerContract,
            ];
        }
        ksort($out);
        return $out;
    })(),
];

// Write compact full db-map (no pretty-print to save ~70% size)
file_put_contents($AI_DIR . '/db-map.json', json_encode($dbMap, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
vout("db-map.json (compact)", $verbose);

// Write domain-split db-map files for targeted loading
$dbMapDomainDir = $AI_DIR . '/db-map';
if (!is_dir($dbMapDomainDir)) mkdir($dbMapDomainDir, 0755, true);

// Build table → domain lookup from contracts
$tableToDomain = [];
foreach ($contracts as $c) {
    $d = $c['domain'];
    if ($c['primary_table']) $tableToDomain[$c['primary_table']] = $d;
    foreach ($c['child_tables'] as $ct) $tableToDomain[$ct] = $d;
}
// Fallback: infer domain from migration file name patterns
foreach ($tableIndex as $tName => $tInfo) {
    if (isset($tableToDomain[$tName])) continue;
    $tableToDomain[$tName] = 'unclassified';
}

$tablesByDomain = [];
$domainIndex = [];   // table_name => domain (lightweight index)
foreach ($dbMap['tables'] as $tName => $tData) {
    $d = $tableToDomain[$tName] ?? 'unclassified';
    $tablesByDomain[$d][$tName] = $tData;
    $domainIndex[$tName] = $d;
}

foreach ($tablesByDomain as $domain => $tables) {
    $domainFile = $dbMapDomainDir . '/' . str_replace('_', '-', $domain) . '.json';
    file_put_contents($domainFile, json_encode([
        '_meta' => ['domain' => $domain, 'table_count' => count($tables), 'generated_at' => date(DATE_ATOM)],
        'tables' => $tables,
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
    vout("db-map/$domain.json (" . count($tables) . " tables)", $verbose);
}

// Write lightweight domain index
file_put_contents($dbMapDomainDir . '/index.json', json_encode([
    '_meta' => [
        'description' => 'Table → domain lookup. Use this to find which domain file to load.',
        'usage' => 'Grep table name here, then read .ai/db-map/<domain>.json for full details.',
        'generated_at' => date(DATE_ATOM),
    ],
    'table_domain_map' => $domainIndex,
], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
vout("db-map/index.json", $verbose);

// 6d. symbols.json
$symbolsMap = [
    '_meta' => [
        'generated_at' => date(DATE_ATOM),
        'description'  => 'All PHP classes with public methods and file paths. Search by class or method name to find the right file.',
        'usage'        => 'grep this file for a class or method name to get its file path.',
    ],
    'symbols' => $allSymbols,
];

file_put_contents($AI_DIR . '/symbols.json', json_encode($symbolsMap, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
vout("symbols.json", $verbose);

// 6e. contracts-map.json
$contractsMap = [
    '_meta' => [
        'generated_at' => date(DATE_ATOM),
        'description'  => 'Domain contract objects: canonical resource, primary table, lifecycle status, workflow state model.',
        'contracts_dir'=> 'mom/contracts/objects/',
        'usage'        => 'Find which domain owns a resource and which table stores it. Use primary_table for SQL queries.',
    ],
    'all_contracts'=> $contracts,
];

file_put_contents($AI_DIR . '/contracts-map.json', json_encode($contractsMap, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
vout("contracts-map.json", $verbose);

// ── Phase 7: Module summary stubs (never overwrite) ───────────────────────────

out(str_repeat('─', 60));
out("Writing module summary stubs (skipped if file exists)...");

$domains = [
    'master-data'         => 'master_data',
    'planning-production' => 'planning_production',
    'quality-improvement' => 'quality_improvement',
    'finance'             => 'finance',
    'inventory-logistics' => 'inventory_logistics',
    'procurement'         => 'procurement_supplier_quality',
    'commercial-customer' => 'commercial_customer',
    'maintenance-ehs'     => 'maintenance_ehs',
    'analytics'           => 'analytics',
    'mes-execution'       => 'mes_execution',
    'traceability'        => 'traceability_serialization',
    'core-infrastructure' => 'core_infrastructure',
];

$newStubs = 0;
foreach ($domains as $slug => $domainKey) {
    $mdFile = $AI_DIR . '/module-summaries/' . $slug . '.md';
    if (is_file($mdFile)) {
        vout("SKIP (exists): module-summaries/$slug.md", $verbose);
        continue;
    }

    $domainContracts = $contractsByDomain[$domainKey] ?? [];
    $contractLines = '';
    foreach ($domainContracts as $c) {
        $table = $c['primary_table'] ?: '(no table)';
        $contractLines .= "- **{$c['display_name']}** (`{$c['resource']}`): primary table `{$table}`";
        if ($c['workflow']['implemented']) {
            $contractLines .= ", workflow: `{$c['workflow']['state_model']}`";
        }
        $contractLines .= "\n";
    }
    if ($contractLines === '') $contractLines = "_(none found)_\n";

    $domainControllers = [];
    foreach (DOMAIN_MAP as $ctrl => $d) {
        if ($d === $domainKey) $domainControllers[] = $ctrl;
    }
    $controllerLines = $domainControllers
        ? implode("\n", array_map(fn($c) => "- `{$c}` → `mom/api/controllers/{$c}.php`", $domainControllers))
        : '_(none mapped)_';

    $stub = <<<MD
    # Domain: {$slug}

    > **Auto-generated stub** — edit freely. Re-running `generate.php` will NOT overwrite this file.

    ## Purpose
    <!-- Describe what this domain is responsible for in the business context -->

    ## Canonical Objects (Contracts)
    {$contractLines}
    ## Controllers
    {$controllerLines}

    ## Key Services
    <!-- List 3–5 most important services for this domain and what they do -->

    ## Key Tables
    <!-- List the 3–5 most critical database tables with a one-line description each -->

    ## Workflow States
    <!-- List lifecycle states for the main records (e.g., Draft → Submitted → Approved → Released → Closed) -->

    ## Common Tasks & Entry Points
    <!-- e.g., "To add a field to an NCR: edit migration + contract.json + ExceptionController" -->
    <!-- e.g., "To trace an order: start at OrderController::detail, then OrderService::get" -->

    ## Business Rules
    <!-- Non-obvious rules that would trip up AI without context -->
    <!-- e.g., "JO number = plant_code + year + 4-digit sequence — changing this breaks traveler lookup" -->

    ## Notes / Gotchas
    <!-- Architecture quirks, legacy compatibility concerns, known edge cases -->
    MD;

    file_put_contents($mdFile, $stub);
    vout("Created: module-summaries/$slug.md", $verbose);
    $newStubs++;
}

out("  Created $newStubs new stub(s) in .ai/module-summaries/");

// ── Done ──────────────────────────────────────────────────────────────────────

out(str_repeat('─', 60));
out("Done. Index written to .ai/");
out("  repo-map.json     — " . count($parsedByType['controllers']) . " controllers, " . count($parsedByType['services']) . " services");
out("  route-map.json    — " . count($enrichedActions) . " action routes, " . count($enrichedRest) . " REST routes");
out("  db-map.json       — " . count($tableIndex) . " tables from " . count($parsedMigrations) . " migrations (compact)");
out("  db-map/           — " . count($tablesByDomain) . " domain files + index.json");
out("  symbols.json      — " . count($allSymbols) . " PHP classes indexed");
out("  contracts-map.json— " . count($contracts) . " contracts across " . count($contractsByDomain) . " domains");
out("  module-summaries/ — " . count($domains) . " domain files");
out("");
out("Re-run: php tools/scripts/ai-index/generate.php");
out("Or:     composer --working-dir=mom run ai:index");

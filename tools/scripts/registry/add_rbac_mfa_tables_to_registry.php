<?php
/**
 * One-shot: introspect the 11 new RBAC + MFA tables (migrations 159–165)
 * and inject minimal entries into table-registry.json + runtime-access-policy.json.
 *
 * Usage (run on VPS where Postgres is reachable):
 *   sudo -u postgres php tools/scripts/registry/add_rbac_mfa_tables_to_registry.php
 *
 * Idempotent. Skips entries that already exist.
 */

declare(strict_types=1);

$portalRoot     = realpath(__DIR__ . '/../../..');
if ($portalRoot === false) {
    fwrite(STDERR, "Cannot resolve portal root\n");
    exit(1);
}

$registryPath   = $portalRoot . '/mom/data/registry/table-registry.json';
$policyPath     = $portalRoot . '/mom/data/registry/runtime-access-policy.json';

if (!is_file($registryPath)) {
    fwrite(STDERR, "Missing $registryPath\n");
    exit(1);
}
if (!is_file($policyPath)) {
    fwrite(STDERR, "Missing $policyPath\n");
    exit(1);
}

// New tables to register.
//   table_name          => [ domain, migration, label, labelEn, description ]
$newTables = [
    'permission_catalog' => [
        'domain'      => 'core_system',
        'migration'   => '159_rbac_permission_catalog.sql',
        'label'       => 'Catalog quyền nguyên tử',
        'labelEn'     => 'Permission Catalogue',
        'description' => 'Atomic permission codes (NIST 800-162 / SAP authorization-object compatible).',
        'primaryKey'  => 'permission_code',
    ],
    'modules_catalog' => [
        'domain'      => 'core_system',
        'migration'   => '160_rbac_modules_and_module_permission.sql',
        'label'       => 'Catalog module',
        'labelEn'     => 'Modules Catalogue',
        'description' => 'Frontend module catalogue with display tokens.',
        'primaryKey'  => 'module_code',
    ],
    'module_permission' => [
        'domain'      => 'core_system',
        'migration'   => '160_rbac_modules_and_module_permission.sql',
        'label'       => 'Phân quyền module',
        'labelEn'     => 'Module Permissions',
        'description' => 'Per-role module CRUD/approve/export + ABAC scope.',
        'primaryKey'  => 'module_permission_id',
    ],
    'document_permission_grant' => [
        'domain'      => 'core_system',
        'migration'   => '161_rbac_document_permission_grant.sql',
        'label'       => 'Phân quyền tài liệu',
        'labelEn'     => 'Document Permission Grants',
        'description' => 'Per-doc grant/deny ACL (subject × pattern × action × effect).',
        'primaryKey'  => 'grant_id',
    ],
    'role_sod_conflict' => [
        'domain'      => 'core_system',
        'migration'   => '162_rbac_role_sod_conflict.sql',
        'label'       => 'Ma trận tách trách nhiệm',
        'labelEn'     => 'Role SoD Conflict Matrix',
        'description' => 'Separation-of-Duties conflict matrix (COBIT / SOX / ISO 27001).',
        'primaryKey'  => 'conflict_id',
    ],
    'access_review_campaign' => [
        'domain'      => 'core_system',
        'migration'   => '164_rbac_access_review.sql',
        'label'       => 'Chu kỳ đánh giá phân quyền',
        'labelEn'     => 'Access Review Campaign',
        'description' => 'Periodic access-review campaigns (ISO 27001 A.9.2.5 / SOX 404).',
        'primaryKey'  => 'campaign_id',
    ],
    'access_review_item' => [
        'domain'      => 'core_system',
        'migration'   => '164_rbac_access_review.sql',
        'label'       => 'Mục đánh giá phân quyền',
        'labelEn'     => 'Access Review Item',
        'description' => 'Per-user-per-grant attestation row inside an access-review campaign.',
        'primaryKey'  => 'review_item_id',
    ],
    'mfa_factor' => [
        'domain'      => 'core_system',
        'migration'   => '165_rbac_mfa_factors_and_policy.sql',
        'label'       => 'Yếu tố MFA',
        'labelEn'     => 'MFA Factor',
        'description' => 'Per-factor MFA enrollment (NIST 800-63B / FIDO2).',
        'primaryKey'  => 'factor_id',
    ],
    'mfa_recovery_code' => [
        'domain'      => 'core_system',
        'migration'   => '165_rbac_mfa_factors_and_policy.sql',
        'label'       => 'Mã khôi phục MFA',
        'labelEn'     => 'MFA Recovery Code',
        'description' => 'One-time MFA recovery codes (Argon2id-hashed).',
        'primaryKey'  => 'recovery_code_id',
    ],
    'mfa_policy' => [
        'domain'      => 'core_system',
        'migration'   => '165_rbac_mfa_factors_and_policy.sql',
        'label'       => 'Chính sách MFA',
        'labelEn'     => 'MFA Policy',
        'description' => 'Per-role MFA policy (NIST 800-63B AAL + FIDO2).',
        'primaryKey'  => 'role_id',
    ],
    'mfa_challenge' => [
        'domain'      => 'core_system',
        'migration'   => '165_rbac_mfa_factors_and_policy.sql',
        'label'       => 'Thử thách MFA',
        'labelEn'     => 'MFA Challenge',
        'description' => 'MFA challenge audit (login/step-up/reauth/recovery).',
        'primaryKey'  => 'challenge_id',
    ],
];

// ---- DB introspection ------------------------------------------------------

$dbHost = getenv('DB_HOST') ?: 'localhost';
$dbName = getenv('DB_NAME') ?: 'mom';
$dbUser = getenv('DB_USER') ?: 'postgres';
$dbPass = getenv('DB_PASSWORD') ?: getenv('DB_PASS') ?: '';

$dsn = sprintf('pgsql:host=%s;dbname=%s', $dbHost, $dbName);
try {
    $pdo = new PDO($dsn, $dbUser, $dbPass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    ]);
} catch (PDOException $e) {
    fwrite(STDERR, 'Cannot connect to DB: ' . $e->getMessage() . "\n");
    exit(1);
}

function pgTypeToRegistryType(string $dataType, ?int $charMax, ?string $udtName): string
{
    $t = strtolower($dataType);
    switch ($t) {
        case 'character varying':
            return 'VARCHAR' . ($charMax ? '(' . $charMax . ')' : '');
        case 'character':
            return 'CHAR' . ($charMax ? '(' . $charMax . ')' : '');
        case 'text':            return 'TEXT';
        case 'integer':         return 'INTEGER';
        case 'bigint':          return 'BIGINT';
        case 'smallint':        return 'SMALLINT';
        case 'boolean':         return 'BOOLEAN';
        case 'timestamp with time zone':    return 'TIMESTAMPTZ';
        case 'timestamp without time zone': return 'TIMESTAMP';
        case 'date':            return 'DATE';
        case 'jsonb':           return 'JSONB';
        case 'json':            return 'JSON';
        case 'uuid':            return 'UUID';
        case 'numeric':         return 'NUMERIC';
        case 'bytea':           return 'BYTEA';
        case 'inet':            return 'INET';
        case 'array':
            return strtoupper($udtName ?: 'TEXT[]');
        case 'user-defined':
            return strtoupper($udtName ?: 'USER_DEFINED');
        default:
            return strtoupper($t);
    }
}

function uiTypeForColumn(string $type, string $colName): string
{
    if (str_contains($type, 'JSON'))               return 'json';
    if (str_contains($type, 'BOOLEAN'))             return 'boolean';
    if (str_contains($type, 'TIMESTAMP') || str_contains($type, 'DATE')) return 'datetime';
    if (str_contains($type, 'INTEGER') || str_contains($type, 'SMALLINT') || str_contains($type, 'BIGINT') || str_contains($type, 'NUMERIC')) return 'number';
    if (str_contains($type, 'BYTEA'))               return 'binary';
    if (str_contains($type, 'TEXT'))                return 'textarea';
    if (preg_match('/_id$|_code$/', $colName) || str_contains($type, 'UUID')) return 'reference';
    return 'string';
}

// ---- Read existing registry ------------------------------------------------

$registry = json_decode((string)file_get_contents($registryPath), true);
if (!is_array($registry) || !isset($registry['tables'])) {
    fwrite(STDERR, "Malformed table-registry.json\n");
    exit(1);
}

$policy = json_decode((string)file_get_contents($policyPath), true);
if (!is_array($policy) || !isset($policy['tableOverrides']) && !isset($policy['tables'])) {
    // policy can use either schema; fall through.
}

// ---- Build entries for the new tables --------------------------------------

$added = 0;
$skipped = 0;

foreach ($newTables as $tableName => $meta) {
    if (isset($registry['tables'][$tableName])) {
        echo "  skip (exists): $tableName\n";
        $skipped++;
        continue;
    }

    $colsStmt = $pdo->prepare(<<<SQL
        SELECT
            c.column_name,
            c.data_type,
            c.udt_name,
            c.character_maximum_length,
            c.is_nullable,
            c.column_default,
            c.is_generated,
            (cu.constraint_name IS NOT NULL) AS is_pk,
            (uq.constraint_name IS NOT NULL) AS is_unique,
            COALESCE(fk.foreign_table || '.' || fk.foreign_column, NULL) AS references_target,
            col_description(format('public.%I', c.table_name)::regclass, c.ordinal_position) AS column_comment
        FROM information_schema.columns c
        LEFT JOIN information_schema.key_column_usage cu
            ON cu.column_name = c.column_name AND cu.table_name = c.table_name
            AND cu.constraint_name IN (
                SELECT constraint_name FROM information_schema.table_constraints
                WHERE table_name = c.table_name AND constraint_type = 'PRIMARY KEY'
            )
        LEFT JOIN information_schema.key_column_usage uq
            ON uq.column_name = c.column_name AND uq.table_name = c.table_name
            AND uq.constraint_name IN (
                SELECT constraint_name FROM information_schema.table_constraints
                WHERE table_name = c.table_name AND constraint_type = 'UNIQUE'
            )
        LEFT JOIN (
            SELECT
                tc.table_name,
                kcu.column_name,
                ccu.table_name  AS foreign_table,
                ccu.column_name AS foreign_column
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu
                ON kcu.constraint_name = tc.constraint_name AND kcu.table_name = tc.table_name
            JOIN information_schema.constraint_column_usage ccu
                ON ccu.constraint_name = tc.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY'
        ) fk ON fk.table_name = c.table_name AND fk.column_name = c.column_name
        WHERE c.table_name = :tableName
          AND c.table_schema = 'public'
        ORDER BY c.ordinal_position
SQL);
    $colsStmt->execute([':tableName' => $tableName]);
    $rows = $colsStmt->fetchAll(PDO::FETCH_ASSOC);
    if (!$rows) {
        fwrite(STDERR, "  ! table not found in DB: $tableName\n");
        continue;
    }

    $columns = [];
    $foreignKeys = [];
    foreach ($rows as $row) {
        $colName = (string)$row['column_name'];
        $type    = pgTypeToRegistryType((string)$row['data_type'], $row['character_maximum_length'] ? (int)$row['character_maximum_length'] : null, (string)($row['udt_name'] ?? ''));
        $columns[$colName] = [
            'type'         => $type,
            'label'        => $colName,
            'labelEn'      => $colName,
            'required'     => (string)$row['is_nullable'] === 'NO',
            'pk'           => (bool)$row['is_pk'],
            'unique'       => (bool)$row['is_unique'],
            'generated'    => (string)($row['is_generated'] ?? 'NEVER') !== 'NEVER',
            'default'      => $row['column_default'],
            'uiType'       => uiTypeForColumn($type, $colName),
            'references'   => $row['references_target'],
            'description'  => $row['column_comment'],
        ];
        if (!empty($row['references_target'])) {
            $foreignKeys[] = [
                'column'     => $colName,
                'references' => (string)$row['references_target'],
                'label'      => $colName,
            ];
        }
    }

    $registry['tables'][$tableName] = [
        'domain'        => $meta['domain'],
        'migration'     => $meta['migration'],
        'label'         => $meta['label'],
        'labelEn'       => $meta['labelEn'],
        'description'   => $meta['description'],
        'primaryKey'    => $meta['primaryKey'],
        'statusColumn'  => null,
        'statusSet'     => null,
        'workflowId'    => null,
        'supportTable'  => false,
        'columnCount'   => count($columns),
        'columns'       => $columns,
        'foreignKeys'   => $foreignKeys,
    ];

    echo "  added: $tableName (" . count($columns) . " cols, " . count($foreignKeys) . " fks)\n";
    $added++;
}

// ---- runtime-access-policy: grant admin tier read+write to new tables ------
// The policy file uses the `tables` key (NOT `tableOverrides`) — confirmed
// at runtime by GenericCrudController::shouldDenyDefaultAuthenticatedRead.

$adminTierRoles = ['it_admin', 'ceo', 'qa_manager', 'qms_engineer'];
$policyTables   = (array)($policy['tables'] ?? []);
$policyAdded    = 0;

foreach (array_keys($newTables) as $tableName) {
    if (isset($policyTables[$tableName])) {
        continue;
    }
    $policyTables[$tableName] = [
        'list'       => $adminTierRoles,
        'detail'     => $adminTierRoles,
        'create'     => $adminTierRoles,
        'update'     => $adminTierRoles,
        'transition' => $adminTierRoles,
        'delete'     => array_values(array_diff($adminTierRoles, ['qms_engineer'])),
    ];
    $policyAdded++;
}

ksort($policyTables);
$policy['tables'] = $policyTables;
if (isset($policy['_meta']['tableOverrideCount'])) {
    $policy['_meta']['tableOverrideCount'] = count($policyTables);
}

// ---- Persist ---------------------------------------------------------------

$registry['_meta']['tableCount'] = count($registry['tables']);
$registry['_meta']['lastUpdatedAt'] = date('c');

file_put_contents($registryPath, json_encode($registry, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n");
file_put_contents($policyPath, json_encode($policy, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n");

echo "\nResult:\n";
echo "  table-registry.json  : $added added, $skipped skipped (total tables: " . count($registry['tables']) . ")\n";
echo "  runtime-access-policy.json: $policyAdded new overrides (total: " . count($tableOverrides) . ")\n";
echo "Done.\n";

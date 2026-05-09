<?php
/**
 * One-shot importer: legacy file-based RBAC configs → normalized DB tables.
 *
 *   role_permissions.json    →  module_permission (one row per role × module
 *                                with can_view/create/update inferred from
 *                                the legacy permission patterns)
 *   module_access_config.json →  module_permission (overlay: rows where
 *                                access != 'all' restrict to specific roles)
 *
 * The script is idempotent — re-running upserts the same rows. It does NOT
 * delete rows the legacy files don't mention, so manual changes made via the
 * admin UI survive.
 *
 * Usage on VPS:
 *   sudo -u postgres bash -c '
 *     export DB_HOST=/var/run/postgresql DB_USER=postgres DB_NAME=mom
 *     php tools/scripts/registry/import_legacy_rbac_configs.php /path/to/portal_root [--dry-run]
 *   '
 */

declare(strict_types=1);

$portalRoot = $argv[1] ?? null;
if ($portalRoot === null || !is_dir($portalRoot)) {
    fwrite(STDERR, "Usage: php import_legacy_rbac_configs.php <portal_root_dir> [--dry-run]\n");
    exit(1);
}
$dryRun = in_array('--dry-run', $argv, true);

$dataConfigDir = rtrim($portalRoot, '/') . '/mom/data/config';
$rolePermPath  = $dataConfigDir . '/role_permissions.json';
$moduleAccPath = $dataConfigDir . '/module_access_config.json';

$rolePerms = is_file($rolePermPath) ? (array)(json_decode((string)file_get_contents($rolePermPath), true) ?: []) : [];
$moduleAcc = is_file($moduleAccPath) ? (array)(json_decode((string)file_get_contents($moduleAccPath), true) ?: []) : [];

// ── Connect ─────────────────────────────────────────────────────────────────
$dsn = sprintf('pgsql:host=%s;dbname=%s', getenv('DB_HOST') ?: 'localhost', getenv('DB_NAME') ?: 'mom');
$pdo = new PDO($dsn, getenv('DB_USER') ?: 'postgres', getenv('DB_PASSWORD') ?: '', [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
]);

// ── Load DB lookups ─────────────────────────────────────────────────────────
$roles = $pdo->query("SELECT role_id, role_code, is_admin_tier FROM roles WHERE deleted_at IS NULL")->fetchAll();
$roleByCode = [];
foreach ($roles as $r) { $roleByCode[$r['role_code']] = $r; }

$modules = $pdo->query("SELECT module_code FROM modules_catalog WHERE deleted_at IS NULL")->fetchAll();
$moduleCodes = array_column($modules, 'module_code');

// Map legacy module names (from module_access_config.json) → modules_catalog.module_code.
$legacyModuleMap = [
    'dashboard'   => 'dashboard',
    'documents'   => 'docs',
    'search'      => 'docs',
    'dictionary'  => 'docs',
    'orders'      => 'production',
    'dispatch'    => 'production',
    'mes'         => 'production',
    'access'      => 'rbac',
    'deploy'      => 'infrastructure',
    'exceptions'  => 'quality',
    'fmea'        => 'quality',
    'audit'       => 'audit',
    'training'    => 'training',
    'analytics'   => 'analytics',
    'finance'     => 'finance',
    'hr'          => 'hr',
    'inventory'   => 'inventory',
    'purchasing'  => 'purchasing',
    'eqms'        => 'eqms',
    'translation' => 'translation',
    'ai'          => 'ai_control',
    'schema'      => 'schema_studio',
];

// ── Helpers ─────────────────────────────────────────────────────────────────
/**
 * @param array<string, mixed> $rolePerm  legacy role_permissions[role] entry
 */
function flagsForRolePermission(array $rolePerm, bool $isAdminTier): array
{
    if ($isAdminTier || !empty($rolePerm['allowAllPermissions'])) {
        return ['can_view'=>true,'can_create'=>true,'can_update'=>true,'can_delete'=>true,'can_approve'=>true,'can_export'=>true];
    }
    $perms = (array)($rolePerm['permissions'] ?? []);
    $denies = array_flip(array_map('strval', (array)($rolePerm['denies'] ?? [])));
    $hasWildcard = in_array('*', $perms, true);
    $allowedPattern = static fn (string $verb): bool => $hasWildcard
        || array_any($perms, fn($p) => $p === '*' || $p === '*.' . $verb || str_ends_with($p, '.' . $verb));
    return [
        'can_view'    => $allowedPattern('read')   && !isset($denies['*.read']),
        'can_create'  => (!empty($rolePerm['canCreateDocs']) || $allowedPattern('write') || $allowedPattern('create')) && !isset($denies['*.write']) && !isset($denies['*.create']),
        'can_update'  => (!empty($rolePerm['canEditDocs'])   || $allowedPattern('write') || $allowedPattern('update')) && !isset($denies['*.write']) && !isset($denies['*.update']),
        'can_delete'  => $allowedPattern('delete') && !isset($denies['*.delete']),
        'can_approve' => !empty($rolePerm['canApprove']) || ($allowedPattern('approve') && !isset($denies['*.approve'])),
        'can_export'  => !empty($rolePerm['canExportUsers']) || $allowedPattern('export'),
    ];
}
if (!function_exists('array_any')) {
    function array_any(array $arr, callable $f): bool {
        foreach ($arr as $v) { if ($f($v)) return true; }
        return false;
    }
}

// ── Build module_permission rows ────────────────────────────────────────────
$rows = [];
foreach ($roleByCode as $code => $role) {
    $rolePerm = (array)($rolePerms[$code] ?? []);
    $isAdminTier = (bool)$role['is_admin_tier'];
    $flags = flagsForRolePermission($rolePerm, $isAdminTier);

    foreach ($moduleCodes as $modCode) {
        $row = array_merge([
            'role_id' => $role['role_id'],
            'module_code' => $modCode,
        ], $flags);

        // module_access_config: if a module has access != 'all' AND roles[] doesn't include this role,
        // mute the flags entirely.
        $legacyMods = (array)($moduleAcc['portal_modules'] ?? []);
        foreach ($legacyMods as $legacyKey => $legacyEntry) {
            if (($legacyModuleMap[$legacyKey] ?? null) !== $modCode) continue;
            if (!is_array($legacyEntry)) continue;
            if (($legacyEntry['enabled'] ?? true) !== true) {
                foreach ($flags as $k => $_) $row[$k] = false;
            }
            $access = (string)($legacyEntry['access'] ?? 'all');
            $allowedRoles = (array)($legacyEntry['roles'] ?? []);
            if ($access !== 'all' && !$isAdminTier && !in_array($code, $allowedRoles, true)) {
                foreach ($flags as $k => $_) $row[$k] = false;
            }
        }

        $rows[] = $row;
    }
}

// ── Upsert ──────────────────────────────────────────────────────────────────
echo sprintf("Roles: %d, Modules: %d, Rows to upsert: %d\n", count($roleByCode), count($moduleCodes), count($rows));

if ($dryRun) {
    $sample = array_slice($rows, 0, 5);
    echo "Sample 5:\n";
    foreach ($sample as $r) echo '  ' . json_encode($r) . "\n";
    echo "(--dry-run; no changes written)\n";
    exit(0);
}

$upserted = 0;
$pdo->beginTransaction();
try {
    $sql = "INSERT INTO module_permission
                (role_id, module_code, can_view, can_create, can_update, can_delete, can_approve, can_export, created_at, updated_at)
            VALUES
                (:rid::uuid, :mc, :cv, :cc, :cu, :cd, :ca, :ce, now(), now())
            ON CONFLICT (role_id, module_code, deleted_at) DO UPDATE
            SET can_view    = EXCLUDED.can_view,
                can_create  = EXCLUDED.can_create,
                can_update  = EXCLUDED.can_update,
                can_delete  = EXCLUDED.can_delete,
                can_approve = EXCLUDED.can_approve,
                can_export  = EXCLUDED.can_export,
                updated_at  = now(),
                row_version = module_permission.row_version + 1";
    $stmt = $pdo->prepare($sql);
    foreach ($rows as $r) {
        $stmt->execute([
            ':rid' => $r['role_id'],
            ':mc'  => $r['module_code'],
            ':cv'  => $r['can_view']    ? 'true' : 'false',
            ':cc'  => $r['can_create']  ? 'true' : 'false',
            ':cu'  => $r['can_update']  ? 'true' : 'false',
            ':cd'  => $r['can_delete']  ? 'true' : 'false',
            ':ca'  => $r['can_approve'] ? 'true' : 'false',
            ':ce'  => $r['can_export']  ? 'true' : 'false',
        ]);
        $upserted++;
    }
    $pdo->commit();
} catch (\Throwable $e) {
    $pdo->rollBack();
    fwrite(STDERR, "Failed: " . $e->getMessage() . "\n");
    exit(1);
}

echo "Upserted $upserted module_permission rows.\n";

// ── Sync legacy role_permissions.json into roles.permissions JSONB ─────────
$syncedRoles = 0;
foreach ($rolePerms as $code => $perm) {
    if (!isset($roleByCode[$code])) continue;
    $stmt = $pdo->prepare("UPDATE roles
                            SET permissions = COALESCE(permissions, '{}'::jsonb) || :legacy::jsonb,
                                updated_at  = now(),
                                row_version = row_version + 1
                          WHERE role_id = :rid::uuid");
    $stmt->execute([
        ':legacy' => json_encode($perm, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
        ':rid'    => $roleByCode[$code]['role_id'],
    ]);
    $syncedRoles++;
}
echo "Synced legacy permissions JSONB on $syncedRoles roles.\n";

echo "Done.\n";

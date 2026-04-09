<?php

declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    fwrite(STDERR, "This script must be run from CLI.\n");
    exit(1);
}

define('API_HELPERS_ONLY', true);
require dirname(__DIR__) . '/api.php';

$rootDir = $GLOBALS['ROOT_DIR'] ?? (realpath(dirname(__DIR__) . '/..') ?: dirname(dirname(__DIR__)));
$usersFile = $GLOBALS['USERS_FILE'] ?? ($GLOBALS['CONF_DIR'] . '/users.json');
$store = users_load($usersFile);
$users = is_array($store['users'] ?? null) ? $store['users'] : [];
$shadowSync = null;
$dbSyncAvailable = false;

try {
    $dbConnection = portal_system_db_connection();
    if ($dbConnection) {
        $probe = $dbConnection->queryOne('SELECT 1 AS ok');
        $dbSyncAvailable = ((int)($probe['ok'] ?? 0) === 1);
    }
} catch (Throwable $e) {
    $dbSyncAvailable = false;
}

if ($dbSyncAvailable) {
    $shadowSync = portal_auth_shadow_sync_service((string)$rootDir);
}

$updatedIdentity = 0;
$synced = 0;
$skipped = 0;
$failed = 0;
$errors = [];

foreach ($users as $index => $user) {
    if (!is_array($user)) {
        $skipped++;
        continue;
    }

    $employeeId = portal_auth_employee_id_for_user($user);
    if (trim((string)($user['employee_id'] ?? '')) !== $employeeId) {
        $users[$index]['employee_id'] = $employeeId;
        $user['employee_id'] = $employeeId;
        $updatedIdentity++;
    }

    if (!$shadowSync || !method_exists($shadowSync, 'syncUser')) {
        $skipped++;
        continue;
    }

    try {
        $shadowSync->syncUser($user);
        $synced++;
    } catch (Throwable $e) {
        $failed++;
        $errors[] = [
            'username' => (string)($user['username'] ?? ''),
            'error' => $e->getMessage(),
        ];
    }
}

$store['users'] = $users;
users_save($usersFile, $store);

$totalUsers = count($users);

fwrite(STDOUT, "Auth user DB sync summary\n");
fwrite(STDOUT, "users_total={$totalUsers}\n");
fwrite(STDOUT, "employee_id_updated={$updatedIdentity}\n");
fwrite(STDOUT, "db_sync_available=" . ($dbSyncAvailable ? 'yes' : 'no') . "\n");
fwrite(STDOUT, "synced={$synced}\n");
fwrite(STDOUT, "skipped={$skipped}\n");
fwrite(STDOUT, "failed={$failed}\n");

if ($errors !== []) {
    fwrite(STDOUT, "errors:\n");
    foreach ($errors as $row) {
        fwrite(STDOUT, '- ' . ($row['username'] !== '' ? $row['username'] : 'unknown') . ': ' . $row['error'] . "\n");
    }
}

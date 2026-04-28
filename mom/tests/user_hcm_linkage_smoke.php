<?php

declare(strict_types=1);

require __DIR__ . '/bootstrap.php';
restore_exception_handler();
restore_error_handler();

use MOM\Api\Controllers\BaseController;
use MOM\Api\Controllers\ExitException;
use MOM\Api\Controllers\UserController;
use MOM\Database\DataLayer;

function user_hcm_smoke_reset_request_state(): void
{
    $_GET = [];
    $_POST = [];
    $_FILES = [];
    $_SERVER = [
        'REQUEST_METHOD' => 'GET',
        'REQUEST_URI' => '/',
        'REMOTE_ADDR' => '127.0.0.1',
    ];
    $_SESSION = [];
}

function user_hcm_smoke_boot_session(): void
{
    if (session_status() !== PHP_SESSION_ACTIVE) {
        session_init();
    }
}

$usersFile = QMS_TEST_DATA_DIR . '/config/users.json';
$originalExists = is_file($usersFile);
$originalContents = $originalExists ? (string)file_get_contents($usersFile) : '';

try {
    $dataLayer = new DataLayer(QMS_TEST_DATA_DIR, QMS_TEST_ROOT_DIR);
    $store = [
        'settings' => ['require_mfa' => false],
        'users' => [
            [
                'username' => 'admin-user',
                'name' => 'Admin User',
                'role' => 'qa_manager',
                'active' => true,
                'password_hash' => password_hash('Admin!234', PASSWORD_BCRYPT, ['cost' => 4]),
            ],
        ],
    ];

    file_put_contents($usersFile, json_encode($store, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));

    $bodyProp = new ReflectionProperty(BaseController::class, 'jsonBodyCache');
    $orgUnitId = '11111111-1111-4111-8111-111111111111';
    $positionId = '22222222-2222-4222-8222-222222222222';

    user_hcm_smoke_reset_request_state();
    user_hcm_smoke_boot_session();
    $_SESSION['user'] = 'admin-user';
    $_SESSION['mfa_ok'] = true;
    $_SESSION['csrf'] = 'user-hcm-token';
    $_SERVER['REQUEST_METHOD'] = 'POST';
    $_SERVER['HTTP_X_CSRF_TOKEN'] = 'user-hcm-token';

    $controller = (new UserController($dataLayer, QMS_TEST_ROOT_DIR, QMS_TEST_DATA_DIR))->setStore($store);
    $bodyProp->setValue($controller, [
        'username' => 'linked.user',
        'name' => 'Linked User',
        'role' => 'cnc_operator',
        'dept' => 'QA',
        'title' => 'QA Manager',
        'active' => true,
        'password' => 'Linked!234',
        'cccd' => '012345678901',
        'phone' => '0901234567',
        'personal_email' => 'linked.user@example.com',
        'hcm_org_unit_id' => $orgUnitId,
        'hcm_position_id' => $positionId,
    ]);

    try {
        $controller->upsert();
        throw new RuntimeException('UserController::upsert did not return ExitException.');
    } catch (ExitException $e) {
        $payload = $e->getPayload();
        smoke_assert($e->getStatusCode() === 200, 'user upsert returned wrong status.');
        smoke_assert(($payload['ok'] ?? false) === true, 'user upsert returned ok=false.');
        smoke_assert(
            (string)($payload['user']['hcm_org_unit_id'] ?? '') === $orgUnitId,
            'user upsert response lost hcm_org_unit_id.'
        );
        smoke_assert(
            (string)($payload['user']['hcm_position_id'] ?? '') === $positionId,
            'user upsert response lost hcm_position_id.'
        );
        smoke_assert(
            (string)($payload['user']['role'] ?? '') === 'cnc_operator',
            'user upsert response did not retain runtime role code.'
        );
    }

    $persistedStore = users_load($usersFile);
    $persistedUser = find_user_by_username($persistedStore, 'linked.user');
    smoke_assert(is_array($persistedUser), 'Persisted linked.user record was not found.');
    smoke_assert(
        (string)($persistedUser['hcm_org_unit_id'] ?? '') === $orgUnitId,
        'users.json did not persist hcm_org_unit_id.'
    );
    smoke_assert(
        (string)($persistedUser['hcm_position_id'] ?? '') === $positionId,
        'users.json did not persist hcm_position_id.'
    );
    smoke_assert(
        (string)($persistedUser['role'] ?? '') === 'cnc_operator',
        'users.json did not persist runtime role code.'
    );

    $clientPayload = sanitize_user_for_client($persistedUser);
    smoke_assert(
        (string)($clientPayload['hcm_org_unit_id'] ?? '') === $orgUnitId,
        'sanitize_user_for_client did not expose hcm_org_unit_id.'
    );
    smoke_assert(
        (string)($clientPayload['hcm_position_id'] ?? '') === $positionId,
        'sanitize_user_for_client did not expose hcm_position_id.'
    );

    $normalized = portal_auth_normalize_user_linkage(
        [
            'dept' => 'QA',
            'title' => 'QA Manager',
            'hcm_org_unit_id' => $orgUnitId,
            'hcm_position_id' => $positionId,
        ],
        QMS_TEST_ROOT_DIR
    );
    smoke_assert(
        (string)($normalized['hcm_org_unit_id'] ?? '') === $orgUnitId,
        'portal_auth_normalize_user_linkage did not retain explicit hcm_org_unit_id.'
    );
    smoke_assert(
        (string)($normalized['hcm_position_id'] ?? '') === $positionId,
        'portal_auth_normalize_user_linkage did not retain explicit hcm_position_id.'
    );

    user_hcm_smoke_reset_request_state();
    user_hcm_smoke_boot_session();
    $_SESSION['user'] = 'admin-user';
    $_SESSION['mfa_ok'] = true;
    $_SERVER['REQUEST_METHOD'] = 'GET';
    $listController = (new UserController($dataLayer, QMS_TEST_ROOT_DIR, QMS_TEST_DATA_DIR))->setStore($persistedStore);
    try {
        $listController->list();
        throw new RuntimeException('UserController::list did not return ExitException.');
    } catch (ExitException $e) {
        $payload = $e->getPayload();
        smoke_assert($e->getStatusCode() === 200, 'user list returned wrong status.');
        $listed = null;
        foreach ((array)($payload['users'] ?? []) as $row) {
            if ((string)($row['username'] ?? '') === 'linked.user') {
                $listed = $row;
                break;
            }
        }
        smoke_assert(is_array($listed), 'user list did not return linked.user.');
        smoke_assert(
            (string)($listed['hcm_org_unit_id'] ?? '') === $orgUnitId,
            'user list payload lost hcm_org_unit_id.'
        );
        smoke_assert(
            (string)($listed['hcm_position_id'] ?? '') === $positionId,
            'user list payload lost hcm_position_id.'
        );
    }

    echo "user hcm linkage smoke passed\n";
} finally {
    if ($originalExists) {
        file_put_contents($usersFile, $originalContents);
    } elseif (is_file($usersFile)) {
        @unlink($usersFile);
    }
}

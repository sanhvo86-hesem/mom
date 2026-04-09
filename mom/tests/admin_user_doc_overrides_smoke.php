<?php

declare(strict_types=1);

require __DIR__ . '/bootstrap.php';
restore_exception_handler();
restore_error_handler();

use MOM\Api\Controllers\AdminController;
use MOM\Api\Controllers\BaseController;
use MOM\Api\Controllers\ExitException;
use MOM\Database\DataLayer;

function admin_user_doc_smoke_reset_request_state(): void
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

function admin_user_doc_smoke_boot_session(): void
{
    if (session_status() !== PHP_SESSION_ACTIVE) {
        session_init();
    }
}

$overridesFile = QMS_TEST_DATA_DIR . '/config/user_doc_overrides.json';
$originalExists = is_file($overridesFile);
$originalContents = $originalExists ? (string)file_get_contents($overridesFile) : '';

try {
    $dataLayer = new DataLayer(QMS_TEST_DATA_DIR, QMS_TEST_ROOT_DIR);
    $store = [
        'settings' => ['require_mfa' => false],
        'users' => [
            ['username' => 'admin-user', 'name' => 'Admin', 'role' => 'qa_manager', 'active' => true],
            ['username' => 'operator-user', 'name' => 'Operator', 'role' => 'cnc_operator', 'active' => true],
        ],
    ];

    $bodyProp = new ReflectionProperty(BaseController::class, 'jsonBodyCache');

    admin_user_doc_smoke_reset_request_state();
    admin_user_doc_smoke_boot_session();
    $_SESSION['user'] = 'admin-user';
    $_SESSION['mfa_ok'] = true;
    $_SESSION['csrf'] = 'smoke-token';
    $_SERVER['REQUEST_METHOD'] = 'POST';
    $_SERVER['HTTP_X_CSRF_TOKEN'] = 'smoke-token';
    $saveController = (new AdminController($dataLayer, QMS_TEST_ROOT_DIR, QMS_TEST_DATA_DIR))->setStore($store);
    $bodyProp->setValue($saveController, [
        'overrides' => [
            'operator-user' => [
                'grant' => ['sop-001', ' SOP-001 ', 'wi-002'],
                'deny' => ['frm-003', ''],
            ],
            '' => ['grant' => ['INVALID']],
        ],
    ]);
    try {
        $saveController->saveUserDocumentOverrides();
        throw new RuntimeException('saveUserDocumentOverrides did not return ExitException.');
    } catch (ExitException $e) {
        $payload = $e->getPayload();
        smoke_assert($e->getStatusCode() === 200, 'user_doc_overrides save returned wrong status.');
        smoke_assert(($payload['ok'] ?? false) === true, 'user_doc_overrides save returned ok=false.');
        smoke_assert(
            (array)($payload['overrides']['operator-user']['grant'] ?? []) === ['SOP-001', 'WI-002'],
            'user_doc_overrides save did not normalize grant list.'
        );
        smoke_assert(
            (array)($payload['overrides']['operator-user']['deny'] ?? []) === ['FRM-003'],
            'user_doc_overrides save did not normalize deny list.'
        );
    }

    admin_user_doc_smoke_reset_request_state();
    admin_user_doc_smoke_boot_session();
    $_SESSION['user'] = 'admin-user';
    $_SESSION['mfa_ok'] = true;
    $_SERVER['REQUEST_METHOD'] = 'GET';
    $adminGetController = (new AdminController($dataLayer, QMS_TEST_ROOT_DIR, QMS_TEST_DATA_DIR))->setStore($store);
    try {
        $adminGetController->getUserDocumentOverrides();
        throw new RuntimeException('getUserDocumentOverrides (admin) did not return ExitException.');
    } catch (ExitException $e) {
        $payload = $e->getPayload();
        smoke_assert($e->getStatusCode() === 200, 'admin user_doc_overrides get returned wrong status.');
        smoke_assert(
            array_keys((array)($payload['overrides'] ?? [])) === ['operator-user'],
            'admin user_doc_overrides get returned wrong override keys.'
        );
    }

    admin_user_doc_smoke_reset_request_state();
    admin_user_doc_smoke_boot_session();
    $_SESSION['user'] = 'operator-user';
    $_SESSION['mfa_ok'] = true;
    $_SERVER['REQUEST_METHOD'] = 'GET';
    $userGetController = (new AdminController($dataLayer, QMS_TEST_ROOT_DIR, QMS_TEST_DATA_DIR))->setStore($store);
    try {
        $userGetController->getUserDocumentOverrides();
        throw new RuntimeException('getUserDocumentOverrides (user) did not return ExitException.');
    } catch (ExitException $e) {
        $payload = $e->getPayload();
        smoke_assert($e->getStatusCode() === 200, 'non-admin user_doc_overrides get returned wrong status.');
        smoke_assert(
            array_keys((array)($payload['overrides'] ?? [])) === ['operator-user'],
            'non-admin user_doc_overrides get did not scope to self.'
        );
    }

    echo "admin user doc overrides smoke passed\n";
} finally {
    if ($originalExists) {
        file_put_contents($overridesFile, $originalContents);
    } elseif (is_file($overridesFile)) {
        @unlink($overridesFile);
    }
}

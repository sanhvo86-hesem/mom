<?php

declare(strict_types=1);

require __DIR__ . '/bootstrap.php';
restore_exception_handler();
restore_error_handler();

use MOM\Api\Controllers\BaseController;
use MOM\Api\Controllers\ExitException;
use MOM\Api\Controllers\UserController;
use MOM\Database\DataLayer;

function role_docs_smoke_reset_request_state(): void
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

function role_docs_smoke_boot_session(): void
{
    if (session_status() !== PHP_SESSION_ACTIVE) {
        session_init();
    }
}

$roleDocsFile = QMS_TEST_DATA_DIR . '/config/portal_role_docs.json';
$portalConfigJsFile = QMS_TEST_BASE_DIR . '/scripts/portal/01-data-config.js';
$originalExists = is_file($roleDocsFile);
$originalContents = $originalExists ? (string)file_get_contents($roleDocsFile) : '';

try {
    $dataLayer = new DataLayer(QMS_TEST_DATA_DIR, QMS_TEST_ROOT_DIR);
    $store = [
        'settings' => ['require_mfa' => false],
        'users' => [
            ['username' => 'admin-user', 'name' => 'Admin', 'role' => 'qa_manager', 'active' => true],
        ],
    ];

    $bodyProp = new ReflectionProperty(BaseController::class, 'jsonBodyCache');

    role_docs_smoke_reset_request_state();
    role_docs_smoke_boot_session();
    $_SESSION['user'] = 'admin-user';
    $_SESSION['mfa_ok'] = true;
    $_SERVER['REQUEST_METHOD'] = 'GET';
    $getController = (new UserController($dataLayer, QMS_TEST_ROOT_DIR, QMS_TEST_DATA_DIR))->setStore($store);
    try {
        $getController->getPermissions();
        throw new RuntimeException('getPermissions did not return ExitException.');
    } catch (ExitException $e) {
        $payload = $e->getPayload();
        smoke_assert($e->getStatusCode() === 200, 'role_perms_get returned wrong status.');
        smoke_assert(is_array($payload['role_docs'] ?? null), 'role_perms_get must include role_docs payload.');
        smoke_assert(($payload['role_docs']['ceo'] ?? null) === 'ALL', 'role_perms_get must include CEO full document access.');
    }

    role_docs_smoke_reset_request_state();
    role_docs_smoke_boot_session();
    $_SESSION['user'] = 'admin-user';
    $_SESSION['mfa_ok'] = true;
    $_SESSION['csrf'] = 'role-docs-smoke-token';
    $_SERVER['REQUEST_METHOD'] = 'POST';
    $_SERVER['HTTP_X_CSRF_TOKEN'] = 'role-docs-smoke-token';
    $saveController = (new UserController($dataLayer, QMS_TEST_ROOT_DIR, QMS_TEST_DATA_DIR))->setStore($store);
    $bodyProp->setValue($saveController, [
        'perms' => [
            'cnc_operator' => ['canCreateDocs' => false],
        ],
        'role_docs' => [
            'cnc_operator' => [' sop-unit-* ', 'SOP-UNIT-*', ''],
            'qa_manager' => 'ALL',
        ],
    ]);
    try {
        $saveController->savePermissions();
        throw new RuntimeException('savePermissions did not return ExitException.');
    } catch (ExitException $e) {
        $payload = $e->getPayload();
        smoke_assert($e->getStatusCode() === 200, 'admin_role_perms_save returned wrong status.');
        smoke_assert(
            (array)($payload['role_docs']['cnc_operator'] ?? []) === ['SOP-UNIT*'],
            'admin_role_perms_save did not normalize role_docs patterns.'
        );
        smoke_assert(($payload['role_docs']['qa_manager'] ?? null) === 'ALL', 'admin_role_perms_save must preserve ALL role_docs entries.');
    }

    $storedRoleDocs = portal_load_role_docs($portalConfigJsFile, $roleDocsFile);
    smoke_assert(
        (array)($storedRoleDocs['cnc_operator'] ?? []) === ['SOP-UNIT*'],
        'portal_load_role_docs must prefer the persisted authoritative config.'
    );
    smoke_assert(
        portal_can_access_doc(
            ['role' => 'cnc_operator', 'dept' => 'PRO'],
            ['code' => 'SOP-UNIT-001', 'path' => 'mom/docs/operations/sops/sop-unit-001.pdf', 'ext' => 'pdf'],
            $storedRoleDocs,
            [],
            []
        ) === true,
        'portal_can_access_doc must honor the persisted authoritative role_docs config.'
    );
    smoke_assert(
        portal_can_access_doc(
            ['role' => 'cnc_operator', 'dept' => 'PRO'],
            ['code' => 'FRM-UNIT-001', 'path' => 'mom/docs/forms/frm-unit-001.pdf', 'ext' => 'pdf'],
            $storedRoleDocs,
            [],
            []
        ) === false,
        'portal_can_access_doc must deny documents outside the authoritative role_docs patterns.'
    );

    $storedPayload = read_json_file($roleDocsFile);
    smoke_assert(is_array($storedPayload['role_docs'] ?? null), 'portal_role_docs.json must persist a role_docs object.');

    echo "role docs authority smoke passed\n";
} finally {
    if ($originalExists) {
        file_put_contents($roleDocsFile, $originalContents);
    } elseif (is_file($roleDocsFile)) {
        @unlink($roleDocsFile);
    }
}

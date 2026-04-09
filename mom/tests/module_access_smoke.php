<?php

declare(strict_types=1);

require __DIR__ . '/bootstrap.php';

use MOM\Api\Controllers\AdminController;
use MOM\Database\DataLayer;

function module_access_smoke_reset_request_state(): void
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

function module_access_smoke_exit_payload(callable $callback): array
{
    try {
        $callback();
    } catch (\MOM\Api\Controllers\ExitException $e) {
        return [
            'status' => $e->getStatusCode(),
            'payload' => $e->getPayload(),
            'headers' => $e->getHeaders(),
        ];
    } catch (Throwable $e) {
        return [
            'status' => -1,
            'payload' => ['error' => 'unexpected_throwable'],
            'headers' => [],
            'throwable' => get_class($e) . ': ' . $e->getMessage(),
        ];
    }

    throw new RuntimeException('Expected controller call to terminate via ExitException.');
}

try {
    $tmpDataDir = sys_get_temp_dir() . '/mom-module-access-' . bin2hex(random_bytes(6));
    @mkdir($tmpDataDir . '/config', 0775, true);

    $dataLayer = new DataLayer($tmpDataDir, QMS_TEST_ROOT_DIR);
    $store = [
        'settings' => ['require_mfa' => false],
        'users' => [
            ['username' => 'admin-user', 'name' => 'Admin User', 'role' => 'admin', 'active' => true],
            ['username' => 'viewer-user', 'name' => 'Viewer User', 'role' => 'production_planner', 'active' => true],
        ],
    ];

    $controller = (new class($dataLayer, QMS_TEST_ROOT_DIR, $tmpDataDir) extends AdminController {
        protected function jsonBody(): array
        {
            return is_array($GLOBALS['__test_json_body'] ?? null) ? $GLOBALS['__test_json_body'] : [];
        }
    })->setStore($store);

    module_access_smoke_reset_request_state();
    set_authenticated_session('viewer-user', ['role' => 'production_planner']);
    $resp = module_access_smoke_exit_payload(static function () use ($controller): void {
        $controller->getModuleAccessConfig();
    });
    smoke_assert(!isset($resp['throwable']), 'Unexpected throwable on module_access_get: ' . ($resp['throwable'] ?? ''));
    smoke_assert($resp['status'] === 200, 'Authenticated users should be able to read the module access config.');
    smoke_assert(($resp['payload']['config']['portal_modules']['dashboard']['access'] ?? null) === 'all', 'Default module access config should be exposed.');
    smoke_assert(($resp['payload']['config']['portal_modules']['admin']['access'] ?? null) === 'admin', 'Admin portal module should stay admin-only.');

    module_access_smoke_reset_request_state();
    set_authenticated_session('viewer-user', ['role' => 'production_planner']);
    $_SERVER['REQUEST_METHOD'] = 'POST';
    $_SESSION['csrf'] = 'module-access-smoke';
    $_SERVER['HTTP_X_CSRF_TOKEN'] = 'module-access-smoke';
    $GLOBALS['__test_json_body'] = [
        'config' => [
            'portal_modules' => [
                'orders' => ['enabled' => false, 'access' => 'all', 'roles' => []],
            ],
        ],
    ];
    $resp = module_access_smoke_exit_payload(static function () use ($controller): void {
        $controller->saveModuleAccessConfig();
    });
    unset($GLOBALS['__test_json_body']);
    smoke_assert(!isset($resp['throwable']), 'Unexpected throwable on non-admin module access save: ' . ($resp['throwable'] ?? ''));
    smoke_assert($resp['status'] === 403, 'Non-admin users must not save the module access config.');

    module_access_smoke_reset_request_state();
    set_authenticated_session('admin-user', ['role' => 'admin']);
    $_SERVER['REQUEST_METHOD'] = 'POST';
    $_SESSION['csrf'] = 'module-access-smoke';
    $_SERVER['HTTP_X_CSRF_TOKEN'] = 'module-access-smoke';
    $GLOBALS['__test_json_body'] = [
        'config' => [
            'portal_modules' => [
                'orders' => ['enabled' => false, 'access' => 'all', 'roles' => []],
                'purchasing' => ['enabled' => true, 'access' => 'roles', 'roles' => ['buyer', 'warehouse_staff']],
            ],
            'admin_tabs' => [
                'infrastructure' => ['enabled' => true, 'access' => 'roles', 'roles' => ['admin', 'it_admin']],
                'module_access' => ['enabled' => false, 'access' => 'all', 'roles' => []],
            ],
        ],
    ];
    $resp = module_access_smoke_exit_payload(static function () use ($controller): void {
        $controller->saveModuleAccessConfig();
    });
    unset($GLOBALS['__test_json_body']);

    smoke_assert(!isset($resp['throwable']), 'Unexpected throwable on admin module access save: ' . ($resp['throwable'] ?? ''));
    smoke_assert($resp['status'] === 200, 'Admin users should be able to save the module access config.');
    smoke_assert(($resp['payload']['config']['portal_modules']['orders']['enabled'] ?? true) === false, 'Saved config should persist module enablement changes.');
    smoke_assert(($resp['payload']['config']['portal_modules']['purchasing']['roles'][1] ?? null) === 'warehouse_clerk', 'Legacy purchasing roles should normalize when saved.');
    smoke_assert(($resp['payload']['config']['admin_tabs']['infrastructure']['access'] ?? null) === 'roles', 'Admin tab access mode should be persisted.');
    smoke_assert(($resp['payload']['config']['admin_tabs']['module_access']['enabled'] ?? false) === true, 'Locked governance tab must remain enabled.');
    smoke_assert(($resp['payload']['config']['admin_tabs']['module_access']['access'] ?? null) === 'admin', 'Locked governance tab must remain admin-only.');

    $savedFile = read_json_file($tmpDataDir . '/config/module_access_config.json');
    smoke_assert(is_array($savedFile), 'Module access config file should be written to disk.');
    smoke_assert(($savedFile['portal_modules']['orders']['enabled'] ?? true) === false, 'Saved module access file should retain portal module changes.');

    echo "module access smoke passed\n";
} catch (Throwable $e) {
    fwrite(STDERR, $e->getMessage() . PHP_EOL);
    exit(1);
}

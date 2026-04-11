<?php

declare(strict_types=1);

require __DIR__ . '/bootstrap.php';
restore_exception_handler();
restore_error_handler();

ini_set('memory_limit', '1024M');

use MOM\Api\Controllers\AuthController;
use MOM\Api\Controllers\AiSchedulingController;
use MOM\Api\Controllers\AllocationController;
use MOM\Api\Controllers\CiController;
use MOM\Api\Controllers\ComplianceReportController;
use MOM\Api\Controllers\CncProgramController;
use MOM\Api\Controllers\CustomerPortalController;
use MOM\Api\Controllers\DashboardController;
use MOM\Api\Controllers\DocumentController;
use MOM\Api\Controllers\DispatchController;
use MOM\Api\Controllers\ExitException;
use MOM\Api\Controllers\FileController;
use MOM\Api\Controllers\FormController;
use MOM\Api\Controllers\EnergyController;
use MOM\Api\Controllers\GenericCrudController;
use MOM\Api\Controllers\KnowledgeController;
use MOM\Api\Controllers\LogisticsController;
use MOM\Api\Controllers\MobileController;
use MOM\Api\Controllers\MasterDataController;
use MOM\Api\Controllers\ModuleSchemaController;
use MOM\Api\Controllers\ProductPassportController;
use MOM\Api\Controllers\RegistryController;
use MOM\Api\Controllers\SchemaStudioController;
use MOM\Api\Controllers\UserController;
use MOM\Api\Middleware\AuthMiddleware;
use MOM\Api\Middleware\CorsMiddleware;
use MOM\Api\Middleware\RateLimitMiddleware;
use MOM\Api\Router;
use MOM\Api\Services\GenericCrudService;
use MOM\Api\Services\IdempotencyService;
use MOM\Api\Services\RecordConflictException;
use MOM\Api\Services\WorkflowBridgeRequiredException;
use MOM\Database\DataLayer;
use MOM\Services\CustomerPurchaseOrderService;
use MOM\Services\FinanceControlService;
use MOM\Services\OrderService;
use MOM\Services\ShipmentGateService;

function smoke_reset_request_state(): void
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

function smoke_reflection_method(object|string $target, string $method): ReflectionMethod
{
    $reflection = new ReflectionMethod($target, $method);
    if (PHP_VERSION_ID < 80100) {
        $reflection->setAccessible(true);
    }
    return $reflection;
}

function smoke_exit_payload(callable $callback): array
{
    try {
        $callback();
    } catch (ExitException $e) {
        return [
            'status' => $e->getStatusCode(),
            'payload' => $e->getPayload(),
            'headers' => $e->getHeaders(),
            'body' => $e->getBody(),
        ];
    }

    throw new RuntimeException('Expected controller call to terminate via ExitException.');
}

smoke_reset_request_state();

// api_json should unwind through the structured response exception in router mode.
try {
    api_json(['ok' => true, 'hello' => 'world'], 201);
    throw new RuntimeException('api_json did not throw ExitException.');
} catch (ExitException $e) {
    smoke_assert($e->getStatusCode() === 201, 'api_json status code mismatch.');
    smoke_assert(($e->getPayload()['hello'] ?? null) === 'world', 'api_json payload mismatch.');
}

$dataLayer = new DataLayer(QMS_TEST_DATA_DIR, QMS_TEST_ROOT_DIR);
$router = new Router($dataLayer, QMS_TEST_ROOT_DIR, QMS_TEST_DATA_DIR);
$router->action('auth_login', AuthController::class, 'login');
$router->get('/api/meta/catalog', ModuleSchemaController::class, 'apiCatalog');
$router->get('/api/system/contracts', RegistryController::class, 'getSystemContract');

// Legacy action alias should normalize correctly.
smoke_reset_request_state();
$_GET['action'] = 'login';
$resolved = $router->resolve();
smoke_assert($resolved['action'] === 'auth_login', 'Router did not normalize auth alias.');

// REST routes should resolve into the new standardized API surface.
smoke_reset_request_state();
$_SERVER['REQUEST_METHOD'] = 'GET';
$_SERVER['REQUEST_URI'] = '/api/meta/catalog';
$resolved = $router->resolve();
smoke_assert($resolved['action'] === 'GET:/api/meta/catalog', 'Router did not resolve REST route.');

smoke_reset_request_state();
$_SERVER['REQUEST_METHOD'] = 'GET';
$_SERVER['REQUEST_URI'] = '/api/system/contracts';
$resolved = $router->resolve();
smoke_assert($resolved['action'] === 'GET:/api/system/contracts', 'Router did not resolve system contract route.');

// Auth middleware must block protected routes when no session exists.
smoke_reset_request_state();
$auth = new AuthMiddleware(['settings' => []], [
    'enforce_middleware' => true,
    'public_routes' => ['GET /api/auth/status'],
]);
$authHandler = $auth->handler();
try {
    $authHandler('GET:/api/orders/sales', static function (): void {
    });
    throw new RuntimeException('Auth middleware did not block protected route.');
} catch (ExitException $e) {
    smoke_assert($e->getStatusCode() === 401, 'Auth middleware returned wrong status code.');
    smoke_assert(($e->getPayload()['error'] ?? null) === 'unauthorized', 'Auth middleware returned wrong error.');
}

// Public auth status route should pass through.
smoke_reset_request_state();
$passed = false;
$authHandler('GET:/api/auth/status', static function () use (&$passed): void {
    $passed = true;
});
smoke_assert($passed, 'Auth middleware blocked public status route.');

// Preflight requests should terminate via structured empty response.
smoke_reset_request_state();
$_SERVER['REQUEST_METHOD'] = 'OPTIONS';
$_SERVER['HTTP_ORIGIN'] = 'http://localhost:5173';
$cors = new CorsMiddleware(['http://localhost:5173'], ['GET', 'POST', 'OPTIONS'], ['Content-Type'], 600, true);
try {
    $cors->handler()('OPTIONS:/api/orders/sales', static function (): void {
    });
    throw new RuntimeException('CORS middleware did not stop preflight request.');
} catch (ExitException $e) {
    smoke_assert($e->getStatusCode() === 204, 'CORS preflight did not return 204.');
    smoke_assert(($e->getHeaders()['Access-Control-Allow-Origin'] ?? '') === 'http://localhost:5173', 'CORS origin header missing.');
}

// Rate limiting should emit a structured 429 response.
smoke_reset_request_state();
$rateDir = sys_get_temp_dir() . '/qms-backend-smoke-rate';
if (is_dir($rateDir)) {
    foreach (glob($rateDir . '/*.json') ?: [] as $file) {
        @unlink($file);
    }
} else {
    @mkdir($rateDir, 0775, true);
}
$limiter = new RateLimitMiddleware($rateDir, 1, 60);
$rateHandler = $limiter->handler();
$rateHandler('test_action', static function (): void {
});
try {
    $rateHandler('test_action', static function (): void {
    });
    throw new RuntimeException('Rate limiter did not block second request.');
} catch (ExitException $e) {
    smoke_assert($e->getStatusCode() === 429, 'Rate limiter returned wrong status.');
    smoke_assert(($e->getPayload()['error'] ?? null) === 'rate_limited', 'Rate limiter returned wrong error.');
}

// Internal VPS auth_request actions must bypass rate limiting because one page
// view fans out into many subrequests for charts, assets and websocket probes.
$rateHandler('vps_observability_auth', static function (): void {
});
$rateHandler('vps_observability_auth', static function (): void {
});
$rateHandler('vps_terminal_auth', static function (): void {
});
$rateHandler('vps_terminal_auth', static function (): void {
});

$manualRuntimeSummary = build_manual_runtime_summary(
    [
        'customers' => [['customer_id' => 'CUST-001']],
        'parts' => [['part_number' => 'PN-001'], ['part_number' => 'PN-002']],
        'revisions' => [['revision_id' => 'REV-A']],
        'work_centers' => [['work_center_id' => 'WC-01']],
        'machines' => [['machine_id' => 'MC-01']],
        'operators' => [['operator_id' => 'OP-01']],
        '_meta' => ['updated' => '2026-04-10T10:00:00+07:00'],
    ],
    [
        'sales_orders' => [[
            'so_number' => 'SO-2026-0001',
            'customer_name' => 'HESEM',
            'customer_po' => 'PO-001',
            'status' => 'draft',
            'updated_at' => '2026-04-10T10:01:00+07:00',
        ]],
        'job_orders' => [[
            'jo_number' => 'JO-2026-0001',
            'part_number' => 'PN-001',
            'part_revision' => 'A',
            'status' => 'released',
            'updated_at' => '2026-04-10T10:02:00+07:00',
        ]],
        'work_orders' => [[
            'wo_number' => 'WO-2026-000001',
            'operation_number' => 10,
            'operation_desc' => 'Turning',
            'machine_id' => 'MC-01',
            'status' => 'scheduled',
            'updated_at' => '2026-04-10T10:03:00+07:00',
        ]],
        '_meta' => ['updated' => '2026-04-10T10:03:00+07:00'],
    ]
);
smoke_assert(($manualRuntimeSummary['master_counts']['customers'] ?? null) === 1, 'Manual runtime summary should count customers.');
smoke_assert(($manualRuntimeSummary['order_counts']['wo'] ?? null) === 1, 'Manual runtime summary should count work orders.');
smoke_assert((($manualRuntimeSummary['recent_rows'][0] ?? [])['type'] ?? null) === 'WO', 'Manual runtime summary should sort recent rows by updated_at desc.');
smoke_assert(($manualRuntimeSummary['orders_updated_at'] ?? null) === '2026-04-10T10:03:00+07:00', 'Manual runtime summary should expose orders updated timestamp.');

$masterDataFixtureDir = sys_get_temp_dir() . '/qms-master-data-smoke-' . bin2hex(random_bytes(6));
@mkdir($masterDataFixtureDir . '/master-data', 0775, true);
$masterDataService = new \MOM\Services\MasterDataService($masterDataFixtureDir);
$createMasterPart = $masterDataService->create('parts', [
    'part_number' => 'FLG-200',
    'part_description' => 'test',
    'description' => 'test',
    'status' => 'active',
], 'tester');
smoke_assert($createMasterPart->ok, 'MasterDataService should create active part fixture.');
$pendingUpdate = $masterDataService->update('parts', 'FLG-200', [
    'part_description' => 'test2',
    'description' => 'test2',
], 'tester', 'Regression update');
smoke_assert($pendingUpdate->ok, 'MasterDataService should accept update for active part.');
smoke_assert((string)($pendingUpdate->data['status'] ?? '') === 'pending', 'Active part update should queue a pending approval.');
$changeId = (string)($pendingUpdate->data['change_id'] ?? '');
smoke_assert($changeId !== '', 'Pending update should return a change id.');
smoke_assert($masterDataService->approvePendingChange($changeId, 'approver') === true, 'Pending update should be approvable.');
$approvedStore = json_decode((string)file_get_contents($masterDataFixtureDir . '/master-data/master-data.json'), true);
$approvedPending = json_decode((string)file_get_contents($masterDataFixtureDir . '/master-data/master-data-pending.json'), true);
$approvedPart = null;
foreach (($approvedStore['parts'] ?? []) as $row) {
    if (($row['part_number'] ?? '') === 'FLG-200') {
        $approvedPart = $row;
        break;
    }
}
$approvedEntry = null;
foreach (($approvedPending['entries'] ?? []) as $entry) {
    if (($entry['change_id'] ?? '') === $changeId) {
        $approvedEntry = $entry;
        break;
    }
}
smoke_assert(is_array($approvedPart), 'Approved part should remain present in active store.');
smoke_assert(($approvedPart['part_description'] ?? null) === 'test2', 'Approved part should persist canonical part_description.');
smoke_assert(($approvedPart['description'] ?? null) === 'test2', 'Approved part should keep legacy description in sync.');
smoke_assert(($approvedEntry['status'] ?? null) === 'approved', 'Pending entry should be marked approved after approval.');
foreach (glob($masterDataFixtureDir . '/master-data/*') ?: [] as $fixtureFile) {
    @unlink($fixtureFile);
}
@rmdir($masterDataFixtureDir . '/master-data');
@rmdir($masterDataFixtureDir);

$authStore = [
    'settings' => ['require_mfa' => false],
    'users' => [[
        'username' => 'tester',
        'name' => 'Tester',
        'role' => 'admin',
        'active' => true,
    ]],
];

// Auth bootstrap endpoints must reject disallowed cross-origin requests.
smoke_reset_request_state();
$_SERVER['HTTP_ORIGIN'] = 'https://evil.example';
try {
    require_allowed_origin();
    throw new RuntimeException('Origin guard did not block disallowed origin.');
} catch (ExitException $e) {
    smoke_assert($e->getStatusCode() === 403, 'Origin guard returned wrong status.');
    smoke_assert(($e->getPayload()['error'] ?? null) === 'origin_not_allowed', 'Origin guard returned wrong error.');
}

// Document streaming must not allow arbitrary HTML files outside the managed document catalog.
smoke_reset_request_state();
$_SESSION['user'] = 'tester';
$_SESSION['mfa_ok'] = true;
$_SERVER['REQUEST_METHOD'] = 'GET';
$_GET['path'] = 'mom/portal.html';
smoke_assert(is_file(QMS_TEST_BASE_DIR . '/portal.html'), 'portal.html fixture missing.');
$documentController = (new DocumentController($dataLayer, QMS_TEST_ROOT_DIR, QMS_TEST_DATA_DIR))->setStore($authStore);
try {
    $documentController->stream();
    throw new RuntimeException('Document stream allowed an unmanaged portal file.');
} catch (ExitException $e) {
    smoke_assert($e->getStatusCode() === 404, 'Document stream returned wrong status for unmanaged file.');
    smoke_assert(($e->getPayload()['error'] ?? null) === 'doc_not_registered', 'Document stream returned wrong error for unmanaged file.');
}

// Form entry endpoints must reject path-traversal form codes.
smoke_reset_request_state();
$_SESSION['user'] = 'tester';
$_SESSION['mfa_ok'] = true;
$_GET['code'] = '../../config/users';
$formController = (new FormController($dataLayer, QMS_TEST_ROOT_DIR, QMS_TEST_DATA_DIR))->setStore($authStore);
try {
    $formController->getEntries();
    throw new RuntimeException('Form entries endpoint accepted an invalid form code.');
} catch (ExitException $e) {
    smoke_assert($e->getStatusCode() === 400, 'Form code validation returned wrong status.');
    smoke_assert(($e->getPayload()['error'] ?? null) === 'invalid_form_code', 'Form code validation returned wrong error.');
}

// Form version streaming must resolve through the form registry, not raw filesystem paths.
smoke_reset_request_state();
$_SESSION['user'] = 'tester';
$_SESSION['mfa_ok'] = true;
$_SERVER['REQUEST_METHOD'] = 'GET';
$_GET['code'] = 'FRM-TEST';
$_GET['path'] = 'mom/portal.html';
$_GET['id'] = 'latest';
try {
    $formController->streamVersion();
    throw new RuntimeException('Form version stream allowed an unregistered base path.');
} catch (ExitException $e) {
    smoke_assert($e->getStatusCode() === 404, 'Form version stream returned wrong status for unregistered form.');
    smoke_assert(($e->getPayload()['error'] ?? null) === 'form_not_found', 'Form version stream returned wrong error for unregistered form.');
}

// Legacy online-form helpers must reject traversal codes.
smoke_reset_request_state();
try {
    require_existing_online_form('../../config/users');
    throw new RuntimeException('Legacy online-form helper accepted an invalid form code.');
} catch (ExitException $e) {
    smoke_assert($e->getStatusCode() === 400, 'Legacy form helper returned wrong status for invalid code.');
    smoke_assert(($e->getPayload()['error'] ?? null) === 'invalid_form_code', 'Legacy form helper returned wrong error for invalid code.');
}

// Known online-form fixtures should still resolve through the hardened helper.
$resolvedForm = require_existing_online_form('FRM-131');
smoke_assert(($resolvedForm['code'] ?? null) === 'FRM-131', 'Legacy form helper did not resolve existing form fixture.');

// Authenticated sessions should preserve org scope when the user record provides it.
smoke_reset_request_state();
set_authenticated_session('scoped-user', [
    'org_company_code' => 'HESEM',
    'org_legal_entity_code' => 'VN01',
    'org_plant_id' => 'PLANT01',
    'org_site_id' => 'SITE01',
]);
smoke_assert(($_SESSION['user_scope']['org_company_code'] ?? null) === 'HESEM', 'Authenticated session did not retain user scope.');
smoke_assert(($_SESSION['org_scope']['org_site_id'] ?? null) === 'SITE01', 'Authenticated session did not retain org scope mirror.');
smoke_assert((sanitize_user_for_client([
    'username' => 'scoped-user',
    'org_company_code' => 'HESEM',
    'org_legal_entity_code' => 'VN01',
    'org_plant_id' => 'PLANT01',
    'org_site_id' => 'SITE01',
])['org_plant_id'] ?? null) === 'PLANT01', 'Sanitized user payload did not expose org scope fields.');

$rolePermsFile = QMS_TEST_DATA_DIR . '/config/role_permissions.json';
smoke_assert(user_permission_matrix_configured(['role' => 'finance_manager'], $rolePermsFile) === true, 'Finance manager should be governed by the permission matrix.');
smoke_assert(user_has_any_permission(['role' => 'finance_manager'], ['finance.ap_ar_invoices.read'], $rolePermsFile) === true, 'Finance manager should have finance read permission.');
smoke_assert(user_has_any_permission(['role' => 'finance_manager'], ['advanced_planning.aps_planning_scenarios.update'], $rolePermsFile) === false, 'Finance manager should not inherit planning write permission.');
smoke_assert(user_has_any_permission(['role' => 'qms_engineer'], ['registry.read'], $rolePermsFile) === true, 'QMS engineer should have registry read permission.');
smoke_assert(user_has_any_permission(['role' => 'production_planner'], ['advanced_planning.aps_planning_scenarios.update'], $rolePermsFile) === true, 'Production planner should retain APS write permission.');
smoke_assert(user_has_any_permission(['role' => 'developer'], ['schema_studio.write'], $rolePermsFile) === true, 'Developer should retain Schema Studio write permission.');

$genericPermissionStore = [
    'settings' => ['require_mfa' => false],
    'users' => [[
        'username' => 'qms-runtime-user',
        'name' => 'QMS Runtime',
        'role' => 'qms_engineer',
        'active' => true,
    ]],
];
smoke_reset_request_state();
$_SESSION['user'] = 'qms-runtime-user';
$_SESSION['mfa_ok'] = true;
$_SESSION['csrf'] = 'smoke-token';
$_SERVER['REQUEST_METHOD'] = 'POST';
$_SERVER['HTTP_X_CSRF_TOKEN'] = 'smoke-token';
$_GET['domain'] = 'finance';
$_GET['table'] = 'ap_ar_invoices';
$genericCrudController = (new GenericCrudController($dataLayer, QMS_TEST_ROOT_DIR, QMS_TEST_DATA_DIR))->setStore($genericPermissionStore);
try {
    $genericCrudController->createRecord();
    throw new RuntimeException('Generic CRUD create allowed a cross-domain write without permission.');
} catch (ExitException $e) {
    smoke_assert($e->getStatusCode() === 403, 'Generic CRUD permission gate returned wrong status.');
    smoke_assert(($e->getPayload()['error'] ?? null) === 'forbidden', 'Generic CRUD permission gate returned wrong error.');
}

// Customer portal administration must not be exposed to arbitrary internal users.
$portalStore = [
    'settings' => ['require_mfa' => false],
    'users' => [[
        'username' => 'operator-user',
        'name' => 'Operator',
        'role' => 'operator',
        'active' => true,
    ]],
];
smoke_reset_request_state();
$_SESSION['user'] = 'operator-user';
$_SESSION['mfa_ok'] = true;
$customerPortalController = (new CustomerPortalController($dataLayer, QMS_TEST_ROOT_DIR, QMS_TEST_DATA_DIR))->setStore($portalStore);
try {
    $customerPortalController->listUsers();
    throw new RuntimeException('Customer portal user list allowed an unauthorized internal role.');
} catch (ExitException $e) {
    smoke_assert($e->getStatusCode() === 403, 'Customer portal guard returned wrong status.');
    smoke_assert(($e->getPayload()['error'] ?? null) === 'forbidden', 'Customer portal guard returned wrong error.');
}

// The compatibility admin payload should stay available for the legacy portal admin UI.
$portalAdminStore = [
    'settings' => ['require_mfa' => false],
    'users' => [[
        'username' => 'sales-manager',
        'name' => 'Sales Manager',
        'role' => 'sales_manager',
        'active' => true,
    ]],
];
smoke_reset_request_state();
$_SESSION['user'] = 'sales-manager';
$_SESSION['mfa_ok'] = true;
$customerPortalAdminController = (new CustomerPortalController($dataLayer, QMS_TEST_ROOT_DIR, QMS_TEST_DATA_DIR))->setStore($portalAdminStore);
try {
    $customerPortalAdminController->getAdminData();
    throw new RuntimeException('Customer portal admin payload did not terminate through the response pipeline.');
} catch (ExitException $e) {
    smoke_assert($e->getStatusCode() === 200, 'Customer portal admin payload returned wrong status.');
    smoke_assert(is_array($e->getPayload()['users'] ?? null), 'Customer portal admin payload missing users array.');
    smoke_assert(is_array($e->getPayload()['order_views'] ?? null), 'Customer portal admin payload missing order_views array.');
    smoke_assert(is_array($e->getPayload()['analytics'] ?? null), 'Customer portal admin payload missing analytics.');
}

// File management must resolve source documents through the managed catalog, not arbitrary paths.
$fileStore = [
    'settings' => ['require_mfa' => false],
    'users' => [[
        'username' => 'doc-owner',
        'name' => 'QA Manager',
        'role' => 'qa_manager',
        'active' => true,
    ]],
];
$fileController = (new FileController($dataLayer, QMS_TEST_ROOT_DIR, QMS_TEST_DATA_DIR))->setStore($fileStore);
$resolveManagedDocument = smoke_reflection_method($fileController, 'resolveManagedDocumentRecord');
try {
    $resolveManagedDocument->invoke($fileController, 'PORTAL', 'mom/portal.html');
    throw new RuntimeException('File controller resolved an unmanaged source document path.');
} catch (ExitException $e) {
    smoke_assert($e->getStatusCode() === 404, 'File controller guard returned wrong status for unmanaged path.');
    smoke_assert(($e->getPayload()['error'] ?? null) === 'doc_not_registered', 'File controller guard returned wrong error for unmanaged path.');
}

// Registry writes must not be exposed to arbitrary authenticated users.
smoke_reset_request_state();
$_SESSION['user'] = 'operator-user';
$_SESSION['mfa_ok'] = true;
$registryController = (new RegistryController($dataLayer, QMS_TEST_ROOT_DIR, QMS_TEST_DATA_DIR))->setStore($portalStore);
try {
    $registryController->updateRegistry();
    throw new RuntimeException('Registry update allowed an unauthorized user.');
} catch (ExitException $e) {
    smoke_assert($e->getStatusCode() === 403, 'Registry guard returned wrong status.');
    smoke_assert(($e->getPayload()['error'] ?? null) === 'forbidden', 'Registry guard returned wrong error.');
}

// Registry reads must now be limited to explicit metadata-governance permissions.
$financeStore = [
    'settings' => ['require_mfa' => false],
    'users' => [[
        'username' => 'finance-user',
        'name' => 'Finance Manager',
        'role' => 'finance_manager',
        'org_company_code' => 'HESEM',
        'org_legal_entity_code' => 'HESEM-VN',
        'org_plant_id' => 'PLANT01',
        'org_site_id' => 'SITE01',
        'active' => true,
    ]],
];

$permissionAdminStore = [
    'settings' => ['require_mfa' => false],
    'users' => [[
        'username' => 'perm-admin',
        'name' => 'QA Admin',
        'role' => 'qa_manager',
        'active' => true,
    ]],
];
smoke_reset_request_state();
$_SESSION['user'] = 'finance-user';
$_SESSION['mfa_ok'] = true;
$restrictedRegistryController = (new RegistryController($dataLayer, QMS_TEST_ROOT_DIR, QMS_TEST_DATA_DIR))->setStore($financeStore);
try {
    $restrictedRegistryController->getIotConnectors();
    throw new RuntimeException('Registry read allowed an unrelated office role.');
} catch (ExitException $e) {
    smoke_assert($e->getStatusCode() === 403, 'Registry read guard returned wrong status.');
    smoke_assert(($e->getPayload()['error'] ?? null) === 'forbidden', 'Registry read guard returned wrong error.');
}

smoke_reset_request_state();
$_SESSION['user'] = 'qms-runtime-user';
$_SESSION['mfa_ok'] = true;
$systemContractController = (new RegistryController($dataLayer, QMS_TEST_ROOT_DIR, QMS_TEST_DATA_DIR))->setStore($genericPermissionStore);
$systemContractResponse = smoke_exit_payload(static function () use ($systemContractController): void {
    $systemContractController->getSystemContract();
});
$systemContractPayload = $systemContractResponse['payload'];
smoke_assert(($systemContractResponse['status'] ?? null) === 200, 'System contract endpoint should return 200 for registry readers.');
smoke_assert((int)($systemContractPayload['summary']['tableCount'] ?? 0) >= 600, 'System contract should expose the full table registry.');
smoke_assert((int)($systemContractPayload['summary']['endpointCount'] ?? 0) >= 3000, 'System contract should expose the endpoint catalog.');
smoke_assert((int)($systemContractPayload['summary']['globalCapabilityCount'] ?? 0) >= 15, 'System contract should expose global ERP+MOM capability audit coverage.');

$builderStore = [
    'settings' => ['require_mfa' => false],
    'users' => [[
        'username' => 'builder-user',
        'name' => 'QMS Engineer',
        'role' => 'qms_engineer',
        'active' => true,
    ]],
];

// Module schema writes must be limited to platform-builder roles.
smoke_reset_request_state();
$_SESSION['user'] = 'operator-user';
$_SESSION['mfa_ok'] = true;
$moduleSchemaController = (new ModuleSchemaController($dataLayer, QMS_TEST_ROOT_DIR, QMS_TEST_DATA_DIR))->setStore($portalStore);
try {
    $moduleSchemaController->saveSchema();
    throw new RuntimeException('Module schema save allowed an unauthorized user.');
} catch (ExitException $e) {
    smoke_assert($e->getStatusCode() === 403, 'Module schema guard returned wrong status.');
    smoke_assert(($e->getPayload()['error'] ?? null) === 'forbidden', 'Module schema guard returned wrong error.');
}

// Module schema reads must now be limited to explicit builder permissions.
smoke_reset_request_state();
$_SESSION['user'] = 'finance-user';
$_SESSION['mfa_ok'] = true;
$restrictedModuleSchemaController = (new ModuleSchemaController($dataLayer, QMS_TEST_ROOT_DIR, QMS_TEST_DATA_DIR))->setStore($financeStore);
try {
    $restrictedModuleSchemaController->listSchemas();
    throw new RuntimeException('Module schema list allowed an unrelated office role.');
} catch (ExitException $e) {
    smoke_assert($e->getStatusCode() === 403, 'Module schema read guard returned wrong status.');
    smoke_assert(($e->getPayload()['error'] ?? null) === 'forbidden', 'Module schema read guard returned wrong error.');
}

smoke_reset_request_state();
$_SESSION['user'] = 'builder-user';
$_SESSION['mfa_ok'] = true;
$allowedModuleSchemaController = (new ModuleSchemaController($dataLayer, QMS_TEST_ROOT_DIR, QMS_TEST_DATA_DIR))->setStore($builderStore);
try {
    $allowedModuleSchemaController->listSchemas();
    throw new RuntimeException('Module schema list did not terminate through the response pipeline.');
} catch (ExitException $e) {
    smoke_assert($e->getStatusCode() === 200, 'Module schema read returned wrong status for builder role.');
    smoke_assert(is_array($e->getPayload()['schemas'] ?? null), 'Module schema read payload missing schemas array.');
}

// Schema Studio must require explicit builder/governance permissions for both read and write surfaces.
smoke_reset_request_state();
session_init();
$_SESSION['user'] = 'finance-user';
$_SESSION['mfa_ok'] = true;
$_SESSION['csrf'] = 'schema-smoke-token';
$_SERVER['REQUEST_METHOD'] = 'POST';
$_SERVER['HTTP_X_CSRF_TOKEN'] = 'schema-smoke-token';
$restrictedSchemaStudioController = (new SchemaStudioController($dataLayer, QMS_TEST_ROOT_DIR, QMS_TEST_DATA_DIR))->setStore($financeStore);
try {
    $restrictedSchemaStudioController->listDesigns();
    throw new RuntimeException('Schema Studio list allowed an unrelated office role.');
} catch (ExitException $e) {
    smoke_assert($e->getStatusCode() === 403, 'Schema Studio read guard returned wrong status.');
    smoke_assert(($e->getPayload()['error'] ?? null) === 'forbidden', 'Schema Studio read guard returned wrong error.');
}

smoke_reset_request_state();
session_init();
$_SESSION['user'] = 'builder-user';
$_SESSION['mfa_ok'] = true;
$_SESSION['csrf'] = 'schema-smoke-token';
$_SERVER['REQUEST_METHOD'] = 'POST';
$_SERVER['HTTP_X_CSRF_TOKEN'] = 'schema-smoke-token';
$allowedSchemaStudioController = (new SchemaStudioController($dataLayer, QMS_TEST_ROOT_DIR, QMS_TEST_DATA_DIR))->setStore($builderStore);
try {
    $allowedSchemaStudioController->listDesigns();
    throw new RuntimeException('Schema Studio list did not terminate through the response pipeline.');
} catch (ExitException $e) {
    smoke_assert($e->getStatusCode() === 200, 'Schema Studio read returned wrong status for builder role.');
    $designs = $e->getPayload()['designs'] ?? null;
    smoke_assert(is_array($designs), 'Schema Studio read payload missing designs array.');
    $designIds = array_map(static fn(array $design): string => (string)($design['id'] ?? ''), array_values(array_filter((array)$designs, 'is_array')));
    smoke_assert(in_array('workspace', $designIds, true), 'Schema Studio should expose workspace as the editable design layer.');
    smoke_assert(in_array('system_contract_registry', $designIds, true), 'Schema Studio should expose the full system contract registry as a real read-only schema layer.');
    $registryDesign = null;
    foreach ((array)$designs as $design) {
        if (is_array($design) && (string)($design['id'] ?? '') === 'system_contract_registry') {
            $registryDesign = $design;
            break;
        }
    }
    smoke_assert(is_array($registryDesign), 'Schema Studio registry design summary should be available.');
    smoke_assert(!empty($registryDesign['readOnly']), 'System contract registry design should be read-only.');
    smoke_assert((int)($registryDesign['tableCount'] ?? 0) >= 600, 'System contract registry design should expose full platform table coverage.');
}

smoke_reset_request_state();
session_init();
$_SESSION['user'] = 'builder-user';
$_SESSION['mfa_ok'] = true;
$_SESSION['csrf'] = 'schema-smoke-token';
$_SERVER['REQUEST_METHOD'] = 'POST';
$_SERVER['HTTP_X_CSRF_TOKEN'] = 'schema-smoke-token';
$_GET['id'] = 'system_contract_registry';
$registrySchemaStudioController = (new SchemaStudioController($dataLayer, QMS_TEST_ROOT_DIR, QMS_TEST_DATA_DIR))->setStore($builderStore);
try {
    $registrySchemaStudioController->getDesign();
    throw new RuntimeException('Schema Studio registry design did not terminate through the response pipeline.');
} catch (ExitException $e) {
    smoke_assert($e->getStatusCode() === 200, 'Schema Studio registry getDesign returned wrong status.');
    $schema = $e->getPayload()['schema'] ?? null;
    smoke_assert(is_array($schema), 'Schema Studio registry getDesign should return a schema document.');
    smoke_assert((string)(($schema['_meta'] ?? [])['id'] ?? '') === 'system_contract_registry', 'Schema Studio registry getDesign should preserve the registry design id.');
    smoke_assert(!empty(($schema['_meta'] ?? [])['readOnly']), 'Schema Studio registry getDesign should mark the schema read-only.');
    smoke_assert(count((array)($schema['tables'] ?? [])) >= 600, 'Schema Studio registry getDesign should expose full platform table coverage.');
}

smoke_reset_request_state();
session_init();
$_SESSION['user'] = 'builder-user';
$_SESSION['mfa_ok'] = true;
$_SESSION['csrf'] = 'schema-smoke-token';
$_SERVER['REQUEST_METHOD'] = 'POST';
$_SERVER['HTTP_X_CSRF_TOKEN'] = 'schema-smoke-token';
$releaseGateSchemaStudioController = (new SchemaStudioController($dataLayer, QMS_TEST_ROOT_DIR, QMS_TEST_DATA_DIR))->setStore($builderStore);
try {
    $releaseGateSchemaStudioController->createReleaseBundle();
    throw new RuntimeException('Schema Studio release bundle accepted a write without revision tokens.');
} catch (ExitException $e) {
    smoke_assert($e->getStatusCode() === 409, 'Schema Studio release gate returned wrong status.');
    $releaseError = (string)($e->getPayload()['error'] ?? '');
    smoke_assert(in_array($releaseError, ['missing_design_revision_token', 'release_gate_blocked'], true), 'Schema Studio release action should reject writes before bundle creation, either on operational release gate or missing revision tokens.');
    if ($releaseError === 'missing_design_revision_token') {
        smoke_assert(is_array($e->getPayload()['current_revisions'] ?? null), 'Schema Studio release action should expose current revision fingerprints when the workspace token is missing.');
    } else {
        smoke_assert(is_array($e->getPayload()['release_gate'] ?? null), 'Schema Studio release gate must expose blocking operational details when release bundling is blocked earlier.');
    }
}

// Schema Studio DB-backed surfaces must now be limited to DB-admin roles, not generic schema editors.
$schemaStudioGuardController = (new SchemaStudioController($dataLayer, QMS_TEST_ROOT_DIR, QMS_TEST_DATA_DIR))->setStore($builderStore);
$schemaStudioDbGuard = smoke_reflection_method($schemaStudioGuardController, 'requireDatabaseAccess');
try {
    $schemaStudioDbGuard->invoke($schemaStudioGuardController, ['role' => 'qms_engineer']);
    throw new RuntimeException('Schema Studio DB access guard allowed a non-DB-admin builder role.');
} catch (ExitException $e) {
    smoke_assert($e->getStatusCode() === 403, 'Schema Studio DB access guard returned wrong status for builder role.');
}

$schemaStudioDbGuard->invoke($schemaStudioGuardController, ['role' => 'developer']);

// AI scheduling write endpoints must be restricted to scheduling/quality roles.
smoke_reset_request_state();
$_SESSION['user'] = 'operator-user';
$_SESSION['mfa_ok'] = true;
$aiController = (new AiSchedulingController($dataLayer, QMS_TEST_ROOT_DIR, QMS_TEST_DATA_DIR))->setStore($portalStore);
try {
    $aiController->acknowledgePrediction();
    throw new RuntimeException('AI prediction acknowledge allowed an unauthorized user.');
} catch (ExitException $e) {
    smoke_assert($e->getStatusCode() === 403, 'AI write guard returned wrong status.');
    smoke_assert(($e->getPayload()['error'] ?? null) === 'forbidden', 'AI write guard returned wrong error.');
}

// Compliance evidence packages must not be readable by arbitrary authenticated users.
smoke_reset_request_state();
$_SESSION['user'] = 'operator-user';
$_SESSION['mfa_ok'] = true;
$_GET['so_number'] = 'SO-TEST-001';
$complianceController = (new ComplianceReportController($dataLayer, QMS_TEST_ROOT_DIR, QMS_TEST_DATA_DIR))->setStore($portalStore);
try {
    $complianceController->getEvidencePackage();
    throw new RuntimeException('Compliance evidence package allowed an unauthorized user.');
} catch (ExitException $e) {
    smoke_assert($e->getStatusCode() === 403, 'Compliance report guard returned wrong status.');
    smoke_assert(($e->getPayload()['error'] ?? null) === 'forbidden', 'Compliance report guard returned wrong error.');
}

// CI project mutations must not be exposed to arbitrary operators.
smoke_reset_request_state();
$_SESSION['user'] = 'operator-user';
$_SESSION['mfa_ok'] = true;
$ciController = (new CiController($dataLayer, QMS_TEST_ROOT_DIR, QMS_TEST_DATA_DIR))->setStore($portalStore);
try {
    $ciController->createProject();
    throw new RuntimeException('CI project creation allowed an unauthorized operator.');
} catch (ExitException $e) {
    smoke_assert($e->getStatusCode() === 403, 'CI guard returned wrong status.');
    smoke_assert(($e->getPayload()['error'] ?? null) === 'forbidden', 'CI guard returned wrong error.');
}

// CNC program mutations must be restricted to engineering / release roles.
smoke_reset_request_state();
$_SESSION['user'] = 'operator-user';
$_SESSION['mfa_ok'] = true;
$cncController = (new CncProgramController($dataLayer, QMS_TEST_ROOT_DIR, QMS_TEST_DATA_DIR))->setStore($portalStore);
try {
    $cncController->create();
    throw new RuntimeException('CNC program create allowed an unauthorized operator.');
} catch (ExitException $e) {
    smoke_assert($e->getStatusCode() === 403, 'CNC guard returned wrong status.');
    smoke_assert(($e->getPayload()['error'] ?? null) === 'forbidden', 'CNC guard returned wrong error.');
}

// Product passport creation must be restricted to controlled records roles.
smoke_reset_request_state();
$_SESSION['user'] = 'operator-user';
$_SESSION['mfa_ok'] = true;
$passportController = (new ProductPassportController($dataLayer, QMS_TEST_ROOT_DIR, QMS_TEST_DATA_DIR))->setStore($portalStore);
try {
    $passportController->create();
    throw new RuntimeException('Product passport creation allowed an unauthorized operator.');
} catch (ExitException $e) {
    smoke_assert($e->getStatusCode() === 403, 'Product passport guard returned wrong status.');
    smoke_assert(($e->getPayload()['error'] ?? null) === 'forbidden', 'Product passport guard returned wrong error.');
}

// Mobile shop-floor APIs must not be exposed to unrelated office roles.
smoke_reset_request_state();
$_SESSION['user'] = 'finance-user';
$_SESSION['mfa_ok'] = true;
$mobileController = (new MobileController($dataLayer, QMS_TEST_ROOT_DIR, QMS_TEST_DATA_DIR))->setStore($financeStore);
try {
    $mobileController->getMyQueue();
    throw new RuntimeException('Mobile queue allowed an unrelated office role.');
} catch (ExitException $e) {
    smoke_assert($e->getStatusCode() === 403, 'Mobile guard returned wrong status.');
    smoke_assert(($e->getPayload()['error'] ?? null) === 'forbidden', 'Mobile guard returned wrong error.');
}

// Master data mutations must not be exposed to arbitrary authenticated users.
smoke_reset_request_state();
$_SESSION['user'] = 'operator-user';
$_SESSION['mfa_ok'] = true;
$masterDataController = (new MasterDataController($dataLayer, QMS_TEST_ROOT_DIR, QMS_TEST_DATA_DIR))->setStore($portalStore);
try {
    $masterDataController->createRecord();
    throw new RuntimeException('Master data create allowed an unauthorized operator.');
} catch (ExitException $e) {
    smoke_assert($e->getStatusCode() === 403, 'Master data guard returned wrong status.');
    smoke_assert(($e->getPayload()['error'] ?? null) === 'forbidden', 'Master data guard returned wrong error.');
}

$rolePermFile = QMS_TEST_DATA_DIR . '/config/role_permissions.json';
smoke_assert(permission_matrix_manages_permission('quality_management.capa_records.create', $rolePermFile), 'Permission matrix must manage generic quality write permissions.');
smoke_assert(user_has_any_permission(['role' => 'qms_engineer'], 'quality_management.capa_records.create', $rolePermFile), 'QMS engineer should retain quality domain generic write permission.');
smoke_assert(!user_has_any_permission(['role' => 'finance_manager'], 'quality_management.capa_records.create', $rolePermFile), 'Finance manager must not receive quality domain generic write permission.');
smoke_assert(user_permission_matrix_configured(['role' => 'quality_engineer'], $rolePermFile), 'Quality engineer should now be governed directly by the permission matrix.');
smoke_assert(user_has_any_permission(['role' => 'quality_engineer'], 'quality_management.capa_records.update', $rolePermFile), 'Quality engineer should retain quality update permission through the matrix.');
smoke_assert(user_permission_matrix_configured(['role' => 'shift_leader'], $rolePermFile), 'Shift leader should now be governed directly by the permission matrix.');
smoke_assert(user_has_any_permission(['role' => 'shift_leader'], 'advanced_planning.aps_planning_scenarios.read', $rolePermFile), 'Shift leader should receive planning read permission through the matrix.');
smoke_assert(!user_has_any_permission(['role' => 'shift_leader'], 'advanced_planning.aps_planning_scenarios.update', $rolePermFile), 'Shift leader must not inherit planning mutation permission.');
smoke_assert(user_permission_matrix_configured(['role' => 'buyer'], $rolePermFile), 'Buyer should now be governed directly by the permission matrix.');
smoke_assert(user_has_any_permission(['role' => 'buyer'], 'purchasing.purchase_orders.read', $rolePermFile), 'Buyer should receive purchasing read permission through the matrix.');
smoke_assert(user_has_any_permission(['role' => 'buyer'], 'purchasing.purchase_orders.create', $rolePermFile), 'Buyer should be able to create purchase orders through the matrix.');
smoke_assert(user_has_any_permission(['role' => 'buyer'], 'purchasing.purchase_orders.update', $rolePermFile), 'Buyer should be able to update purchase orders through the matrix.');
smoke_assert(user_has_any_permission(['role' => 'warehouse_clerk'], 'quality_management.incoming_inspections.transition', $rolePermFile), 'Warehouse clerk should be able to transition incoming inspections through the matrix.');
smoke_assert(user_has_any_permission(['role' => 'logistics_coordinator'], 'purchasing.purchase_orders.transition', $rolePermFile), 'Logistics coordinator should be able to transition purchase orders through the matrix.');
smoke_assert(user_permission_matrix_configured(['role' => 'internal_auditor'], $rolePermFile), 'Internal auditor should be marked as managed even without generic CRUD grants.');
smoke_assert(!user_has_any_permission(['role' => 'internal_auditor'], 'audit_risk.audit_programs.read', $rolePermFile), 'Internal auditor should not inherit generic CRUD access by fallback.');
smoke_assert(user_permission_matrix_configured(['role' => 'deburr_team_lead'], $rolePermFile), 'Deburr team lead should be marked as managed even without generic CRUD grants.');
smoke_assert(!user_has_any_permission(['role' => 'deburr_team_lead'], 'production.work_orders.read', $rolePermFile), 'Deburr team lead should not inherit generic production CRUD access by fallback.');
smoke_assert(!user_has_any_permission(['role' => 'qms_engineer'], 'foundation_governance.org_companies.read', $rolePermFile), 'QMS engineer must not inherit generic governance-table access.');
smoke_assert(!user_has_any_permission(['role' => 'qms_engineer'], 'forms_system.form_definitions.read', $rolePermFile), 'QMS engineer must not inherit generic forms-system access.');
smoke_assert(!user_has_any_permission(['role' => 'finance_manager'], 'finance.ap_ar_invoices.delete', $rolePermFile), 'Finance manager must not inherit generic delete permission.');
smoke_assert(!user_has_any_permission(['role' => 'production_planner'], 'advanced_planning.aps_planning_scenarios.delete', $rolePermFile), 'Production planner must not inherit generic delete permission.');
smoke_assert(user_has_any_permission(['role' => 'developer'], 'schema_studio.write', $rolePermFile), 'Developer must retain Schema Studio write permission.');
smoke_assert(user_has_any_permission(['role' => 'qms_engineer'], 'schema_studio.write', $rolePermFile), 'QMS engineer must retain Schema Studio write permission.');

smoke_reset_request_state();
$_SESSION['user'] = 'finance-user';
$_SESSION['mfa_ok'] = true;
$restrictedUserController = (new UserController($dataLayer, QMS_TEST_ROOT_DIR, QMS_TEST_DATA_DIR))->setStore($financeStore);
try {
    $restrictedUserController->getPermissions();
    throw new RuntimeException('Permission matrix read allowed a non-admin office role.');
} catch (ExitException $e) {
    smoke_assert($e->getStatusCode() === 403, 'Permission matrix read guard returned wrong status for non-admin role.');
    smoke_assert(($e->getPayload()['error'] ?? null) === 'forbidden', 'Permission matrix read guard returned wrong error for non-admin role.');
}

smoke_reset_request_state();
$_SESSION['user'] = 'perm-admin';
$_SESSION['mfa_ok'] = true;
$allowedUserController = (new UserController($dataLayer, QMS_TEST_ROOT_DIR, QMS_TEST_DATA_DIR))->setStore($permissionAdminStore);
try {
    $allowedUserController->getPermissions();
    throw new RuntimeException('Permission matrix read did not terminate through the response pipeline for admin role.');
} catch (ExitException $e) {
    smoke_assert($e->getStatusCode() === 200, 'Permission matrix read returned wrong status for admin role.');
    smoke_assert(is_array($e->getPayload()['perms'] ?? null), 'Permission matrix read payload missing perms array.');
}

$adminGenericCrudController = (new GenericCrudController($dataLayer, QMS_TEST_ROOT_DIR, QMS_TEST_DATA_DIR))->setStore($permissionAdminStore);
$genericPermissionGuard = smoke_reflection_method($adminGenericCrudController, 'enforceRuntimePermission');
try {
    $genericPermissionGuard->invoke($adminGenericCrudController, ['role' => 'qa_manager'], [
        'domain' => 'core_system',
        'table' => 'audit_events',
        'kind' => 'delete',
        'tableMeta' => [
            'domain' => 'core_system',
            'supportTable' => false,
        ],
    ]);
    throw new RuntimeException('Runtime policy kill-switch allowed admin delete on audit_events.');
} catch (ExitException $e) {
    smoke_assert($e->getStatusCode() === 403, 'Runtime policy kill-switch returned wrong status for admin delete.');
    smoke_assert(($e->getPayload()['error'] ?? null) === 'forbidden', 'Runtime policy kill-switch returned wrong error for admin delete.');
}

$workflowBridgeFailureHandler = smoke_reflection_method($adminGenericCrudController, 'handleCrudFailure');
try {
    $workflowBridgeFailureHandler->invoke($adminGenericCrudController, new WorkflowBridgeRequiredException('workflow engine required'), 'generic_transition_failed');
    throw new RuntimeException('Workflow bridge failure did not terminate through the response pipeline.');
} catch (ExitException $e) {
    smoke_assert($e->getStatusCode() === 409, 'Workflow bridge failure must return conflict status.');
    smoke_assert(($e->getPayload()['error'] ?? null) === 'workflow_engine_required', 'Workflow bridge failure must return workflow_engine_required.');
}

$genericCrudService = new GenericCrudService(QMS_TEST_DATA_DIR);
$workflowRuntimeGuard = smoke_reflection_method($genericCrudService, 'assertTransitionRuntimeSupported');
$persistedRuntime = $workflowRuntimeGuard->invoke($genericCrudService, 'quality_management', 'capa_records', [
    'workflowId' => 'wf_capa',
    'statusColumn' => 'capa_status',
    'columns' => [
        'record_id' => [],
        'source_record_id' => [],
        'capa_status' => [],
    ],
]);
smoke_assert(($persistedRuntime['lifecycle_mode'] ?? null) === 'persisted', 'Persisted workflow runtime guard should preserve the persisted lifecycle mode.');
smoke_assert((($persistedRuntime['engine_bridge'] ?? [])['ready'] ?? false) === true, 'Persisted workflow runtime guard should report the workflow-engine bridge as ready for CAPA.');
smoke_assert(($persistedRuntime['transition_execution_guard'] ?? null) === 'workflow_engine', 'Persisted workflow runtime guard should still route CAPA transitions through the workflow engine.');
$filterWritableColumns = smoke_reflection_method($genericCrudService, 'filterWritableColumns');
$filteredPersistedUpdate = $filterWritableColumns->invoke($genericCrudService, [
    'statusColumn' => 'capa_status',
    'columns' => [
        'capa_status' => ['type' => 'varchar'],
        'title' => ['type' => 'varchar'],
    ],
    'primaryKey' => 'capa_id',
], [
    'capa_status' => 'closed',
    'title' => 'Retain me',
], true);
smoke_assert(!array_key_exists('capa_status', (array)$filteredPersistedUpdate), 'Generic update payload filtering must strip managed status fields.');
smoke_assert(($filteredPersistedUpdate['title'] ?? null) === 'Retain me', 'Generic update payload filtering must preserve non-status writable fields.');
$idempotencyTempDir = sys_get_temp_dir() . '/qms-backend-smoke-idempotency';
if (is_dir($idempotencyTempDir)) {
    $idempotencyIterator = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($idempotencyTempDir, FilesystemIterator::SKIP_DOTS),
        RecursiveIteratorIterator::CHILD_FIRST
    );
    foreach ($idempotencyIterator as $idempotencyEntry) {
        if ($idempotencyEntry->isDir()) {
            rmdir($idempotencyEntry->getPathname());
            continue;
        }
        unlink($idempotencyEntry->getPathname());
    }
    rmdir($idempotencyTempDir);
}
mkdir($idempotencyTempDir . '/data', 0775, true);
$idempotencyService = new IdempotencyService($idempotencyTempDir . '/data');
$callbackExecutions = 0;
$idempotencyDescriptor = [
    'scope_key' => 'generic_crud|update|quality_management|capa_records|smoke',
    'key' => 'smoke-retry-001',
    'key_source' => 'header:Idempotency-Key',
    'mode' => 'client_token',
    'kind' => 'update',
    'domain' => 'quality_management',
    'table' => 'capa_records',
    'user_id' => 'smoke-user',
    'fingerprint' => [
        'id' => 'CAPA-001',
        'expected_row_version' => 5,
        'payload' => [
            'title' => 'Containment',
        ],
    ],
];
$firstIdempotentResult = $idempotencyService->execute($idempotencyDescriptor, static function () use (&$callbackExecutions): array {
    $callbackExecutions++;
    return [
        'status_code' => 200,
        'payload' => [
            'record' => [
                'capa_id' => 'CAPA-001',
                'row_version' => 6,
                'title' => 'Containment',
            ],
        ],
    ];
});
smoke_assert($callbackExecutions === 1, 'Idempotency runtime must execute the first mutation exactly once.');
smoke_assert(($firstIdempotentResult['replayed'] ?? true) === false, 'Idempotency runtime must mark the first execution as non-replayed.');
$secondIdempotentResult = $idempotencyService->execute($idempotencyDescriptor, static function (): array {
    throw new RuntimeException('Idempotency replay should not re-execute the callback.');
});
smoke_assert($callbackExecutions === 1, 'Idempotency replay must not re-execute the callback.');
smoke_assert(($secondIdempotentResult['replayed'] ?? false) === true, 'Idempotency runtime must replay a matching duplicate request.');
smoke_assert((($secondIdempotentResult['payload'] ?? [])['record']['title'] ?? null) === 'Containment', 'Idempotency replay must preserve the original response payload.');
$payloadWindowCrudController = new GenericCrudController($dataLayer, QMS_TEST_ROOT_DIR, QMS_TEST_DATA_DIR);
$payloadWindowResolver = smoke_reflection_method($payloadWindowCrudController, 'resolveMutationIdempotency');
$payloadWindowSpec = $payloadWindowResolver->invoke(
    $payloadWindowCrudController,
    'create',
    [
        'domain' => 'crm',
        'table' => 'crm_activities',
        'scope' => ['org_site_id' => 'SITE-A'],
        'tableMeta' => [
            'primaryKey' => 'crm_activity_id',
            'columns' => [
                'crm_activity_id' => ['generated' => true],
                'activity_type' => ['required' => true],
                'subject' => ['required' => true],
                'org_site_id' => ['required' => false],
            ],
        ],
    ],
    [],
    ['username' => 'smoke-user'],
    [
        'activity_type' => 'follow_up_call',
        'subject' => 'Customer follow-up',
        'org_site_id' => 'SITE-A',
    ]
);
smoke_assert(($payloadWindowSpec['applied'] ?? false) === true, 'Create idempotency must apply by default even when no strong business key exists.');
smoke_assert(($payloadWindowSpec['mode'] ?? null) === 'derived_payload_window', 'Create idempotency must fall back to a short retry window when only payload replay protection is available.');
smoke_assert(($payloadWindowSpec['safe_retry_requires_client_key'] ?? true) === false, 'Create retry safety must no longer depend entirely on client-supplied idempotency keys.');
smoke_assert((int)(($payloadWindowSpec['descriptor'] ?? [])['ttl_seconds'] ?? 0) >= 15, 'Create payload-window replay protection must persist for a bounded retry window.');
$payloadWindowExecutions = 0;
$payloadWindowFirst = $idempotencyService->execute((array)($payloadWindowSpec['descriptor'] ?? []), static function () use (&$payloadWindowExecutions): array {
    $payloadWindowExecutions++;
    return [
        'status_code' => 201,
        'payload' => [
            'record' => [
                'crm_activity_id' => 'ACT-001',
                'activity_type' => 'follow_up_call',
            ],
        ],
    ];
});
$payloadWindowReplay = $idempotencyService->execute((array)($payloadWindowSpec['descriptor'] ?? []), static function (): array {
    throw new RuntimeException('Payload-window create replay should not re-execute the callback.');
});
smoke_assert($payloadWindowExecutions === 1, 'Payload-window create replay must not execute the callback more than once inside the retry window.');
smoke_assert(($payloadWindowFirst['replayed'] ?? true) === false, 'Payload-window create replay must treat the first execution as a real mutation.');
smoke_assert(($payloadWindowReplay['replayed'] ?? false) === true, 'Payload-window create replay must return the stored success response on duplicate submit.');
$updateWindowSpec = $payloadWindowResolver->invoke(
    $payloadWindowCrudController,
    'update',
    [
        'domain' => 'crm',
        'table' => 'crm_activities',
        'identity' => ['crm_activity_id' => 'ACT-001'],
        'scope' => ['org_site_id' => 'SITE-A'],
        'expected_row_version' => null,
        'tableMeta' => [
            'primaryKey' => 'crm_activity_id',
            'columns' => [
                'crm_activity_id' => ['generated' => true],
                'activity_type' => ['required' => true],
                'subject' => ['required' => true],
                'org_site_id' => ['required' => false],
            ],
        ],
    ],
    [],
    ['username' => 'smoke-user'],
    [
        'crm_activity_id' => 'ACT-001',
        'subject' => 'Customer follow-up updated',
        'org_site_id' => 'SITE-A',
    ]
);
smoke_assert(($updateWindowSpec['applied'] ?? false) === true, 'Update idempotency must apply by default even when the table does not support optimistic concurrency.');
smoke_assert(($updateWindowSpec['mode'] ?? null) === 'derived_identity_window', 'Update idempotency must fall back to an identity-scoped retry window when row_version is unavailable.');
smoke_assert(($updateWindowSpec['safe_retry_requires_client_key'] ?? true) === false, 'Update retry safety must not depend on explicit client idempotency keys.');
try {
    $idempotencyService->execute([
        'scope_key' => 'generic_crud|update|quality_management|capa_records|smoke',
        'key' => 'smoke-retry-001',
        'key_source' => 'header:Idempotency-Key',
        'mode' => 'client_token',
        'kind' => 'update',
        'domain' => 'quality_management',
        'table' => 'capa_records',
        'user_id' => 'smoke-user',
        'fingerprint' => [
            'id' => 'CAPA-001',
            'expected_row_version' => 5,
            'payload' => [
                'title' => 'Escaped duplicate',
            ],
        ],
    ], static function (): array {
        throw new RuntimeException('Conflicting duplicate should be rejected before callback execution.');
    });
    throw new RuntimeException('Idempotency runtime accepted a conflicting duplicate mutation.');
} catch (RecordConflictException $e) {
    smoke_assert(stripos($e->getMessage(), 'idempotency key') !== false, 'Conflicting duplicate mutation should identify idempotency key misuse.');
}
$shipmentOverrideTempDir = sys_get_temp_dir() . '/qms-backend-smoke-shipment-override';
if (is_dir($shipmentOverrideTempDir)) {
    $shipmentOverrideIterator = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($shipmentOverrideTempDir, FilesystemIterator::SKIP_DOTS),
        RecursiveIteratorIterator::CHILD_FIRST
    );
    foreach ($shipmentOverrideIterator as $shipmentOverrideEntry) {
        if ($shipmentOverrideEntry->isDir()) {
            rmdir($shipmentOverrideEntry->getPathname());
            continue;
        }
        unlink($shipmentOverrideEntry->getPathname());
    }
    rmdir($shipmentOverrideTempDir);
}
mkdir($shipmentOverrideTempDir . '/data/orders', 0775, true);
mkdir($shipmentOverrideTempDir . '/data/config', 0775, true);
copy(QMS_TEST_DATA_DIR . '/config/operational_override_policy.json', $shipmentOverrideTempDir . '/data/config/operational_override_policy.json');
file_put_contents(
    $shipmentOverrideTempDir . '/data/orders/orders.json',
    json_encode([
        'sales_orders' => [
            ['so_number' => 'SO-TEST'],
        ],
        'job_orders' => [],
        'work_orders' => [],
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)
);
$shipmentGateService = new ShipmentGateService($shipmentOverrideTempDir . '/data', $shipmentOverrideTempDir . '/data/config');
$shipmentOverride = $shipmentGateService->overrideGate(
    'SO-TEST',
    'SG-01',
    'Temporary release accepted with documented risk.',
    'qa-user',
    'qa_manager',
    'risk_accepted_by_quality',
    (new DateTimeImmutable('now', new DateTimeZone('+07:00')))->modify('+24 hours')->format('c'),
    'QA-SIGN-001'
);
smoke_assert(($shipmentOverride['current_status'] ?? null) === 'active', 'Operational override must stay active until expiry or revocation.');
smoke_assert((($shipmentOverride['e_signature'] ?? [])['signature_status'] ?? null) === 'applied', 'Operational override must carry applied electronic-signature evidence.');
$operationalOverrideService = new \MOM\Services\OperationalOverrideService($shipmentOverrideTempDir . '/data', $shipmentOverrideTempDir . '/data/config');
$loadedShipmentOverride = $operationalOverrideService->getOverride((string)($shipmentOverride['override_id'] ?? ''));
smoke_assert(is_array($loadedShipmentOverride), 'Operational override detail lookup must resolve the created control object.');
smoke_assert(($loadedShipmentOverride['override_id'] ?? null) === ($shipmentOverride['override_id'] ?? null), 'Operational override detail lookup must preserve the canonical override identity.');
$shipmentOverrides = $shipmentGateService->listOverrides('SO-TEST');
smoke_assert(count($shipmentOverrides) === 1, 'Shipment gate override listing must expose governed override records.');
smoke_assert(($shipmentOverrides[0]['control_code'] ?? null) === 'SG-01', 'Shipment gate override listing must preserve the controlled gate code.');
$shipmentReadiness = $shipmentGateService->checkReadiness('SO-TEST', 'qa-user', 'qa_manager');
$shipmentGateRow = null;
foreach ((array)($shipmentReadiness['items'] ?? []) as $item) {
    if (($item['code'] ?? null) === 'SG-01') {
        $shipmentGateRow = $item;
        break;
    }
}
smoke_assert(is_array($shipmentGateRow), 'Shipment gate readiness must still emit the governed gate row.');
smoke_assert(($shipmentGateRow['status'] ?? null) === 'waived', 'Shipment gate readiness must apply active governed overrides as waived status.');
smoke_assert((($shipmentReadiness['overrides']['SG-01'] ?? [])['e_signature']['signature_status'] ?? null) === 'applied', 'Shipment gate readiness must surface signature-backed override evidence.');
$revokedShipmentOverride = $operationalOverrideService->transitionOverride((string)($shipmentOverride['override_id'] ?? ''), 'revoke', 'qa-user', [
    'reason' => 'Containment restored and temporary waiver no longer required.',
]);
smoke_assert(($revokedShipmentOverride['current_status'] ?? null) === 'revoked', 'Operational override transition must allow governed revocation.');
$closedShipmentOverride = $operationalOverrideService->transitionOverride((string)($shipmentOverride['override_id'] ?? ''), 'close', 'qa-user', [
    'reason' => 'Follow-up review completed.',
    'follow_up_status' => 'closed',
]);
smoke_assert(($closedShipmentOverride['current_status'] ?? null) === 'closed', 'Operational override transition must support auditable closure.');
try {
    $shipmentGateService->overrideGate(
        'SO-TEST',
        'SG-04',
        'Unauthorized release attempt.',
        'sales-user',
        'sales_manager',
        'logistics_cutoff_exception',
        (new DateTimeImmutable('now', new DateTimeZone('+07:00')))->modify('+24 hours')->format('c'),
        'SALES-SIGN-001'
    );
    throw new RuntimeException('Shipment gate override allowed a role outside the governed approver boundary.');
} catch (RuntimeException $e) {
    smoke_assert(stripos($e->getMessage(), 'cannot override shipment gates') !== false, 'Shipment gate override must report approver-boundary violations clearly.');
}
$financeControlTempDir = sys_get_temp_dir() . '/qms-backend-smoke-finance-controls';
if (is_dir($financeControlTempDir)) {
    $financeControlIterator = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($financeControlTempDir, FilesystemIterator::SKIP_DOTS),
        RecursiveIteratorIterator::CHILD_FIRST
    );
    foreach ($financeControlIterator as $financeControlEntry) {
        if ($financeControlEntry->isDir()) {
            rmdir($financeControlEntry->getPathname());
            continue;
        }
        unlink($financeControlEntry->getPathname());
    }
    rmdir($financeControlTempDir);
}
mkdir($financeControlTempDir . '/data', 0775, true);
$financeControlService = new FinanceControlService($financeControlTempDir . '/data');
$futureBackdateExceptionExpiry = (new DateTimeImmutable('+2 days'))->format(DATE_ATOM);
$periodClose = $financeControlService->createPeriodClose([
    'period_code' => '2026-04',
    'ledger_scope' => 'AP',
    'reason' => 'April AP close completed after match review.',
], 'finance-user');
smoke_assert(($periodClose['close_status'] ?? null) === 'closed', 'Finance period close control must create a closed control record.');
smoke_assert((($periodClose['e_signature'] ?? [])['signature_status'] ?? null) === 'applied', 'Finance period close control must carry signature evidence.');
$backdateException = $financeControlService->createBackdateException([
    'ledger_scope' => 'AR',
    'subject_type' => 'shipment',
    'subject_ref' => 'SHP-001',
    'reason_code' => 'closed_period_adjustment',
    'reason' => 'Approved late logistics billing adjustment crossing the monthly close boundary.',
    'approval_reference' => 'APR-AR-001',
    'original_event_at' => '2026-04-01T08:15:00+07:00',
    'requested_posting_date' => '2026-04-02',
    'expires_at' => $futureBackdateExceptionExpiry,
], 'finance-user');
smoke_assert(($backdateException['exception_status'] ?? null) === 'approved', 'Finance backdate exception must create an approved governed exception record.');
smoke_assert((($backdateException['e_signature'] ?? [])['signature_status'] ?? null) === 'applied', 'Finance backdate exception must carry signature evidence.');
$creditMemo = $financeControlService->createCreditMemo([
    'invoice_scope' => 'AR',
    'original_invoice_ref' => 'INV-AR-001',
    'reason_code' => 'price_adjustment',
    'reason' => 'Post-shipment commercial adjustment.',
    'amount' => 1250000,
    'currency_code' => 'VND',
], 'finance-user');
smoke_assert(($creditMemo['memo_status'] ?? null) === 'approved', 'Finance credit memo control must create an approved memo record.');
$debitMemo = $financeControlService->createDebitMemo([
    'invoice_scope' => 'AP',
    'original_invoice_ref' => 'INV-AP-001',
    'reason_code' => 'supplier_chargeback',
    'reason' => 'Supplier under-billed freight adjustment.',
    'amount' => 350000,
    'currency_code' => 'VND',
], 'finance-user');
smoke_assert(($debitMemo['memo_status'] ?? null) === 'approved', 'Finance debit memo control must create an approved memo record.');
$reopenedPeriodClose = $financeControlService->transitionPeriodClose((string)($periodClose['period_close_id'] ?? ''), 'reopen', 'finance-user', [
    'reason' => 'Late approved adjustment requires temporary reopen.',
]);
smoke_assert(($reopenedPeriodClose['close_status'] ?? null) === 'reopened', 'Finance period close transition must allow governed reopen.');
$reclosedPeriodClose = $financeControlService->transitionPeriodClose((string)($periodClose['period_close_id'] ?? ''), 'close', 'finance-user', [
    'reason' => 'Adjustment posted and period reclosed.',
]);
smoke_assert(($reclosedPeriodClose['close_status'] ?? null) === 'closed', 'Finance period close transition must support reclose after governed reopen.');
$revokedBackdateException = $financeControlService->transitionBackdateException((string)($backdateException['backdate_exception_id'] ?? ''), 'revoke', 'finance-user', [
    'reason' => 'Controller withdrew the exception before posting.',
]);
smoke_assert(($revokedBackdateException['exception_status'] ?? null) === 'revoked', 'Finance backdate exception transition must allow governed revocation.');
$closedBackdateException = $financeControlService->transitionBackdateException((string)($backdateException['backdate_exception_id'] ?? ''), 'close', 'finance-user', [
    'reason' => 'Case closed after reconciliation review.',
]);
smoke_assert(($closedBackdateException['exception_status'] ?? null) === 'closed', 'Finance backdate exception transition must support auditable closure.');
smoke_assert(count($financeControlService->listPeriodCloses()) === 1, 'Finance period close listing must expose created close controls.');
smoke_assert(count($financeControlService->listBackdateExceptions()) === 1, 'Finance backdate exception listing must expose created temporal controls.');
smoke_assert(count($financeControlService->listCreditMemos()) === 1, 'Finance credit memo listing must expose created correction controls.');
smoke_assert(count($financeControlService->listDebitMemos()) === 1, 'Finance debit memo listing must expose created correction controls.');
smoke_assert(($financeControlService->getPeriodClose((string)($periodClose['period_close_id'] ?? ''))['period_close_id'] ?? null) === ($periodClose['period_close_id'] ?? null), 'Finance period close detail lookup must resolve the created close control.');
smoke_assert(($financeControlService->getBackdateException((string)($backdateException['backdate_exception_id'] ?? ''))['backdate_exception_id'] ?? null) === ($backdateException['backdate_exception_id'] ?? null), 'Finance backdate exception detail lookup must resolve the created temporal control.');
smoke_assert(($financeControlService->getCreditMemo((string)($creditMemo['credit_memo_id'] ?? ''))['credit_memo_id'] ?? null) === ($creditMemo['credit_memo_id'] ?? null), 'Finance credit memo detail lookup must resolve the created correction control.');
smoke_assert(($financeControlService->getDebitMemo((string)($debitMemo['debit_memo_id'] ?? ''))['debit_memo_id'] ?? null) === ($debitMemo['debit_memo_id'] ?? null), 'Finance debit memo detail lookup must resolve the created correction control.');
$customerPoTempDir = sys_get_temp_dir() . '/qms-backend-smoke-customer-po';
if (is_dir($customerPoTempDir)) {
    $customerPoIterator = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($customerPoTempDir, FilesystemIterator::SKIP_DOTS),
        RecursiveIteratorIterator::CHILD_FIRST
    );
    foreach ($customerPoIterator as $customerPoEntry) {
        if ($customerPoEntry->isDir()) {
            rmdir($customerPoEntry->getPathname());
            continue;
        }
        unlink($customerPoEntry->getPathname());
    }
    rmdir($customerPoTempDir);
}
mkdir($customerPoTempDir . '/data/orders', 0775, true);
file_put_contents(
    $customerPoTempDir . '/data/orders/orders.json',
    json_encode([
        'sales_orders' => [[
            'so_number' => 'SO-LEGACY-001',
            'customer_id' => 'CUS-LEGACY',
            'customer_name' => 'Legacy Customer',
            'customer_po' => 'PO-LEGACY-001',
            'customer_po_number' => 'PO-LEGACY-001',
            'order_date' => '2026-04-01',
            'due_date' => '2026-04-20',
            'status' => 'in_production',
            'lines' => [[
                'line_number' => 1,
                'part_number' => 'PN-LEG-01',
                'qty' => 10,
                'unit_price' => 150000,
            ]],
        ]],
        'job_orders' => [],
        'work_orders' => [],
        'counters' => ['so' => 1, 'jo' => 0, 'wo' => 0],
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)
);
$customerPoService = new CustomerPurchaseOrderService($customerPoTempDir . '/data');
$backfilledCustomerPos = $customerPoService->listPurchaseOrders();
smoke_assert(count($backfilledCustomerPos) === 1, 'Customer purchase-order service must backfill canonical records from legacy embedded Sales Order customer PO fields.');
$legacyCustomerPo = $backfilledCustomerPos[0];
smoke_assert(($legacyCustomerPo['customer_po_number'] ?? null) === 'PO-LEGACY-001', 'Customer purchase-order backfill must preserve the original customer PO number.');
smoke_assert(($legacyCustomerPo['po_status'] ?? null) === 'confirmed', 'Customer purchase-order backfill must promote linked legacy demand into confirmed state once a Sales Order exists.');
smoke_assert((($legacyCustomerPo['sales_order_refs'] ?? [])[0]['so_number'] ?? null) === 'SO-LEGACY-001', 'Customer purchase-order backfill must preserve the linked Sales Order reference.');
$manualCustomerPo = $customerPoService->createPurchaseOrder([
    'customer_id' => 'CUS-MANUAL',
    'customer_name' => 'Manual Customer',
    'customer_po_number' => 'PO-MANUAL-001',
    'received_at' => '2026-04-09T08:00:00+07:00',
    'requested_date' => '2026-04-25',
    'due_date' => '2026-04-30',
    'lines' => [[
        'line_number' => 1,
        'part_number' => 'PN-MAN-01',
        'qty' => 5,
        'unit_price' => 200000,
    ]],
], 'commercial-user');
smoke_assert(($manualCustomerPo['po_status'] ?? null) === 'received', 'Customer purchase-order creation must start in received state.');
$manualCustomerPo = $customerPoService->transitionPurchaseOrder((string)($manualCustomerPo['customer_po_id'] ?? ''), 'acknowledge', 'commercial-user', [
    'reason' => 'Customer PO content reviewed and acknowledged by commercial planning.',
]);
smoke_assert(($manualCustomerPo['po_status'] ?? null) === 'acknowledged', 'Customer purchase-order transition must support explicit acknowledgment before Sales Order confirmation.');
$orderService = new OrderService($customerPoTempDir . '/data');
$salesOrder = $orderService->createSalesOrder([
    'so_number' => 'SO-2026-0002',
    'customer_id' => 'CUS-MANUAL',
    'customer_name' => 'Manual Customer',
    'customer_po_number' => 'PO-MANUAL-001',
    'customer_po' => 'PO-MANUAL-001',
    'order_date' => '2026-04-09',
    'due_date' => '2026-04-30',
    'status' => 'draft',
    'lines' => [[
        'line_number' => 1,
        'part_number' => 'PN-MAN-01',
        'qty' => 5,
        'unit_price' => 200000,
    ]],
    'created_at' => '2026-04-09T09:00:00+07:00',
    'updated_at' => '2026-04-09T09:00:00+07:00',
    'status_history' => [],
    'change_history' => [],
]);
$synchronizedCustomerPo = $customerPoService->synchronizeSalesOrder($salesOrder, 'commercial-user');
smoke_assert(($synchronizedCustomerPo['customer_po_id'] ?? null) === ($manualCustomerPo['customer_po_id'] ?? null), 'Customer purchase-order synchronization must reuse the existing commercial demand object instead of creating a duplicate.');
smoke_assert(($synchronizedCustomerPo['po_status'] ?? null) === 'confirmed', 'Customer purchase-order synchronization must promote the record to confirmed once a Sales Order is linked.');
$linkedSalesOrder = $orderService->getSalesOrder('SO-2026-0002');
smoke_assert(($linkedSalesOrder['customer_po_id'] ?? null) === ($manualCustomerPo['customer_po_id'] ?? null), 'Sales Order runtime must persist the canonical customer_po_id linkage after synchronization.');
smoke_assert(($customerPoService->getPurchaseOrder((string)($manualCustomerPo['customer_po_id'] ?? ''))['customer_po_id'] ?? null) === ($manualCustomerPo['customer_po_id'] ?? null), 'Customer purchase-order detail lookup must resolve the synchronized canonical record.');

// Generic runtime write access must be denied when the permission matrix covers the action but the role does not.
smoke_reset_request_state();
$_SESSION['user'] = 'finance-user';
$_SESSION['mfa_ok'] = true;
$_GET['domain'] = 'quality_management';
$_GET['table'] = 'capa_records';
$genericCrudController = (new GenericCrudController($dataLayer, QMS_TEST_ROOT_DIR, QMS_TEST_DATA_DIR))->setStore($financeStore);
try {
    $genericCrudController->createRecord();
    throw new RuntimeException('Generic CRUD create allowed an unrelated finance role on a quality domain table.');
} catch (ExitException $e) {
    smoke_assert($e->getStatusCode() === 403, 'Generic CRUD create guard returned wrong status.');
    smoke_assert(($e->getPayload()['error'] ?? null) === 'forbidden', 'Generic CRUD create guard returned wrong error.');
}

// Restricted foundation-governance tables must remain blocked for non-admin roles even on generic reads.
smoke_reset_request_state();
$_SESSION['user'] = 'finance-user';
$_SESSION['mfa_ok'] = true;
$_GET['domain'] = 'foundation_governance';
$_GET['table'] = 'org_companies';
$governanceCrudController = (new GenericCrudController($dataLayer, QMS_TEST_ROOT_DIR, QMS_TEST_DATA_DIR))->setStore($financeStore);
try {
    $governanceCrudController->listRecords();
    throw new RuntimeException('Generic CRUD list exposed a restricted governance table to a finance role.');
} catch (ExitException $e) {
    smoke_assert($e->getStatusCode() === 403, 'Restricted governance list guard returned wrong status.');
    smoke_assert(($e->getPayload()['error'] ?? null) === 'forbidden', 'Restricted governance list guard returned wrong error.');
}

smoke_reset_request_state();
$_SESSION['user'] = 'qms-runtime-user';
$_SESSION['mfa_ok'] = true;
$_GET['domain'] = 'foundation_governance';
$_GET['table'] = 'org_companies';
$qmsGovernanceCrudController = (new GenericCrudController($dataLayer, QMS_TEST_ROOT_DIR, QMS_TEST_DATA_DIR))->setStore($genericPermissionStore);
try {
    $qmsGovernanceCrudController->listRecords();
    throw new RuntimeException('Generic CRUD list exposed a restricted governance table to a QMS engineer.');
} catch (ExitException $e) {
    smoke_assert($e->getStatusCode() === 403, 'Restricted governance list guard returned wrong status for QMS engineer.');
    smoke_assert(($e->getPayload()['error'] ?? null) === 'forbidden', 'Restricted governance list guard returned wrong error for QMS engineer.');
}

// Knowledge write actions must not be exposed to unrelated office roles.
smoke_reset_request_state();
$_SESSION['user'] = 'finance-user';
$_SESSION['mfa_ok'] = true;
$knowledgeController = (new KnowledgeController($dataLayer, QMS_TEST_ROOT_DIR, QMS_TEST_DATA_DIR))->setStore($financeStore);
try {
    $knowledgeController->create();
    throw new RuntimeException('Knowledge create allowed an unrelated office role.');
} catch (ExitException $e) {
    smoke_assert($e->getStatusCode() === 403, 'Knowledge guard returned wrong status.');
    smoke_assert(($e->getPayload()['error'] ?? null) === 'forbidden', 'Knowledge guard returned wrong error.');
}

// Energy analytics must not be exposed to unrelated office roles.
smoke_reset_request_state();
$_SESSION['user'] = 'finance-user';
$_SESSION['mfa_ok'] = true;
$energyController = (new EnergyController($dataLayer, QMS_TEST_ROOT_DIR, QMS_TEST_DATA_DIR))->setStore($financeStore);
try {
    $energyController->getOverview();
    throw new RuntimeException('Energy overview allowed an unrelated office role.');
} catch (ExitException $e) {
    smoke_assert($e->getStatusCode() === 403, 'Energy guard returned wrong status.');
    smoke_assert(($e->getPayload()['error'] ?? null) === 'forbidden', 'Energy guard returned wrong error.');
}

// Allocation evidence actions must not be exposed to arbitrary operators.
smoke_reset_request_state();
$_SESSION['user'] = 'operator-user';
$_SESSION['mfa_ok'] = true;
$allocationController = (new AllocationController($dataLayer, QMS_TEST_ROOT_DIR, QMS_TEST_DATA_DIR))->setStore($portalStore);
try {
    $allocationController->allocate();
    throw new RuntimeException('Allocation create allowed an unauthorized operator.');
} catch (ExitException $e) {
    smoke_assert($e->getStatusCode() === 403, 'Allocation guard returned wrong status.');
    smoke_assert(($e->getPayload()['error'] ?? null) === 'forbidden', 'Allocation guard returned wrong error.');
}

// Dispatch planning must not be exposed to arbitrary operators.
smoke_reset_request_state();
$_SESSION['user'] = 'operator-user';
$_SESSION['mfa_ok'] = true;
$dispatchController = (new DispatchController($dataLayer, QMS_TEST_ROOT_DIR, QMS_TEST_DATA_DIR))->setStore($portalStore);
try {
    $dispatchController->createTarget();
    throw new RuntimeException('Dispatch planning allowed an unauthorized operator.');
} catch (ExitException $e) {
    smoke_assert($e->getStatusCode() === 403, 'Dispatch write guard returned wrong status.');
    smoke_assert(($e->getPayload()['error'] ?? null) === 'forbidden', 'Dispatch write guard returned wrong error.');
}

// Operators must not be able to inspect another operator's dispatch queue.
smoke_reset_request_state();
$_SESSION['user'] = 'operator-user';
$_SESSION['mfa_ok'] = true;
$_GET['operator_id'] = 'another-operator';
try {
    $dispatchController->getOperatorDispatch();
    throw new RuntimeException('Dispatch queue allowed cross-operator access.');
} catch (ExitException $e) {
    smoke_assert($e->getStatusCode() === 403, 'Dispatch queue scope guard returned wrong status.');
    smoke_assert(($e->getPayload()['error'] ?? null) === 'forbidden', 'Dispatch queue scope guard returned wrong error.');
}

// Logistics mutations must not be exposed to unrelated office roles.
smoke_reset_request_state();
$_SESSION['user'] = 'finance-user';
$_SESSION['mfa_ok'] = true;
$logisticsController = (new LogisticsController($dataLayer, QMS_TEST_ROOT_DIR, QMS_TEST_DATA_DIR))->setStore($financeStore);
try {
    $logisticsController->subcontract_create();
    throw new RuntimeException('Logistics subcontract create allowed an unrelated office role.');
} catch (ExitException $e) {
    smoke_assert($e->getStatusCode() === 403, 'Logistics write guard returned wrong status.');
    smoke_assert(($e->getPayload()['error'] ?? null) === 'forbidden', 'Logistics write guard returned wrong error.');
}

// Executive analytics must not be exposed to arbitrary shop-floor roles.
smoke_reset_request_state();
$_SESSION['user'] = 'operator-user';
$_SESSION['mfa_ok'] = true;
$dashboardController = (new DashboardController($dataLayer, QMS_TEST_ROOT_DIR, QMS_TEST_DATA_DIR))->setStore($portalStore);
try {
    $dashboardController->executive();
    throw new RuntimeException('Executive dashboard allowed an unauthorized operator.');
} catch (ExitException $e) {
    smoke_assert($e->getStatusCode() === 403, 'Dashboard guard returned wrong status.');
    smoke_assert(($e->getPayload()['error'] ?? null) === 'forbidden', 'Dashboard guard returned wrong error.');
}

// Registry runtime assets must keep composite-identity CRUD contracts available.
$endpointCatalog = json_decode((string)file_get_contents(QMS_TEST_DATA_DIR . '/registry/endpoint-catalog.json'), true);
$endpointMap = is_array($endpointCatalog['endpoints'] ?? null) ? $endpointCatalog['endpoints'] : [];
$tableRegistryAsset = json_decode((string)file_get_contents(QMS_TEST_DATA_DIR . '/registry/table-registry.json'), true);
$tableRegistryMap = is_array($tableRegistryAsset['tables'] ?? null) ? $tableRegistryAsset['tables'] : [];
$workflowLibrary = json_decode((string)file_get_contents(QMS_TEST_DATA_DIR . '/registry/workflow-library.json'), true);
$workflowMap = is_array($workflowLibrary['workflows'] ?? null) ? $workflowLibrary['workflows'] : [];
$runtimeAccessPolicy = json_decode((string)file_get_contents(QMS_TEST_DATA_DIR . '/registry/runtime-access-policy.json'), true);
$frontendFoundation = json_decode((string)file_get_contents(QMS_TEST_DATA_DIR . '/registry/frontend-foundation-catalog.json'), true);
$frontendEntityMap = is_array($frontendFoundation['entities'] ?? null) ? $frontendFoundation['entities'] : [];
$contractGlossaryPath = QMS_TEST_BASE_DIR . '/contracts/glossary.json';
$contractAuthorityReportPath = QMS_TEST_BASE_DIR . '/contracts/authority-report.json';
$contractPackageIndexPath = QMS_TEST_BASE_DIR . '/contracts/package-index.json';
$contractObjectIndexPath = QMS_TEST_BASE_DIR . '/contracts/object-index.json';
$contractStateModelPath = QMS_TEST_BASE_DIR . '/contracts/state-model-index.json';
$contractMigrationManifestPath = QMS_TEST_BASE_DIR . '/contracts/migration-manifest.json';
$contractAuthorityReport = json_decode((string)file_get_contents($contractAuthorityReportPath), true);
$contractPackageIndex = json_decode((string)file_get_contents($contractPackageIndexPath), true);
$contractObjectIndex = json_decode((string)file_get_contents($contractObjectIndexPath), true);
$contractStateModels = json_decode((string)file_get_contents($contractStateModelPath), true);
$contractMigrationManifest = json_decode((string)file_get_contents($contractMigrationManifestPath), true);
$telemetryDetail = $endpointMap['mes_execution.mes_machine_telemetry.detail'] ?? null;
$bomDetail = $endpointMap['master_data.bill_of_materials.detail'] ?? null;
$scenarioUpdate = $endpointMap['advanced_planning.aps_planning_scenarios.update'] ?? null;
$scenarioTransition = $endpointMap['advanced_planning.aps_planning_scenarios.transition'] ?? null;
$capaTransition = $endpointMap['quality_management.capa_records.transition'] ?? null;
$capaDelete = $endpointMap['quality_management.capa_records.delete'] ?? null;
$capaFoundation = $frontendEntityMap['quality_management.capa_records'] ?? null;
$apsFoundation = $frontendEntityMap['advanced_planning.aps_planning_scenarios'] ?? null;
[$persistedTransitionCount, $genericTransitionCount] = [0, 0];
smoke_assert(is_file($contractGlossaryPath), 'Business contract glossary must exist.');
smoke_assert(is_file($contractAuthorityReportPath), 'Business contract authority report must exist.');
smoke_assert(is_file($contractPackageIndexPath), 'Business contract package index must exist.');
smoke_assert(is_file($contractObjectIndexPath), 'Business contract object index must exist.');
smoke_assert(is_file($contractStateModelPath), 'Business contract state-model index must exist.');
smoke_assert(is_file($contractMigrationManifestPath), 'Business contract migration manifest must exist.');
smoke_assert((int)($contractPackageIndex['_meta']['packageCount'] ?? 0) > 0, 'Business contract package index must expose authored packages.');
smoke_assert((int)($contractObjectIndex['_meta']['objectCount'] ?? 0) > 0, 'Business contract object index must expose canonical objects.');
smoke_assert((int)($contractObjectIndex['_meta']['authoredPackageCount'] ?? 0) > 0, 'Business contract object index must report authored package coverage.');
smoke_assert((int)($contractAuthorityReport['summary']['authoredPackageCount'] ?? -1) === (int)($contractPackageIndex['_meta']['packageCount'] ?? 0), 'Business contract authority report must stay aligned with authored package inventory.');
smoke_assert((int)($contractAuthorityReport['summary']['totalCanonicalObjects'] ?? -1) === (int)($contractObjectIndex['_meta']['objectCount'] ?? 0), 'Business contract authority report must stay aligned with canonical object inventory.');
smoke_assert((float)($contractAuthorityReport['summary']['authoredCoverageRatio'] ?? 0) >= 0.50, 'Business contract authority must keep at least 50% authored coverage across canonical resources.');
smoke_assert((float)($contractAuthorityReport['summary']['lifecycleLikeCoverageRatio'] ?? 0) >= 0.60, 'Business contract authority must keep at least 60% authored coverage across lifecycle-like resources.');
smoke_assert((float)($contractAuthorityReport['summary']['coreValueStreamCoverageRatio'] ?? 0) >= 0.90, 'Business contract authority must keep near-total authored coverage across core value-stream resources.');
smoke_assert((int)($contractStateModels['_meta']['stateModelCount'] ?? 0) > 0, 'Business contract state-model index must expose lifecycle definitions.');
smoke_assert((string)($contractMigrationManifest['storageAuthority']['databaseSchemaSource'] ?? '') !== '', 'Business contract migration manifest must point back to storage authority.');
smoke_assert((int)($contractMigrationManifest['businessContractAuthority']['authoredPackageCount'] ?? 0) > 0, 'Business contract migration manifest must report authored package coverage.');
$contractObjectsByKey = [];
foreach ((array)($contractObjectIndex['objects'] ?? []) as $contractObject) {
    if (is_array($contractObject) && isset($contractObject['key'])) {
        $contractObjectsByKey[(string)$contractObject['key']] = $contractObject;
    }
}
foreach ([
    'commercial_customer.quotations',
    'commercial_customer.customer-care-cases',
    'commercial_customer.customer-purchase-orders',
    'commercial_customer.sales-orders',
    'procurement_supplier_quality.purchase-requisitions',
    'procurement_supplier_quality.purchase-receipts',
    'procurement_supplier_quality.supplier-purchase-orders',
    'procurement_supplier_quality.iqc-inspections',
    'planning_production.production-plans',
    'planning_production.job-orders',
    'planning_production.work-orders',
    'planning_production.ipqc-inspections',
    'inventory_logistics.shipments',
    'inventory_logistics.freight-orders',
    'inventory_logistics.inventory-items',
    'inventory_logistics.inventory-movements',
    'inventory_logistics.warehouses',
    'inventory_logistics.customer-returns',
    'quality_improvement.nonconformances',
    'quality_improvement.corrective-actions',
    'quality_improvement.oqc-inspections',
    'maintenance_ehs.five-s-audits',
    'maintenance_ehs.incidents',
    'maintenance_ehs.maintenance-plans',
    'maintenance_ehs.permits',
    'maintenance_ehs.safety-observations',
    'master_data.compliance-obligations',
    'master_data.customers',
    'master_data.employees',
    'master_data.equipment',
    'master_data.suppliers',
    'planning_production.dispatch-lists',
    'planning_production.production-operations',
    'finance.ap-invoices',
    'finance.ar-invoices',
] as $contractKey) {
    smoke_assert(is_array($contractObjectsByKey[$contractKey] ?? null), 'Missing authored contract object ' . $contractKey . '.');
    smoke_assert(($contractObjectsByKey[$contractKey]['contractAuthority'] ?? null) === 'authored_package', 'Contract object must be backed by an authored package: ' . $contractKey . '.');
}
smoke_assert(is_array($telemetryDetail), 'Composite telemetry detail endpoint missing from endpoint catalog.');
smoke_assert(($telemetryDetail['record_addressing'] ?? null) === 'composite', 'Telemetry detail endpoint must advertise composite addressing.');
smoke_assert(($telemetryDetail['request']['identity_fields'] ?? null) === ['equipment_id', 'ts'], 'Telemetry detail endpoint identity fields mismatch.');
smoke_assert(is_array($bomDetail), 'Composite BOM detail endpoint missing from endpoint catalog.');
smoke_assert(($bomDetail['request']['identity_fields'] ?? null) === ['bom_id', 'bom_revision'], 'BOM detail endpoint identity fields mismatch.');
smoke_assert(is_array($scenarioUpdate), 'APS planning scenario update endpoint missing from endpoint catalog.');
smoke_assert((bool)($scenarioUpdate['request']['optimistic_concurrency']['required'] ?? false) === true, 'APS update endpoint must require optimistic concurrency.');
smoke_assert(($scenarioUpdate['request']['org_scope']['fields'] ?? null) === ['org_company_code', 'org_legal_entity_code', 'org_plant_id', 'org_site_id'], 'APS update endpoint scope fields mismatch.');
smoke_assert((bool)($scenarioUpdate['response']['optimistic_concurrency']['enabled'] ?? false) === true, 'APS update response must advertise row_version concurrency.');
smoke_assert(is_array($scenarioTransition), 'APS planning scenario transition endpoint missing from endpoint catalog.');
smoke_assert(($scenarioTransition['workflow']['lifecycle_mode'] ?? null) === 'persisted', 'APS planning scenario transition must advertise persisted workflow mode once the workflow library is aligned.');
smoke_assert((bool)($scenarioTransition['workflow']['runtime']['engine_bridge_required'] ?? false) === true, 'APS planning scenario transition must advertise workflow-engine bridge requirement.');
smoke_assert((bool)($scenarioTransition['workflow']['runtime']['engine_bridge_blocked'] ?? true) === false, 'APS planning scenario transition must not advertise bridge blocking once the state model is aligned.');
smoke_assert((bool)($scenarioTransition['workflow']['runtime']['engine_bridge']['ready'] ?? false) === true, 'APS planning scenario transition must advertise a ready workflow-engine bridge.');
smoke_assert(($scenarioTransition['workflow']['runtime']['transition_execution_guard'] ?? null) === 'workflow_engine', 'APS planning scenario transition must advertise workflow-engine execution guard.');
smoke_assert(is_array($capaTransition), 'CAPA transition endpoint missing from endpoint catalog.');
smoke_assert(($capaTransition['workflow']['lifecycle_mode'] ?? null) === 'persisted', 'CAPA transition must advertise persisted workflow mode.');
smoke_assert((bool)($capaTransition['workflow']['runtime']['engine_bridge_required'] ?? false) === true, 'CAPA transition must advertise workflow-engine bridge requirement.');
smoke_assert((bool)($capaTransition['workflow']['runtime']['engine_bridge_blocked'] ?? true) === false, 'CAPA transition must stop advertising bridge blocking once the workflow engine is aligned.');
smoke_assert((bool)($capaTransition['workflow']['runtime']['engine_bridge']['ready'] ?? false) === true, 'CAPA transition must advertise a ready workflow-engine bridge once the state models align.');
smoke_assert(((array)($capaTransition['workflow']['runtime']['engine_bridge']['block_reasons'] ?? [])) === [], 'CAPA transition must clear bridge blocker reasons once alignment is complete.');
smoke_assert(($capaTransition['workflow']['runtime']['runtime_error_code'] ?? null) === null, 'CAPA transition must clear runtime error codes when the workflow-engine bridge is ready.');
smoke_assert(is_array($capaDelete), 'CAPA delete endpoint missing from endpoint catalog.');
smoke_assert(($capaDelete['capabilities']['deletion']['mode'] ?? null) === 'archive_only', 'CAPA delete must advertise governed archive-only delete mode.');
smoke_assert((bool)($capaDelete['capabilities']['deletion']['hard_delete_allowed'] ?? true) === false, 'CAPA delete must not advertise hard-delete capability.');
smoke_assert(is_array($frontendFoundation), 'Frontend foundation registry asset missing.');
smoke_assert((int)($frontendFoundation['summary']['entity_count'] ?? 0) > 0, 'Frontend foundation summary must advertise entity coverage.');
smoke_assert(is_array($capaFoundation), 'CAPA frontend foundation contract missing.');
smoke_assert(($capaFoundation['profile'] ?? null) === 'governed_case', 'CAPA frontend foundation must classify the entity as a governed case.');
smoke_assert(($capaFoundation['capabilities']['workflow']['state'] ?? null) === 'ready', 'CAPA frontend foundation must advertise workflow UI as ready once the bridge is aligned.');
smoke_assert(((array)($capaFoundation['capabilities']['workflow']['blockers'] ?? [])) === [], 'CAPA frontend foundation must clear workflow blockers once the bridge is aligned.');
smoke_assert(is_array($apsFoundation), 'APS planning scenario frontend foundation contract missing.');
smoke_assert(($apsFoundation['profile'] ?? null) === 'planning_console', 'APS planning scenario frontend foundation must classify the entity as a planning console.');
smoke_assert(($apsFoundation['capabilities']['planning_board']['state'] ?? null) !== 'not_applicable', 'APS planning scenario must advertise planning-board capability coverage.');
smoke_assert(is_array($apsFoundation['detail_layout']['sections'] ?? null), 'APS planning scenario must expose detail sections for future frontend composition.');
foreach ($endpointMap as $action => $endpoint) {
    if (!is_array($endpoint) || ($endpoint['kind'] ?? null) !== 'transition') {
        continue;
    }
    $runtime = (array)($endpoint['capabilities']['workflow_runtime'] ?? []);
    $mode = (string)($runtime['lifecycle_mode'] ?? '');
    if ($mode === 'persisted') {
        $persistedTransitionCount += 1;
        smoke_assert((bool)($runtime['engine_bridge_required'] ?? false) === true, "Persisted transition {$action} must require a workflow-engine bridge.");
        smoke_assert((bool)($runtime['generic_runtime_safe'] ?? true) === false, "Persisted transition {$action} must not be marked generic-runtime safe.");
        smoke_assert((bool)($runtime['builder_auto_bind_transition_endpoint'] ?? true) === false, "Persisted transition {$action} must not auto-bind a generic transition endpoint.");
        $bridgeReady = (bool)(($runtime['engine_bridge'] ?? [])['ready'] ?? false);
        $expectedGuard = $bridgeReady ? 'workflow_engine' : 'deny_generic_runtime_until_bridge_ready';
        smoke_assert((string)($runtime['transition_execution_guard'] ?? '') === $expectedGuard, "Persisted transition {$action} must advertise the correct workflow guard for its bridge readiness.");
    } elseif ($mode === 'generic_status_only') {
        $genericTransitionCount += 1;
        smoke_assert((bool)($runtime['generic_runtime_safe'] ?? false) === true, "Generic-status transition {$action} must remain generic-runtime safe.");
        smoke_assert((bool)($runtime['builder_auto_bind_transition_endpoint'] ?? false) === true, "Generic-status transition {$action} must remain builder auto-bindable.");
    }
}
smoke_assert($persistedTransitionCount > 0, 'Endpoint catalog must retain persisted transition endpoints for invariant checks.');
smoke_assert($genericTransitionCount > 0, 'Endpoint catalog must retain generic-status transition endpoints for invariant checks.');
smoke_assert(is_array($runtimeAccessPolicy), 'Runtime access policy registry asset missing.');
smoke_assert(in_array('production_planner', (array)($runtimeAccessPolicy['domains']['advanced_planning']['update'] ?? []), true), 'Advanced planning runtime policy must allow production planners to mutate APS records.');
smoke_assert(in_array('qa_manager', (array)($runtimeAccessPolicy['tables']['org_companies']['list'] ?? []), true), 'Restricted runtime policy must retain admin-grade access for org companies.');
smoke_assert(!in_array('qms_engineer', (array)($runtimeAccessPolicy['tables']['org_companies']['list'] ?? []), true), 'Restricted runtime policy must not expose org companies to QMS engineers.');
smoke_assert((array)($runtimeAccessPolicy['tables']['audit_events']['delete'] ?? ['unexpected']) === [], 'Audit events runtime policy must block generic delete.');
smoke_assert(in_array('quality_engineer', (array)($runtimeAccessPolicy['domains']['quality_management']['create'] ?? []), true), 'Quality runtime policy must allow controlled quality operations roles.');

$qualityReport = json_decode((string)file_get_contents(QMS_TEST_DATA_DIR . '/registry/registry-quality-report.json'), true);
$registryManifest = json_decode((string)file_get_contents(QMS_TEST_DATA_DIR . '/registry/registry-manifest.json'), true);
$canonicalCatalog = json_decode((string)file_get_contents(QMS_TEST_DATA_DIR . '/registry/canonical-backend-standardization-catalog.json'), true);
$wave0Policy = json_decode((string)file_get_contents(QMS_TEST_DATA_DIR . '/registry/wave0-governance-policy.json'), true);
$wave0Report = json_decode((string)file_get_contents(QMS_TEST_DATA_DIR . '/registry/wave0-governance-report.json'), true);
$operationalBlindSpotCatalog = json_decode((string)file_get_contents(QMS_TEST_DATA_DIR . '/registry/operational-blind-spot-catalog.json'), true);
$operationalBlindSpotReport = json_decode((string)file_get_contents(QMS_TEST_DATA_DIR . '/registry/operational-blind-spot-report.json'), true);
$wave1Policy = json_decode((string)file_get_contents(QMS_TEST_DATA_DIR . '/registry/wave1-lifecycle-governance-policy.json'), true);
$wave1Normalization = json_decode((string)file_get_contents(QMS_TEST_DATA_DIR . '/registry/wave1-lifecycle-normalization.json'), true);
$wave1Report = json_decode((string)file_get_contents(QMS_TEST_DATA_DIR . '/registry/wave1-lifecycle-report.json'), true);
$wave2Policy = json_decode((string)file_get_contents(QMS_TEST_DATA_DIR . '/registry/wave2-canonical-governance-policy.json'), true);
$wave2Normalization = json_decode((string)file_get_contents(QMS_TEST_DATA_DIR . '/registry/wave2-canonical-normalization.json'), true);
$wave2Report = json_decode((string)file_get_contents(QMS_TEST_DATA_DIR . '/registry/wave2-canonical-report.json'), true);
$wave3Policy = json_decode((string)file_get_contents(QMS_TEST_DATA_DIR . '/registry/wave3-process-governance-policy.json'), true);
$wave3Normalization = json_decode((string)file_get_contents(QMS_TEST_DATA_DIR . '/registry/wave3-process-normalization.json'), true);
$wave3Report = json_decode((string)file_get_contents(QMS_TEST_DATA_DIR . '/registry/wave3-process-report.json'), true);
$wave4Policy = json_decode((string)file_get_contents(QMS_TEST_DATA_DIR . '/registry/wave4-production-quality-governance-policy.json'), true);
$wave4Normalization = json_decode((string)file_get_contents(QMS_TEST_DATA_DIR . '/registry/wave4-production-quality-normalization.json'), true);
$wave4Report = json_decode((string)file_get_contents(QMS_TEST_DATA_DIR . '/registry/wave4-production-quality-report.json'), true);
$wave5Policy = json_decode((string)file_get_contents(QMS_TEST_DATA_DIR . '/registry/wave5-maintenance-ehs-governance-policy.json'), true);
$wave5Normalization = json_decode((string)file_get_contents(QMS_TEST_DATA_DIR . '/registry/wave5-maintenance-ehs-normalization.json'), true);
$wave5Report = json_decode((string)file_get_contents(QMS_TEST_DATA_DIR . '/registry/wave5-maintenance-ehs-report.json'), true);
$wave6Policy = json_decode((string)file_get_contents(QMS_TEST_DATA_DIR . '/registry/wave6-finance-projection-governance-policy.json'), true);
$wave6Normalization = json_decode((string)file_get_contents(QMS_TEST_DATA_DIR . '/registry/wave6-finance-projection-normalization.json'), true);
$wave6Report = json_decode((string)file_get_contents(QMS_TEST_DATA_DIR . '/registry/wave6-finance-projection-report.json'), true);
$statusOptionsRegistry = json_decode((string)file_get_contents(QMS_TEST_DATA_DIR . '/registry/status-options.json'), true);
$operationalStressPolicy = json_decode((string)file_get_contents(QMS_TEST_DATA_DIR . '/registry/operational-stress-governance-policy.json'), true);
$operationalStressCatalog = json_decode((string)file_get_contents(QMS_TEST_DATA_DIR . '/registry/operational-stress-catalog.json'), true);
$operationalStressReport = json_decode((string)file_get_contents(QMS_TEST_DATA_DIR . '/registry/operational-stress-report.json'), true);
$operationalBlindSpotById = [];
foreach ((array)($operationalBlindSpotReport['assessments'] ?? []) as $row) {
    if (is_array($row) && isset($row['scenario_id'])) {
        $operationalBlindSpotById[(string)$row['scenario_id']] = $row;
    }
}
$operationalStressById = [];
foreach ((array)($operationalStressReport['assessments'] ?? []) as $row) {
    if (is_array($row) && isset($row['scenario_id'])) {
        $operationalStressById[(string)$row['scenario_id']] = $row;
    }
}
smoke_assert(($qualityReport['all_passed'] ?? null) === true, 'Registry quality report must go green once publishability blockers and critical operational findings are cleared.');
smoke_assert((int)($qualityReport['summary']['missing_primary_key_tables'] ?? -1) === 0, 'Registry quality report still reports missing primary-key tables.');
smoke_assert((int)($qualityReport['summary']['optimistic_concurrency_issues'] ?? -1) === 0, 'Registry quality report still reports optimistic concurrency contract gaps.');
smoke_assert((int)($qualityReport['summary']['idempotency_contract_issues'] ?? -1) === 0, 'Registry quality report still reports idempotency contract gaps.');
smoke_assert((int)($qualityReport['summary']['org_scope_contract_issues'] ?? -1) === 0, 'Registry quality report still reports org-scope contract gaps.');
smoke_assert((int)($qualityReport['summary']['transition_runtime_warnings'] ?? 0) > 0, 'Registry quality report must surface persisted workflow runtime warnings.');
smoke_assert((int)($qualityReport['summary']['workflow_engine_bridge_ready'] ?? 0) > 0, 'Registry quality report must surface ready workflow-engine bridges.');
smoke_assert((int)($qualityReport['summary']['workflow_engine_bridge_blocked'] ?? -1) === 0, 'Registry quality report must clear blocked workflow-engine bridges once alignment is complete.');
smoke_assert(is_array($qualityReport['warnings']['workflow_engine_bridge'] ?? null), 'Registry quality report must include workflow-engine bridge blockers.');
smoke_assert((int)($qualityReport['summary']['archive_only_tables'] ?? 0) > 0, 'Registry quality report must surface archive-only table governance.');
smoke_assert((int)($qualityReport['summary']['frontend_foundation_entities'] ?? 0) > 0, 'Registry quality report must include frontend foundation coverage.');
smoke_assert(is_array($qualityReport['warnings']['frontend_foundation'] ?? null), 'Registry quality report must include frontend foundation blocker summaries.');
smoke_assert((int)($qualityReport['summary']['attachment_contract_entities'] ?? 0) > 0, 'Registry quality report must surface generated attachment contracts.');
smoke_assert((int)($qualityReport['summary']['comment_contract_entities'] ?? 0) > 0, 'Registry quality report must surface generated comment contracts.');
smoke_assert((int)($qualityReport['summary']['activity_contract_entities'] ?? 0) > 0, 'Registry quality report must surface generated activity contracts.');
smoke_assert(is_array($qualityReport['publishability'] ?? null), 'Registry quality report must include publishability metadata.');
smoke_assert(($qualityReport['publishability']['ready'] ?? false) === true, 'Registry publishability must flip to ready once only partial-but-publishable entities remain.');
smoke_assert(($qualityReport['publishability']['status'] ?? null) === 'ready', 'Registry publishability status must surface ready when no unpublishable entities remain.');
smoke_assert((int)($qualityReport['summary']['publishability_review_required_entities'] ?? -1) === 0, 'Registry quality report must clear review-required entity counts once publishability blockers are gone.');
smoke_assert(is_array($wave0Policy), 'Wave 0 governance policy asset missing.');
smoke_assert(count((array)($wave0Policy['build_questions'] ?? [])) >= 10, 'Wave 0 governance policy must enforce the full build-question set including exception and recovery logic.');
smoke_assert(in_array('split_registry_path_or_split_write_model', (array)($wave0Policy['rejection_criteria'] ?? []), true), 'Wave 0 governance policy must explicitly reject split registry paths and split write models.');
smoke_assert(is_array($wave0Report), 'Wave 0 governance report asset missing.');
smoke_assert((int)($wave0Report['summary']['core_value_stream_entities'] ?? 0) > 0, 'Wave 0 governance report must classify core value-stream entities.');
smoke_assert((int)($wave0Report['summary']['critical_split_path_risks'] ?? -1) === 0, 'Wave 0 governance report must clear critical split-path risks from the publication path.');
smoke_assert((int)($wave0Report['summary']['planned_canonical_resources'] ?? -1) === 0, 'Wave 0 governance report must clear every planned canonical resource once service-backed slices and schema-backed objects are delivered.');
smoke_assert(array_key_exists('wave0-governance-policy.json', (array)($registryManifest['assets'] ?? [])), 'Registry manifest must register wave0-governance-policy.json.');
smoke_assert(array_key_exists('wave0-governance-report.json', (array)($registryManifest['assets'] ?? [])), 'Registry manifest must register wave0-governance-report.json.');
smoke_assert(is_array($registryManifest['coverage']['wave0_governance'] ?? null), 'Registry manifest must surface Wave 0 governance coverage.');
smoke_assert(is_array($operationalBlindSpotCatalog), 'Operational blind-spot catalog asset missing.');
smoke_assert(count((array)($operationalBlindSpotCatalog['scenarios'] ?? [])) >= 10, 'Operational blind-spot catalog must enumerate real-world backend failure scenarios.');
smoke_assert(is_array($operationalBlindSpotReport), 'Operational blind-spot report asset missing.');
smoke_assert((int)($operationalBlindSpotReport['summary']['scenario_count'] ?? 0) >= 10, 'Operational blind-spot report must assess the real-world scenario set.');
smoke_assert((float)($operationalBlindSpotReport['summary']['idempotency_contract_coverage_ratio'] ?? 0.0) >= 0.90, 'Operational blind-spot report must surface broad idempotency contract coverage.');
smoke_assert((float)($operationalBlindSpotReport['summary']['default_retry_safe_ratio'] ?? 0.0) >= 0.55, 'Operational blind-spot report must show retry-safe defaults above the critical threshold.');
smoke_assert((float)($operationalBlindSpotReport['summary']['idempotency_contract_coverage_ratio'] ?? 0.0) >= 1.0, 'Operational blind-spot report must now show full mutating-surface idempotency contract coverage.');
smoke_assert((float)($operationalBlindSpotReport['summary']['default_retry_safe_ratio'] ?? 0.0) >= 1.0, 'Operational blind-spot report must now show full default retry-safe coverage across the mutating surface.');
smoke_assert((int)($operationalBlindSpotReport['summary']['create_endpoints_requiring_client_key'] ?? -1) === 0, 'Operational blind-spot report must clear create endpoints that still depend on explicit client idempotency keys.');
smoke_assert((string)($operationalBlindSpotById['OPS-001']['current_severity'] ?? '') === 'watch', 'Operational blind-spot report must close duplicate/retry risk once every mutating endpoint has server-backed retry protection.');
smoke_assert((string)($operationalBlindSpotById['OPS-013']['current_severity'] ?? '') === 'watch', 'Operational blind-spot report must demote manual override once it becomes a first-class governed control.');
smoke_assert((string)($operationalBlindSpotById['OPS-011']['current_severity'] ?? '') === 'watch', 'Operational blind-spot report must demote finance posting-period risk once period-close and credit-memo controls exist as first-class objects.');
smoke_assert((string)($operationalBlindSpotById['OPS-015']['current_severity'] ?? '') === 'watch', 'Operational blind-spot report must close legacy-alias ambiguity once the alias moves from unused into formal archive isolation.');
smoke_assert(array_key_exists('operational-blind-spot-catalog.json', (array)($registryManifest['assets'] ?? [])), 'Registry manifest must register operational-blind-spot-catalog.json.');
smoke_assert(array_key_exists('operational-blind-spot-report.json', (array)($registryManifest['assets'] ?? [])), 'Registry manifest must register operational-blind-spot-report.json.');
smoke_assert(is_array($registryManifest['coverage']['operational_blind_spots'] ?? null), 'Registry manifest must surface operational blind-spot coverage.');
smoke_assert(is_array($wave1Policy), 'Wave 1 lifecycle governance policy asset missing.');
smoke_assert(array_key_exists('guarded_transition_runtime', (array)($wave1Policy['lifecycle_modes'] ?? [])), 'Wave 1 lifecycle governance policy must declare guarded_transition_runtime.');
smoke_assert(is_array($wave1Normalization), 'Wave 1 lifecycle normalization asset missing.');
smoke_assert(count((array)($wave1Normalization['normalized_entities'] ?? [])) >= 6, 'Wave 1 lifecycle normalization must target the core lifecycle entities.');
smoke_assert(is_array($wave1Report), 'Wave 1 lifecycle governance report asset missing.');
smoke_assert((int)($wave1Report['summary']['normalized_target_entities_failed'] ?? -1) === 0, 'Wave 1 lifecycle report must pass all normalized target entities.');
smoke_assert((int)($wave1Report['summary']['remaining_generic_status_only_core_entities'] ?? -1) === 0, 'Wave 1 lifecycle report must eliminate generic_status_only from core entities.');
smoke_assert(array_key_exists('wave1-lifecycle-governance-policy.json', (array)($registryManifest['assets'] ?? [])), 'Registry manifest must register wave1-lifecycle-governance-policy.json.');
smoke_assert(array_key_exists('wave1-lifecycle-normalization.json', (array)($registryManifest['assets'] ?? [])), 'Registry manifest must register wave1-lifecycle-normalization.json.');
smoke_assert(array_key_exists('wave1-lifecycle-report.json', (array)($registryManifest['assets'] ?? [])), 'Registry manifest must register wave1-lifecycle-report.json.');
smoke_assert(is_array($registryManifest['coverage']['wave1_lifecycle_governance'] ?? null), 'Registry manifest must surface Wave 1 lifecycle governance coverage.');
smoke_assert(is_array($wave2Policy), 'Wave 2 canonical governance policy asset missing.');
smoke_assert(count((array)($wave2Policy['build_questions'] ?? [])) >= 6, 'Wave 2 canonical governance policy must force canonical-owner, archive, and service-backed exposure questions.');
smoke_assert(in_array('service_backed_governed_control_missing_canonical_list_or_detail_endpoint', (array)($wave2Policy['rejection_criteria'] ?? []), true), 'Wave 2 canonical governance policy must explicitly reject service-backed controls that are not exposed canonically.');
smoke_assert(is_array($wave2Normalization), 'Wave 2 canonical normalization asset missing.');
smoke_assert(count((array)($wave2Normalization['catalog_alignment_targets'] ?? [])) >= 8, 'Wave 2 canonical normalization must register the reviewed catalog alignment targets.');
smoke_assert(is_array($wave2Report), 'Wave 2 canonical governance report asset missing.');
smoke_assert((int)($wave2Report['summary']['canonical_catalog_meta_mismatch'] ?? -1) === 0, 'Wave 2 report must eliminate canonical catalog meta/count drift.');
smoke_assert((int)($wave2Report['summary']['service_backed_resource_gaps'] ?? -1) === 0, 'Wave 2 report must expose all reviewed service-backed controls through canonical slices.');
smoke_assert((int)($wave2Report['summary']['archive_isolation_targets_failed'] ?? -1) === 0, 'Wave 2 report must move declared legacy aliases into archive isolation.');
smoke_assert((int)($wave2Report['summary']['remaining_unused_candidate_entities'] ?? -1) === 0, 'Wave 2 report must clear unused candidates once archive isolation is formalized.');
smoke_assert((int)($wave2Report['summary']['planned_canonical_resources_not_yet_in_registry'] ?? -1) === 0, 'Wave 2 report must close every planned canonical resource once the remaining schema-backed objects are introduced.');
smoke_assert(array_key_exists('wave2-canonical-governance-policy.json', (array)($registryManifest['assets'] ?? [])), 'Registry manifest must register wave2-canonical-governance-policy.json.');
smoke_assert(array_key_exists('wave2-canonical-normalization.json', (array)($registryManifest['assets'] ?? [])), 'Registry manifest must register wave2-canonical-normalization.json.');
smoke_assert(array_key_exists('wave2-canonical-report.json', (array)($registryManifest['assets'] ?? [])), 'Registry manifest must register wave2-canonical-report.json.');
smoke_assert(is_array($registryManifest['coverage']['wave2_canonical_governance'] ?? null), 'Registry manifest must surface Wave 2 canonical governance coverage.');
smoke_assert(is_array($wave3Policy), 'Wave 3 process governance policy asset missing.');
smoke_assert(count((array)($wave3Policy['build_questions'] ?? [])) >= 6, 'Wave 3 governance policy must force purpose, duplicate, gate, alias, and extraction questions.');
smoke_assert(in_array('new_process_object_created_where_a_governed_lifecycle_owner_already_exists', (array)($wave3Policy['rejection_criteria'] ?? []), true), 'Wave 3 governance policy must explicitly reject duplicate process objects.');
smoke_assert(is_array($wave3Normalization), 'Wave 3 process normalization asset missing.');
smoke_assert(count((array)($wave3Normalization['must_introduce_first_class_resources'] ?? [])) >= 1, 'Wave 3 normalization must register at least one extracted lifecycle owner.');
smoke_assert(count((array)($wave3Normalization['do_not_create_duplicate'] ?? [])) >= 4, 'Wave 3 normalization must explicitly block duplicate creation for already-governed process objects.');
smoke_assert(is_array($wave3Report), 'Wave 3 process governance report asset missing.');
smoke_assert((int)($wave3Report['summary']['must_introduce_first_class_failed'] ?? -1) === 0, 'Wave 3 report must pass the extracted process-object targets.');
smoke_assert((int)($wave3Report['summary']['duplicate_guard_failed'] ?? -1) === 0, 'Wave 3 report must pass duplicate suppression targets.');
smoke_assert((int)($wave3Report['summary']['conditional_alias_failed'] ?? -1) === 0, 'Wave 3 report must pass conditional alias retention targets.');
smoke_assert((int)($wave3Report['summary']['remaining_wave3_gaps'] ?? -1) === 0, 'Wave 3 report must classify and close every remaining Wave 3 process-object gap.');
smoke_assert(array_key_exists('wave3-process-governance-policy.json', (array)($registryManifest['assets'] ?? [])), 'Registry manifest must register wave3-process-governance-policy.json.');
smoke_assert(array_key_exists('wave3-process-normalization.json', (array)($registryManifest['assets'] ?? [])), 'Registry manifest must register wave3-process-normalization.json.');
smoke_assert(array_key_exists('wave3-process-report.json', (array)($registryManifest['assets'] ?? [])), 'Registry manifest must register wave3-process-report.json.');
smoke_assert(is_array($registryManifest['coverage']['wave3_process_governance'] ?? null), 'Registry manifest must surface Wave 3 process governance coverage.');
smoke_assert(is_array($wave4Policy), 'Wave 4 production-quality governance policy asset missing.');
smoke_assert(count((array)($wave4Policy['build_questions'] ?? [])) >= 8, 'Wave 4 governance policy must force gate-owner, QA/QC split, result-child, alias, and reaction-loop questions.');
smoke_assert(in_array('inspection_result_or_measurement_row_inherits_parent_workflow_owner', (array)($wave4Policy['rejection_criteria'] ?? []), true), 'Wave 4 governance policy must explicitly reject result or measurement rows inheriting parent workflow ownership.');
smoke_assert(is_array($wave4Normalization), 'Wave 4 production-quality normalization asset missing.');
smoke_assert(count((array)($wave4Normalization['quality_execution_targets'] ?? [])) >= 3, 'Wave 4 normalization must register the full IQC/IPQC/OQC execution backbone.');
smoke_assert(count((array)($wave4Normalization['reaction_loop_targets'] ?? [])) >= 4, 'Wave 4 normalization must register NCR/CAPA/SPC/MSA reaction-loop coverage.');
smoke_assert(is_array($wave4Report), 'Wave 4 production-quality governance report asset missing.');
smoke_assert((int)($wave4Report['summary']['quality_execution_failed'] ?? -1) === 0, 'Wave 4 report must pass all IQC/IPQC/OQC execution targets.');
smoke_assert((int)($wave4Report['summary']['inspection_backbone_failed'] ?? -1) === 0, 'Wave 4 report must keep plans, lots, and result rows in the right lifecycle class.');
smoke_assert((int)($wave4Report['summary']['reaction_loop_failed'] ?? -1) === 0, 'Wave 4 report must pass NCR/CAPA/SPC/MSA reaction-loop targets.');
smoke_assert((int)($wave4Report['summary']['qa_qc_role_split_failed'] ?? -1) === 0, 'Wave 4 report must pass the QA/QC role-split workflow targets.');
smoke_assert((int)($wave4Report['summary']['alias_resolution_failed'] ?? -1) === 0, 'Wave 4 report must keep FQC in alias-only mode until a distinct finished-goods gate exists.');
smoke_assert((int)($wave4Report['summary']['remaining_wave4_gaps'] ?? -1) === 0, 'Wave 4 report must close every production-quality governance gap.');
smoke_assert(array_key_exists('wave4-production-quality-governance-policy.json', (array)($registryManifest['assets'] ?? [])), 'Registry manifest must register wave4-production-quality-governance-policy.json.');
smoke_assert(array_key_exists('wave4-production-quality-normalization.json', (array)($registryManifest['assets'] ?? [])), 'Registry manifest must register wave4-production-quality-normalization.json.');
smoke_assert(array_key_exists('wave4-production-quality-report.json', (array)($registryManifest['assets'] ?? [])), 'Registry manifest must register wave4-production-quality-report.json.');
smoke_assert(is_array($registryManifest['coverage']['wave4_production_quality_governance'] ?? null), 'Registry manifest must surface Wave 4 production-quality governance coverage.');
smoke_assert(is_array($wave5Policy), 'Wave 5 maintenance/EHS governance policy asset missing.');
smoke_assert(count((array)($wave5Policy['build_questions'] ?? [])) >= 8, 'Wave 5 governance policy must force purpose, state-practicality, canonical-owner, role-guard, and alias-boundary questions.');
smoke_assert(in_array('live_maintenance_or_ehs_owner_left_on_placeholder_digital_thread_status', (array)($wave5Policy['rejection_criteria'] ?? []), true), 'Wave 5 governance policy must explicitly reject placeholder digital-thread states for live maintenance or EHS owners.');
smoke_assert(is_array($wave5Normalization), 'Wave 5 maintenance/EHS normalization asset missing.');
smoke_assert(count((array)($wave5Normalization['execution_targets'] ?? [])) >= 7, 'Wave 5 normalization must register the maintenance/EHS/compliance execution owners.');
smoke_assert(count((array)($wave5Normalization['practical_state_targets'] ?? [])) >= 4, 'Wave 5 normalization must register the live owners that must leave placeholder status sets behind.');
smoke_assert(is_array($wave5Report), 'Wave 5 maintenance/EHS governance report asset missing.');
smoke_assert((int)($wave5Report['summary']['execution_failed'] ?? -1) === 0, 'Wave 5 report must pass the maintenance/EHS/compliance execution targets.');
smoke_assert((int)($wave5Report['summary']['practical_state_failed'] ?? -1) === 0, 'Wave 5 report must eliminate placeholder digital-thread state models from live Wave 5 owners.');
smoke_assert((int)($wave5Report['summary']['canonical_owner_failed'] ?? -1) === 0, 'Wave 5 report must align canonical maintenance/EHS resources to live tables.');
smoke_assert((int)($wave5Report['summary']['contextual_alias_failed'] ?? -1) === 0, 'Wave 5 report must keep maintenance aliases linked back to canonical equipment identity.');
smoke_assert((int)($wave5Report['summary']['relationship_truth_failed'] ?? -1) === 0, 'Wave 5 report must remove false maintenance/EHS relationship claims.');
smoke_assert((int)($wave5Report['summary']['workflow_role_guard_failed'] ?? -1) === 0, 'Wave 5 report must enforce role-guard coverage on critical maintenance/EHS close transitions.');
smoke_assert((int)($wave5Report['summary']['remaining_wave5_gaps'] ?? -1) === 0, 'Wave 5 report must classify and close every remaining maintenance/EHS governance gap.');
smoke_assert(array_key_exists('wave5-maintenance-ehs-governance-policy.json', (array)($registryManifest['assets'] ?? [])), 'Registry manifest must register wave5-maintenance-ehs-governance-policy.json.');
smoke_assert(array_key_exists('wave5-maintenance-ehs-normalization.json', (array)($registryManifest['assets'] ?? [])), 'Registry manifest must register wave5-maintenance-ehs-normalization.json.');
smoke_assert(array_key_exists('wave5-maintenance-ehs-report.json', (array)($registryManifest['assets'] ?? [])), 'Registry manifest must register wave5-maintenance-ehs-report.json.');
smoke_assert(is_array($registryManifest['coverage']['wave5_maintenance_ehs_governance'] ?? null), 'Registry manifest must surface Wave 5 maintenance/EHS governance coverage.');
smoke_assert(is_array($wave6Policy), 'Wave 6 finance/projection governance policy asset missing.');
smoke_assert(count((array)($wave6Policy['build_questions'] ?? [])) >= 8, 'Wave 6 governance policy must force gate-purpose, projection-boundary, lineage, and audit questions.');
smoke_assert(in_array('projection_or_snapshot_published_with_generic_create_update_delete_surface', (array)($wave6Policy['rejection_criteria'] ?? []), true), 'Wave 6 governance policy must explicitly reject editable CRUD publication for projections and snapshots.');
smoke_assert(is_array($wave6Normalization), 'Wave 6 finance/projection normalization asset missing.');
smoke_assert(count((array)($wave6Normalization['service_finance_gate_targets'] ?? [])) >= 4, 'Wave 6 normalization must register the service-backed finance control owners.');
smoke_assert(count((array)($wave6Normalization['projection_read_model_targets'] ?? [])) >= 6, 'Wave 6 normalization must register the released projection read models that must become read-only.');
smoke_assert(is_array($wave6Report), 'Wave 6 finance/projection governance report asset missing.');
smoke_assert((int)($wave6Report['summary']['service_finance_gate_failed'] ?? -1) === 0, 'Wave 6 report must pass the service-backed finance gate targets.');
smoke_assert((int)($wave6Report['summary']['projection_read_model_failed'] ?? -1) === 0, 'Wave 6 report must remove editable CRUD publication from valuation and snapshot projections.');
smoke_assert((int)($wave6Report['summary']['projection_lineage_failed'] ?? -1) === 0, 'Wave 6 report must enforce lineage fields on every governed valuation or KPI projection.');
smoke_assert((int)($wave6Report['summary']['relationship_truth_failed'] ?? -1) === 0, 'Wave 6 report must close relationship-truth gaps for finance and plant-performance projections.');
smoke_assert((int)($wave6Report['summary']['remaining_wave6_gaps'] ?? -1) === 0, 'Wave 6 report must classify and close every finance/projection governance gap.');
smoke_assert(array_key_exists('wave6-finance-projection-governance-policy.json', (array)($registryManifest['assets'] ?? [])), 'Registry manifest must register wave6-finance-projection-governance-policy.json.');
smoke_assert(array_key_exists('wave6-finance-projection-normalization.json', (array)($registryManifest['assets'] ?? [])), 'Registry manifest must register wave6-finance-projection-normalization.json.');
smoke_assert(array_key_exists('wave6-finance-projection-report.json', (array)($registryManifest['assets'] ?? [])), 'Registry manifest must register wave6-finance-projection-report.json.');
smoke_assert(is_array($registryManifest['coverage']['wave6_finance_projection_governance'] ?? null), 'Registry manifest must surface Wave 6 finance/projection governance coverage.');
$wave6RelationshipTargets = (array)($wave6Normalization['relationship_truth_targets'] ?? []);
foreach ($wave6RelationshipTargets as $resourceKey => $spec) {
    [$domainKey, $resourceName] = array_pad(explode('.', (string)$resourceKey, 2), 2, null);
    $canonicalResource = (array)((($canonicalCatalog['domains'][$domainKey]['resources'] ?? [])[$resourceName] ?? []) ?: []);
    $actualRelationships = (array)($canonicalResource['key_relationships'] ?? []);
    foreach ((array)($spec['expected_relationships'] ?? []) as $expectedRelationship) {
        smoke_assert(
            in_array($expectedRelationship, $actualRelationships, true),
            "Wave 6 relationship truth for {$resourceKey} must include {$expectedRelationship}."
        );
    }
    if (array_key_exists('expected_release_snapshot_of', (array)$spec)) {
        smoke_assert(
            ($canonicalResource['release_snapshot_of'] ?? null) === $spec['expected_release_snapshot_of'],
            "Wave 6 relationship truth for {$resourceKey} must preserve release_snapshot_of={$spec['expected_release_snapshot_of']}."
        );
    }
}
$wave6ProjectionTargets = (array)($wave6Normalization['projection_read_model_targets'] ?? []);
foreach ($wave6ProjectionTargets as $entityKey => $spec) {
    $entity = (array)($frontendEntityMap[$entityKey] ?? []);
    $actions = (array)($entity['actions'] ?? []);
    $formState = $entity['capabilities']['form']['state'] ?? null;
    smoke_assert(($entity['profile'] ?? null) === ($spec['expected_profile'] ?? null), "Wave 6 projection {$entityKey} must publish with profile {$spec['expected_profile']}.");
    foreach ((array)($spec['required_actions'] ?? []) as $requiredAction) {
        smoke_assert(!empty($actions[$requiredAction] ?? null), "Wave 6 projection {$entityKey} must retain {$requiredAction}.");
    }
    foreach ((array)($spec['forbidden_actions'] ?? []) as $forbiddenAction) {
        smoke_assert(empty($actions[$forbiddenAction] ?? null), "Wave 6 projection {$entityKey} must not publish {$forbiddenAction}.");
    }
    smoke_assert($formState === 'not_applicable', "Wave 6 projection {$entityKey} must not publish editable forms.");
    $tablePolicy = (array)($runtimeAccessPolicy['tables'][$spec['table']] ?? []);
    foreach ((array)($spec['forbidden_actions'] ?? []) as $forbiddenAction) {
        smoke_assert((array)($tablePolicy[$forbiddenAction] ?? ['unexpected']) === [], "Wave 6 runtime policy must block {$forbiddenAction} for {$spec['table']}.");
    }
}
$wave6LineageTargets = (array)($wave6Normalization['projection_lineage_targets'] ?? []);
foreach ($wave6LineageTargets as $tableName => $spec) {
    $columns = array_keys((array)($tableRegistryMap[$tableName]['columns'] ?? []));
    foreach ((array)($spec['required_columns'] ?? []) as $columnName) {
        smoke_assert(in_array($columnName, $columns, true), "Wave 6 projection table {$tableName} must include lineage column {$columnName}.");
    }
}
$incomingInspectionTransitionRuntime = (array)(($endpointMap['quality_management.incoming_inspections.transition']['workflow']['runtime'] ?? []) ?: (($endpointMap['quality_management.incoming_inspections.transition']['capabilities']['workflow_runtime'] ?? [])));
$ipqcTransitionRuntime = (array)(($endpointMap['quality_management.ipqc_inspections.transition']['workflow']['runtime'] ?? []) ?: (($endpointMap['quality_management.ipqc_inspections.transition']['capabilities']['workflow_runtime'] ?? [])));
$oqcTransitionRuntime = (array)(($endpointMap['quality_management.oqc_inspections.transition']['workflow']['runtime'] ?? []) ?: (($endpointMap['quality_management.oqc_inspections.transition']['capabilities']['workflow_runtime'] ?? [])));
$pmPlanTransitionRuntime = (array)(($endpointMap['plant_maintenance.pm_maintenance_plans.transition']['workflow']['runtime'] ?? []) ?: (($endpointMap['plant_maintenance.pm_maintenance_plans.transition']['capabilities']['workflow_runtime'] ?? [])));
$pmEquipmentTransitionRuntime = (array)(($endpointMap['plant_maintenance.pm_equipment_master.transition']['workflow']['runtime'] ?? []) ?: (($endpointMap['plant_maintenance.pm_equipment_master.transition']['capabilities']['workflow_runtime'] ?? [])));
$incidentTransitionRuntime = (array)(($endpointMap['ehs_sustainability.ehs_incidents.transition']['workflow']['runtime'] ?? []) ?: (($endpointMap['ehs_sustainability.ehs_incidents.transition']['capabilities']['workflow_runtime'] ?? [])));
$permitTransitionRuntime = (array)(($endpointMap['ehs_sustainability.ehs_permit_register.transition']['workflow']['runtime'] ?? []) ?: (($endpointMap['ehs_sustainability.ehs_permit_register.transition']['capabilities']['workflow_runtime'] ?? [])));
$safetyObservationTransitionRuntime = (array)(($endpointMap['ehs_sustainability.safety_observations.transition']['workflow']['runtime'] ?? []) ?: (($endpointMap['ehs_sustainability.safety_observations.transition']['capabilities']['workflow_runtime'] ?? [])));
$complianceObligationTransitionRuntime = (array)(($endpointMap['quality_lab.qual_compliance_obligations.transition']['workflow']['runtime'] ?? []) ?: (($endpointMap['quality_lab.qual_compliance_obligations.transition']['capabilities']['workflow_runtime'] ?? [])));
$fiveSAuditTransitionRuntime = (array)(($endpointMap['lean_manufacturing.lean_5s_audits.transition']['workflow']['runtime'] ?? []) ?: (($endpointMap['lean_manufacturing.lean_5s_audits.transition']['capabilities']['workflow_runtime'] ?? [])));
$incomingInspectionResultsEntity = (array)($frontendEntityMap['quality_management.incoming_inspection_results'] ?? []);
$spcEntity = (array)($frontendEntityMap['quality_management.spc_data'] ?? []);
$grrEntity = (array)($frontendEntityMap['calibration_equipment.calibration_grr_studies'] ?? []);
$canonicalIqc = (array)($canonicalCatalog['domains']['procurement_supplier_quality']['resources']['iqc-inspections'] ?? []);
$canonicalOqc = (array)($canonicalCatalog['domains']['quality_improvement']['resources']['oqc-inspections'] ?? []);
$canonicalFqc = (array)($canonicalCatalog['domains']['quality_improvement']['resources']['fqc-inspections'] ?? []);
$canonicalSpc = (array)($canonicalCatalog['domains']['quality_improvement']['resources']['spc-observations'] ?? []);
smoke_assert(($incomingInspectionTransitionRuntime['lifecycle_mode'] ?? null) === 'persisted', 'Incoming inspection transition must remain a persisted workflow gate.');
smoke_assert(($incomingInspectionTransitionRuntime['transition_execution_guard'] ?? null) === 'workflow_engine', 'Incoming inspection transition must execute through the workflow engine.');
smoke_assert((bool)(($incomingInspectionTransitionRuntime['engine_bridge']['ready'] ?? false)) === true, 'Incoming inspection transition must advertise a ready workflow-engine bridge.');
smoke_assert(($ipqcTransitionRuntime['lifecycle_mode'] ?? null) === 'persisted', 'IPQC transition must be upgraded from guarded runtime to persisted workflow execution.');
smoke_assert(($ipqcTransitionRuntime['transition_execution_guard'] ?? null) === 'workflow_engine', 'IPQC transition must execute through the workflow engine once Wave 4 closes.');
smoke_assert((bool)(($ipqcTransitionRuntime['engine_bridge']['ready'] ?? false)) === true, 'IPQC transition must advertise a ready workflow-engine bridge.');
smoke_assert(($oqcTransitionRuntime['lifecycle_mode'] ?? null) === 'persisted', 'OQC transition must be upgraded from guarded runtime to persisted workflow execution.');
smoke_assert(($oqcTransitionRuntime['transition_execution_guard'] ?? null) === 'workflow_engine', 'OQC transition must execute through the workflow engine once Wave 4 closes.');
smoke_assert((bool)(($oqcTransitionRuntime['engine_bridge']['ready'] ?? false)) === true, 'OQC transition must advertise a ready workflow-engine bridge.');
smoke_assert(($incomingInspectionResultsEntity['profile'] ?? null) === 'transactional_record', 'Incoming inspection results must publish as transactional evidence, not governed cases.');
smoke_assert((($incomingInspectionResultsEntity['capabilities']['workflow']['state'] ?? null) === 'not_applicable'), 'Incoming inspection results must not advertise workflow readiness.');
smoke_assert(empty($tableRegistryMap['incoming_inspection_results']['workflowId'] ?? null), 'Incoming inspection results must not inherit the parent receiving workflow owner.');
smoke_assert(($spcEntity['profile'] ?? null) === 'transactional_record', 'SPC must remain a transactional evidence stream.');
smoke_assert(($grrEntity['profile'] ?? null) === 'assessment_record', 'MSA/GRR must publish as an assessment record.');
smoke_assert(($canonicalIqc['table'] ?? null) === 'incoming_inspections', 'Canonical IQC resource must point at the live incoming_inspections table.');
smoke_assert(($canonicalIqc['primary_key'] ?? null) === 'inspection_id', 'Canonical IQC resource must use inspection_id as the primary key.');
smoke_assert(($canonicalOqc['primary_key'] ?? null) === 'oqc_id', 'Canonical OQC resource must use oqc_id as the primary key.');
smoke_assert(($canonicalOqc['status_column'] ?? null) === 'result', 'Canonical OQC resource must use result as the quality disposition column.');
smoke_assert(($canonicalFqc['table'] ?? null) === 'oqc_inspections', 'Canonical FQC resource must stay mapped to OQC until a real split gate exists.');
smoke_assert((bool)($canonicalFqc['alias_only'] ?? false) === true, 'Canonical FQC resource must be flagged alias_only until a distinct finished-goods gate exists.');
smoke_assert(($canonicalSpc['table'] ?? null) === 'spc_data', 'Canonical SPC resource must point at the live spc_data table.');
$ipqcTransitionRoles = [];
foreach ((array)($workflowMap['wf_ipqc_inspection']['transitions'] ?? []) as $transition) {
    $key = (string)($transition['from'] ?? '') . '->' . (string)($transition['to'] ?? '');
    $roles = [];
    foreach ((array)($transition['guards'] ?? []) as $guard) {
        if (($guard['type'] ?? null) !== 'role') {
            continue;
        }
        foreach ((array)($guard['roles'] ?? []) as $role) {
            $roles[] = (string)$role;
        }
    }
    $ipqcTransitionRoles[$key] = array_values(array_unique($roles));
}
smoke_assert(in_array('production_planner', (array)($ipqcTransitionRoles['queued->in_progress'] ?? []), true), 'IPQC queued->in_progress must preserve the mixed QA/QC handoff role for production_planner.');
smoke_assert(in_array('quality_engineer', (array)($ipqcTransitionRoles['queued->in_progress'] ?? []), true), 'IPQC queued->in_progress must preserve QA authority for quality_engineer.');
smoke_assert(in_array('quality_manager', (array)($ipqcTransitionRoles['in_progress->rejected'] ?? []), true), 'IPQC reject disposition must preserve quality-manager authority.');
smoke_assert(($pmPlanTransitionRuntime['lifecycle_mode'] ?? null) === 'persisted', 'PM maintenance plans must run on a persisted workflow lifecycle, not placeholder status aliases.');
smoke_assert(($pmPlanTransitionRuntime['transition_execution_guard'] ?? null) === 'workflow_engine', 'PM maintenance plans must execute transitions through the workflow engine.');
smoke_assert(($pmEquipmentTransitionRuntime['lifecycle_mode'] ?? null) === 'persisted', 'PM equipment master must run on a persisted workflow lifecycle.');
smoke_assert(($incidentTransitionRuntime['lifecycle_mode'] ?? null) === 'persisted', 'EHS incidents must be upgraded from guarded runtime to persisted workflow execution.');
smoke_assert(($permitTransitionRuntime['lifecycle_mode'] ?? null) === 'persisted', 'EHS permits must remain persisted once Wave 5 replaces placeholder status aliases.');
smoke_assert(($safetyObservationTransitionRuntime['lifecycle_mode'] ?? null) === 'persisted', 'Safety observations must be upgraded from guarded runtime to persisted workflow execution.');
smoke_assert(($complianceObligationTransitionRuntime['lifecycle_mode'] ?? null) === 'persisted', 'Compliance obligations must be upgraded from guarded runtime to persisted workflow execution.');
smoke_assert(($fiveSAuditTransitionRuntime['lifecycle_mode'] ?? null) === 'persisted', '5S audits must run on a persisted workflow lifecycle.');
$canonicalIncident = (array)($canonicalCatalog['domains']['maintenance_ehs']['resources']['incidents'] ?? []);
$canonicalPermit = (array)($canonicalCatalog['domains']['maintenance_ehs']['resources']['permits'] ?? []);
$canonicalFiveS = (array)($canonicalCatalog['domains']['maintenance_ehs']['resources']['five-s-audits'] ?? []);
$canonicalComplianceObligation = (array)($canonicalCatalog['domains']['master_data']['resources']['compliance-obligations'] ?? []);
smoke_assert(($canonicalIncident['table'] ?? null) === 'ehs_incidents', 'Canonical incident resource must point at the live ehs_incidents table.');
smoke_assert(($canonicalPermit['table'] ?? null) === 'ehs_permit_register', 'Canonical permit resource must point at the live ehs_permit_register table.');
smoke_assert(($canonicalComplianceObligation['table'] ?? null) === 'qual_compliance_obligations', 'Canonical compliance-obligation resource must point at the live qual_compliance_obligations table.');
smoke_assert(($canonicalFiveS['table'] ?? null) === 'lean_5s_audits', 'Canonical 5S audit resource must point at the live lean_5s_audits table.');
$permitStates = array_column((array)($statusOptionsRegistry['ehs_permit_register_status_set']['options'] ?? []), 'value');
$pmEquipmentStates = array_column((array)($statusOptionsRegistry['pm_equipment_master_status_set']['options'] ?? []), 'value');
$pmPlanStates = array_column((array)($statusOptionsRegistry['pm_maintenance_plans_status_set']['options'] ?? []), 'value');
$fiveSStates = array_column((array)($statusOptionsRegistry['lean_5s_audits_status_set']['options'] ?? []), 'value');
smoke_assert(($statusOptionsRegistry['ehs_permit_register_status_set']['aliasOf'] ?? null) === null, 'EHS permit register status set must stop aliasing digital_thread_status.');
smoke_assert(($statusOptionsRegistry['pm_equipment_master_status_set']['aliasOf'] ?? null) === null, 'PM equipment master status set must stop aliasing digital_thread_status.');
smoke_assert(($statusOptionsRegistry['pm_maintenance_plans_status_set']['aliasOf'] ?? null) === null, 'PM maintenance plan status set must stop aliasing digital_thread_status.');
smoke_assert(($statusOptionsRegistry['lean_5s_audits_status_set']['aliasOf'] ?? null) === null, '5S audit status set must stop aliasing digital_thread_status.');
smoke_assert($permitStates === ['draft', 'submitted', 'approved', 'active', 'suspended', 'expired', 'closed', 'archived'], 'EHS permit register must publish the practical permit-to-work lifecycle.');
smoke_assert($pmEquipmentStates === ['commissioning', 'qualified', 'active', 'on_hold', 'lockout', 'retired', 'archived'], 'PM equipment master must publish the practical equipment lifecycle.');
smoke_assert($pmPlanStates === ['draft', 'approved', 'active', 'on_hold', 'retired', 'archived'], 'PM maintenance plans must publish the practical PM-plan lifecycle.');
smoke_assert($fiveSStates === ['planned', 'in_progress', 'follow_up', 'verified', 'closed', 'archived'], '5S audits must publish the practical lean follow-up lifecycle.');
$pmEquipmentEntity = (array)($frontendEntityMap['plant_maintenance.pm_equipment_master'] ?? []);
$pmEquipmentQuickRefs = (array)($pmEquipmentEntity['detail_layout']['quick_view_refs'] ?? []);
$pmEquipmentLookupFound = false;
foreach ($pmEquipmentQuickRefs as $ref) {
    if (($ref['endpoint'] ?? null) === 'calibration_equipment.equipment.list' && ($ref['via_field'] ?? null) === 'equipment_id') {
        $pmEquipmentLookupFound = true;
        break;
    }
}
smoke_assert($pmEquipmentLookupFound === true, 'PM equipment master must keep a quick-view link back to the canonical equipment entity via equipment_id.');
$wave5RoleChecks = [
    'wf_pm_maintenance_plan' => ['draft->approved' => 'maintenance_supervisor'],
    'wf_pm_equipment_master' => ['active->lockout' => 'plant_manager'],
    'wf_ehs_incident' => ['corrective_action->closed' => 'quality_manager'],
    'wf_quality_obligation' => ['open->waived' => 'plant_manager'],
    'wf_ehs_permit_register' => ['submitted->approved' => 'quality_manager'],
    'wf_safety_observation' => ['in_progress->closed' => 'quality_manager'],
    'wf_lean_5s_audit' => ['follow_up->verified' => 'quality_manager'],
];
foreach ($wave5RoleChecks as $workflowId => $checks) {
    $transitionRoles = [];
    foreach ((array)($workflowMap[$workflowId]['transitions'] ?? []) as $transition) {
        $key = (string)($transition['from'] ?? '') . '->' . (string)($transition['to'] ?? '');
        $roles = [];
        foreach ((array)($transition['guards'] ?? []) as $guard) {
            if (($guard['type'] ?? null) !== 'role') {
                continue;
            }
            foreach ((array)($guard['roles'] ?? []) as $role) {
                $roles[] = (string)$role;
            }
        }
        $transitionRoles[$key] = array_values(array_unique($roles));
    }
    foreach ($checks as $transitionKey => $expectedRole) {
        smoke_assert(in_array($expectedRole, (array)($transitionRoles[$transitionKey] ?? []), true), "Wave 5 workflow {$workflowId} must guard {$transitionKey} with {$expectedRole}.");
    }
}
smoke_assert(is_array($operationalStressPolicy), 'Operational stress governance policy asset missing.');
smoke_assert(count((array)($operationalStressPolicy['build_questions'] ?? [])) >= 10, 'Operational stress governance policy must force retry, compensation, override, archive, and backdate design questions.');
smoke_assert(in_array('create_or_side_effect_action_without_duplicate_or_retry_control', (array)($operationalStressPolicy['rejection_criteria'] ?? []), true), 'Operational stress governance policy must explicitly reject duplicate-unsafe side-effect actions.');
smoke_assert(is_array($operationalStressCatalog), 'Operational stress catalog asset missing.');
smoke_assert(count((array)($operationalStressCatalog['scenarios'] ?? [])) >= 10, 'Operational stress catalog must enumerate stress and exception scenarios beyond blind-spot coverage.');
smoke_assert(is_array($operationalStressReport), 'Operational stress report asset missing.');
smoke_assert((int)($operationalStressReport['summary']['scenario_count'] ?? 0) >= 10, 'Operational stress report must assess the stress scenario set.');
smoke_assert((float)($operationalStressReport['summary']['idempotency_contract_coverage_ratio'] ?? 0.0) >= 0.90, 'Operational stress report must surface broad idempotency contract coverage.');
smoke_assert((float)($operationalStressReport['summary']['default_retry_safe_ratio'] ?? 0.0) >= 0.55, 'Operational stress report must keep default retry safety above the critical floor.');
smoke_assert((float)($operationalStressReport['summary']['idempotency_contract_coverage_ratio'] ?? 0.0) >= 1.0, 'Operational stress report must now show full mutating-surface idempotency contract coverage.');
smoke_assert((float)($operationalStressReport['summary']['default_retry_safe_ratio'] ?? 0.0) >= 1.0, 'Operational stress report must now show full default retry-safe coverage across the mutating surface.');
smoke_assert((int)($operationalStressReport['summary']['create_endpoints_requiring_client_key'] ?? -1) === 0, 'Operational stress report must clear create endpoints that still require client-supplied idempotency keys for safe retry.');
smoke_assert((int)($operationalStressReport['summary']['override_resources'] ?? 0) >= 1, 'Operational stress report must detect at least one first-class override resource.');
smoke_assert((string)($operationalStressById['STR-001']['current_severity'] ?? '') === 'watch', 'Operational stress report must close retry and duplicate side-effect risk once every mutating endpoint has server-backed retry protection.');
smoke_assert((string)($operationalStressById['STR-002']['current_severity'] ?? '') === 'watch', 'Operational stress report must reduce partial-completion recovery risk to watch once compensation, correction, and reconciliation semantics are first-class enough for governed follow-up.');
smoke_assert((string)($operationalStressById['STR-006']['current_severity'] ?? '') === 'watch', 'Operational stress report must reduce override risk to watch once typed, signed, timeboxed override controls exist.');
smoke_assert((string)($operationalStressById['STR-012']['current_severity'] ?? '') === 'watch', 'Operational stress report must reduce AP/AR correction and period-close risk to watch once first-class control objects exist, even before full invoice-model separation.');
smoke_assert(array_key_exists('operational-stress-governance-policy.json', (array)($registryManifest['assets'] ?? [])), 'Registry manifest must register operational-stress-governance-policy.json.');
smoke_assert(array_key_exists('operational-stress-catalog.json', (array)($registryManifest['assets'] ?? [])), 'Registry manifest must register operational-stress-catalog.json.');
smoke_assert(array_key_exists('operational-stress-report.json', (array)($registryManifest['assets'] ?? [])), 'Registry manifest must register operational-stress-report.json.');
smoke_assert(is_array($registryManifest['coverage']['operational_stress_governance'] ?? null), 'Registry manifest must surface operational stress governance coverage.');

$moduleBuilderSource = (string)file_get_contents(QMS_TEST_BASE_DIR . '/scripts/portal/31-module-builder.js');
$blockEngineSource = (string)file_get_contents(QMS_TEST_BASE_DIR . '/scripts/portal/00-block-engine.js');
smoke_assert(strpos($moduleBuilderSource, 'runtime-access-policy') !== false, 'Module Builder must load runtime-access-policy metadata.');
smoke_assert(strpos($moduleBuilderSource, 'publishability') !== false, 'Module Builder must surface publishability metadata instead of relying on a green-only quality gate.');
smoke_assert(strpos($blockEngineSource, '_recordDetailRuntimeFields') !== false, 'Block engine must synthesize record-detail runtime fields from config.detail.');
smoke_assert(strpos($blockEngineSource, 'hm-record-detail-header') !== false, 'Block engine record-detail renderer must consume summary metadata from config.detail.');

$frontendFoundation = json_decode((string)file_get_contents(QMS_TEST_DATA_DIR . '/registry/frontend-foundation-catalog.json'), true);
$documentDistributionFoundation = (array)($frontendFoundation['entities']['document_control.document_distribution'] ?? []);
smoke_assert(($documentDistributionFoundation['interaction_contracts']['attachments']['list_endpoint'] ?? null) === 'system_infrastructure.file_attachments.list', 'Document distribution must inherit the generic attachment list contract.');
smoke_assert(($documentDistributionFoundation['interaction_contracts']['comments']['list_endpoint'] ?? null) === 'system_infrastructure.comments.list', 'Document distribution must inherit the generic comment list contract.');
smoke_assert(($documentDistributionFoundation['interaction_contracts']['activities']['list_endpoint'] ?? null) === 'crm.crm_activities.list', 'Document distribution must inherit the generic activity list contract when source_record_id is available.');
smoke_assert(in_array('attachments', array_column((array)($documentDistributionFoundation['interaction_contracts']['timeline_sources'] ?? []), 'kind'), true), 'Document distribution timeline must include attachment events once interaction contracts exist.');
smoke_assert(in_array('comments', array_column((array)($documentDistributionFoundation['interaction_contracts']['timeline_sources'] ?? []), 'kind'), true), 'Document distribution timeline must include comment events once interaction contracts exist.');

$dbProfileLayer = new \MOM\Database\DataLayer(QMS_TEST_DATA_DIR, QMS_TEST_ROOT_DIR, [
    'host' => 'db.example.internal',
    'port' => 5432,
    'database' => 'mom',
    'username' => 'mom_app',
    'password' => 'secret',
    'schema' => 'public',
    'sslmode' => 'prefer',
    'connect_timeout' => 1,
    'statement_timeout' => 1000,
    'use_postgres' => false,
    'shadow_write' => true,
    'json_fallback' => true,
    'allow_empty_password' => false,
]);
$dbProfileSummary = $dbProfileLayer->getModeSummary();
smoke_assert(($dbProfileSummary['database_configured'] ?? false) === true, 'Runtime data layer summary must detect an explicit DB profile even when runtime stays JSON_ONLY.');
smoke_assert(array_key_exists('database_probe_reachable', $dbProfileSummary), 'Runtime data layer summary must expose direct DB probe reachability.');
smoke_assert(array_key_exists('database_probe_error', $dbProfileSummary), 'Runtime data layer summary must expose direct DB probe errors without fatals.');

$emptyPasswordLayer = new \MOM\Database\DataLayer(QMS_TEST_DATA_DIR, QMS_TEST_ROOT_DIR, [
    'host' => 'localhost',
    'port' => 5432,
    'database' => 'mom',
    'username' => 'mom_app',
    'password' => '',
    'schema' => 'public',
    'sslmode' => 'prefer',
    'connect_timeout' => 1,
    'statement_timeout' => 1000,
    'use_postgres' => false,
    'shadow_write' => true,
    'json_fallback' => true,
    'allow_empty_password' => true,
]);
$emptyPasswordSummary = $emptyPasswordLayer->getModeSummary();
smoke_assert(($emptyPasswordSummary['database_configured'] ?? false) === true, 'Runtime data layer summary must only treat empty-password DB profiles as configured when explicitly allowed.');

$gitCommand = git_shell_command(QMS_TEST_ROOT_DIR, ['status', '--short']);
$normalizedRoot = str_replace('\\', '/', QMS_TEST_ROOT_DIR);
smoke_assert(strpos($gitCommand, "safe.directory={$normalizedRoot}") !== false, 'Git helper must pin the repository as a safe.directory so Admin git operations work under the web execution user.');
smoke_assert(strpos($gitCommand, 'status') !== false, 'Git helper must still append the requested git arguments after safe.directory injection.');
smoke_assert(method_exists(\MOM\Database\Connection::class, 'executeScript'), 'Database connection must expose executeScript() so migration runners can execute multi-statement SQL batches safely.');

echo "backend smoke tests passed\n";

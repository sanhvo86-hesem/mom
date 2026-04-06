<?php

declare(strict_types=1);

require __DIR__ . '/bootstrap.php';

ini_set('memory_limit', '1024M');

use HESEM\QMS\Api\Controllers\AuthController;
use HESEM\QMS\Api\Controllers\AiSchedulingController;
use HESEM\QMS\Api\Controllers\AllocationController;
use HESEM\QMS\Api\Controllers\CiController;
use HESEM\QMS\Api\Controllers\ComplianceReportController;
use HESEM\QMS\Api\Controllers\CncProgramController;
use HESEM\QMS\Api\Controllers\CustomerPortalController;
use HESEM\QMS\Api\Controllers\DashboardController;
use HESEM\QMS\Api\Controllers\DocumentController;
use HESEM\QMS\Api\Controllers\DispatchController;
use HESEM\QMS\Api\Controllers\ExitException;
use HESEM\QMS\Api\Controllers\FileController;
use HESEM\QMS\Api\Controllers\FormController;
use HESEM\QMS\Api\Controllers\EnergyController;
use HESEM\QMS\Api\Controllers\GenericCrudController;
use HESEM\QMS\Api\Controllers\KnowledgeController;
use HESEM\QMS\Api\Controllers\LogisticsController;
use HESEM\QMS\Api\Controllers\MobileController;
use HESEM\QMS\Api\Controllers\MasterDataController;
use HESEM\QMS\Api\Controllers\ModuleSchemaController;
use HESEM\QMS\Api\Controllers\ProductPassportController;
use HESEM\QMS\Api\Controllers\RegistryController;
use HESEM\QMS\Api\Controllers\SchemaStudioController;
use HESEM\QMS\Api\Controllers\UserController;
use HESEM\QMS\Api\Middleware\AuthMiddleware;
use HESEM\QMS\Api\Middleware\CorsMiddleware;
use HESEM\QMS\Api\Middleware\RateLimitMiddleware;
use HESEM\QMS\Api\Router;
use HESEM\QMS\Api\Services\GenericCrudService;
use HESEM\QMS\Api\Services\WorkflowBridgeRequiredException;
use HESEM\QMS\Database\DataLayer;

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
$_GET['path'] = '01-QMS-Portal/portal.html';
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
$_GET['path'] = '01-QMS-Portal/portal.html';
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
$resolveManagedDocument = new ReflectionMethod($fileController, 'resolveManagedDocumentRecord');
$resolveManagedDocument->setAccessible(true);
try {
    $resolveManagedDocument->invoke($fileController, 'PORTAL', '01-QMS-Portal/portal.html');
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
    smoke_assert(is_array($e->getPayload()['designs'] ?? null), 'Schema Studio read payload missing designs array.');
}

// Schema Studio DB-backed surfaces must now be limited to DB-admin roles, not generic schema editors.
$schemaStudioGuardController = (new SchemaStudioController($dataLayer, QMS_TEST_ROOT_DIR, QMS_TEST_DATA_DIR))->setStore($builderStore);
$schemaStudioDbGuard = new ReflectionMethod($schemaStudioGuardController, 'requireDatabaseAccess');
$schemaStudioDbGuard->setAccessible(true);
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
smoke_assert(!user_has_any_permission(['role' => 'buyer'], 'purchasing.purchase_orders.update', $rolePermFile), 'Buyer must not inherit purchasing mutation permission.');
smoke_assert(user_permission_matrix_configured(['role' => 'internal_auditor'], $rolePermFile), 'Internal auditor should be marked as managed even without generic CRUD grants.');
smoke_assert(!user_has_any_permission(['role' => 'internal_auditor'], 'audit_risk.audit_programs.read', $rolePermFile), 'Internal auditor should not inherit generic CRUD access by fallback.');
smoke_assert(user_permission_matrix_configured(['role' => 'deburr_team_lead'], $rolePermFile), 'Deburr team lead should be marked as managed even without generic CRUD grants.');
smoke_assert(!user_has_any_permission(['role' => 'deburr_team_lead'], 'production.work_orders.read', $rolePermFile), 'Deburr team lead should not inherit generic production CRUD access by fallback.');
smoke_assert(!user_has_any_permission(['role' => 'qms_engineer'], 'master_data_governance.org_companies.read', $rolePermFile), 'QMS engineer must not inherit generic governance-table access.');
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
$genericPermissionGuard = new ReflectionMethod($adminGenericCrudController, 'enforceRuntimePermission');
$genericPermissionGuard->setAccessible(true);
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

$workflowBridgeFailureHandler = new ReflectionMethod($adminGenericCrudController, 'handleCrudFailure');
$workflowBridgeFailureHandler->setAccessible(true);
try {
    $workflowBridgeFailureHandler->invoke($adminGenericCrudController, new WorkflowBridgeRequiredException('workflow engine required'), 'generic_transition_failed');
    throw new RuntimeException('Workflow bridge failure did not terminate through the response pipeline.');
} catch (ExitException $e) {
    smoke_assert($e->getStatusCode() === 409, 'Workflow bridge failure must return conflict status.');
    smoke_assert(($e->getPayload()['error'] ?? null) === 'workflow_engine_required', 'Workflow bridge failure must return workflow_engine_required.');
}

$genericCrudService = new GenericCrudService(QMS_TEST_DATA_DIR);
$workflowRuntimeGuard = new ReflectionMethod($genericCrudService, 'assertTransitionRuntimeSupported');
$workflowRuntimeGuard->setAccessible(true);
try {
    $workflowRuntimeGuard->invoke($genericCrudService, 'quality_management', 'capa_records', [
        'workflowId' => 'wf_capa',
        'statusColumn' => 'capa_status',
        'columns' => [
            'record_id' => [],
            'source_record_id' => [],
            'capa_status' => [],
        ],
    ]);
    throw new RuntimeException('Persisted workflow runtime guard allowed generic CAPA transition without a ready bridge.');
} catch (WorkflowBridgeRequiredException $e) {
    smoke_assert(str_contains($e->getMessage(), 'workflow-engine bridge'), 'Workflow runtime guard must explain that a workflow-engine bridge is required.');
}
$filterWritableColumns = new ReflectionMethod($genericCrudService, 'filterWritableColumns');
$filterWritableColumns->setAccessible(true);
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

// Restricted governance tables must remain blocked for non-admin roles even on generic reads.
smoke_reset_request_state();
$_SESSION['user'] = 'finance-user';
$_SESSION['mfa_ok'] = true;
$_GET['domain'] = 'master_data_governance';
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
$_GET['domain'] = 'master_data_governance';
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
$runtimeAccessPolicy = json_decode((string)file_get_contents(QMS_TEST_DATA_DIR . '/registry/runtime-access-policy.json'), true);
$telemetryDetail = $endpointMap['mes_execution.mes_machine_telemetry.detail'] ?? null;
$bomDetail = $endpointMap['master_data.bill_of_materials.detail'] ?? null;
$scenarioUpdate = $endpointMap['advanced_planning.aps_planning_scenarios.update'] ?? null;
$scenarioTransition = $endpointMap['advanced_planning.aps_planning_scenarios.transition'] ?? null;
$capaTransition = $endpointMap['quality_management.capa_records.transition'] ?? null;
$capaDelete = $endpointMap['quality_management.capa_records.delete'] ?? null;
[$persistedTransitionCount, $genericTransitionCount] = [0, 0];
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
smoke_assert(($scenarioTransition['workflow']['lifecycle_mode'] ?? null) === 'generic_status_only', 'APS planning scenario transition must advertise generic status workflow mode.');
smoke_assert((bool)($scenarioTransition['workflow']['runtime']['generic_runtime_safe'] ?? false) === true, 'APS planning scenario transition must remain generic-runtime safe.');
smoke_assert(is_array($capaTransition), 'CAPA transition endpoint missing from endpoint catalog.');
smoke_assert(($capaTransition['workflow']['lifecycle_mode'] ?? null) === 'persisted', 'CAPA transition must advertise persisted workflow mode.');
smoke_assert((bool)($capaTransition['workflow']['runtime']['engine_bridge_required'] ?? false) === true, 'CAPA transition must advertise workflow-engine bridge requirement.');
smoke_assert((bool)($capaTransition['workflow']['runtime']['engine_bridge_blocked'] ?? false) === true, 'CAPA transition must advertise generic-runtime blocking until the workflow engine bridge is ready.');
smoke_assert((bool)($capaTransition['workflow']['runtime']['engine_bridge']['ready'] ?? true) === false, 'CAPA transition must not advertise a ready workflow-engine bridge when state models are misaligned.');
smoke_assert(in_array('state_model_mismatch', (array)($capaTransition['workflow']['runtime']['engine_bridge']['block_reasons'] ?? []), true), 'CAPA transition must surface state-model mismatch as a bridge blocker.');
smoke_assert(($capaTransition['workflow']['runtime']['runtime_error_code'] ?? null) === 'workflow_engine_required', 'CAPA transition must advertise the workflow-engine-required runtime error code.');
smoke_assert(is_array($capaDelete), 'CAPA delete endpoint missing from endpoint catalog.');
smoke_assert(($capaDelete['capabilities']['deletion']['mode'] ?? null) === 'archive_only', 'CAPA delete must advertise governed archive-only delete mode.');
smoke_assert((bool)($capaDelete['capabilities']['deletion']['hard_delete_allowed'] ?? true) === false, 'CAPA delete must not advertise hard-delete capability.');
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
        smoke_assert((string)($runtime['transition_execution_guard'] ?? '') === 'deny_generic_runtime_until_bridge_ready', "Persisted transition {$action} must advertise the generic-runtime deny guard.");
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
smoke_assert(in_array('qa_manager', (array)($runtimeAccessPolicy['domains']['master_data_governance']['list'] ?? []), true), 'Restricted runtime policy must retain admin-grade governance access.');
smoke_assert(!in_array('qms_engineer', (array)($runtimeAccessPolicy['domains']['master_data_governance']['list'] ?? []), true), 'Restricted runtime policy must not expose governance tables to QMS engineers.');
smoke_assert((array)($runtimeAccessPolicy['tables']['audit_events']['delete'] ?? ['unexpected']) === [], 'Audit events runtime policy must block generic delete.');
smoke_assert(in_array('quality_engineer', (array)($runtimeAccessPolicy['domains']['quality_management']['create'] ?? []), true), 'Quality runtime policy must allow controlled quality operations roles.');

$qualityReport = json_decode((string)file_get_contents(QMS_TEST_DATA_DIR . '/registry/registry-quality-report.json'), true);
smoke_assert(($qualityReport['all_passed'] ?? null) === true, 'Registry quality report must stay green after composite CRUD generation.');
smoke_assert((int)($qualityReport['summary']['missing_primary_key_tables'] ?? -1) === 0, 'Registry quality report still reports missing primary-key tables.');
smoke_assert((int)($qualityReport['summary']['optimistic_concurrency_issues'] ?? -1) === 0, 'Registry quality report still reports optimistic concurrency contract gaps.');
smoke_assert((int)($qualityReport['summary']['org_scope_contract_issues'] ?? -1) === 0, 'Registry quality report still reports org-scope contract gaps.');
smoke_assert((int)($qualityReport['summary']['transition_runtime_warnings'] ?? 0) > 0, 'Registry quality report must surface persisted workflow runtime warnings.');
smoke_assert((int)($qualityReport['summary']['workflow_engine_bridge_blocked'] ?? 0) > 0, 'Registry quality report must surface blocked workflow-engine bridges.');
smoke_assert(is_array($qualityReport['warnings']['workflow_engine_bridge'] ?? null), 'Registry quality report must include workflow-engine bridge blockers.');
smoke_assert((int)($qualityReport['summary']['archive_only_tables'] ?? 0) > 0, 'Registry quality report must surface archive-only table governance.');

echo "backend smoke tests passed\n";

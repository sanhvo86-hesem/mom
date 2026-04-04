<?php

declare(strict_types=1);

require __DIR__ . '/bootstrap.php';

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
use HESEM\QMS\Api\Controllers\KnowledgeController;
use HESEM\QMS\Api\Controllers\LogisticsController;
use HESEM\QMS\Api\Controllers\MobileController;
use HESEM\QMS\Api\Controllers\MasterDataController;
use HESEM\QMS\Api\Controllers\ModuleSchemaController;
use HESEM\QMS\Api\Controllers\ProductPassportController;
use HESEM\QMS\Api\Controllers\RegistryController;
use HESEM\QMS\Api\Middleware\AuthMiddleware;
use HESEM\QMS\Api\Middleware\CorsMiddleware;
use HESEM\QMS\Api\Middleware\RateLimitMiddleware;
use HESEM\QMS\Api\Router;
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
$financeStore = [
    'settings' => ['require_mfa' => false],
    'users' => [[
        'username' => 'finance-user',
        'name' => 'Finance Manager',
        'role' => 'finance_manager',
        'active' => true,
    ]],
];
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

echo "backend smoke tests passed\n";

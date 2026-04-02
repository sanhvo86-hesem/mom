<?php

declare(strict_types=1);

require __DIR__ . '/bootstrap.php';

use HESEM\QMS\Api\Controllers\AuthController;
use HESEM\QMS\Api\Controllers\ExitException;
use HESEM\QMS\Api\Controllers\ModuleSchemaController;
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

echo "backend smoke tests passed\n";

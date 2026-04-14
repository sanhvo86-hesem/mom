<?php

declare(strict_types=1);

/**
 * HESEM MOM API v2 â€” New MVC Entry Point.
 *
 * Bootstraps the Router with middleware stack and dispatches to controllers.
 * Falls back to the legacy monolithic api.php for unmapped actions,
 * ensuring full backward compatibility during migration.
 *
 * @package MOM\Api
 * @since   2.0.0
 */

// â”€â”€ Error Handling â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

ini_set('display_errors', '0');
ini_set('log_errors', '1');
@ini_set('expose_php', '0');
error_reporting(E_ALL);

if (!function_exists('mom_api_bootstrap_json')) {
    /**
     * Emit a minimal JSON error before legacy helpers or the MVC router exist.
     *
     * Schema Studio calls api/index.php directly, so bootstrap failures must
     * still return JSON instead of PHP-FPM's default HTML 500 page.
     *
     * @param array<string, mixed> $extra
     */
    function mom_api_bootstrap_json(string $error, int $statusCode = 500, array $extra = []): never
    {
        if (session_status() === PHP_SESSION_ACTIVE) {
            @session_write_close();
        }
        if (!headers_sent()) {
            http_response_code($statusCode);
            header('Content-Type: application/json; charset=utf-8');
            header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
            header('X-Content-Type-Options: nosniff');
            header('X-Frame-Options: SAMEORIGIN');
            header('Referrer-Policy: same-origin');
        }
        $payload = array_merge([
            'ok' => false,
            'error' => $error,
            'server_time' => gmdate('c'),
        ], $extra);
        $encoded = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        echo $encoded === false ? '{"ok":false,"error":"response_encode_failed"}' : $encoded;
        exit;
    }
}

if (!defined('MOM_API_INDEX_FAILSAFE_REGISTERED')) {
    define('MOM_API_INDEX_FAILSAFE_REGISTERED', true);

    set_exception_handler(static function (Throwable $e): void {
        @error_log('[API index bootstrap] Uncaught: ' . $e->getMessage() . ' in ' . $e->getFile() . ':' . $e->getLine());
        if (is_a($e, 'MOM\Api\Controllers\ExitException')) {
            if (session_status() === PHP_SESSION_ACTIVE) {
                @session_write_close();
            }
            if (!headers_sent()) {
                http_response_code($e->getStatusCode());
                foreach ($e->getHeaders() as $name => $value) {
                    header($name . ': ' . str_replace(["\r", "\n"], '', (string)$value));
                }
            }
            echo $e->getBody();
            exit;
        }
        mom_api_bootstrap_json('server_error', 500);
    });

    register_shutdown_function(static function (): void {
        $error = error_get_last();
        if (!is_array($error)) {
            return;
        }
        $fatalTypes = [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR, E_USER_ERROR];
        if (!in_array((int)($error['type'] ?? 0), $fatalTypes, true)) {
            return;
        }
        @error_log('[API index bootstrap] Fatal: ' . json_encode($error, JSON_UNESCAPED_SLASHES));
        if (!headers_sent()) {
            http_response_code(500);
            header('Content-Type: application/json; charset=utf-8');
            header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
            header('X-Content-Type-Options: nosniff');
        }
        echo '{"ok":false,"error":"server_error","server_time":"' . gmdate('c') . '"}';
    });

    set_error_handler(static function (int $severity, string $message, string $file, int $line): bool {
        if (!(error_reporting() & $severity)) {
            return false;
        }
        throw new ErrorException($message, 0, $severity, $file, $line);
    });
}

// â”€â”€ Paths â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

$BASE_DIR = dirname(__DIR__); // mom
$ROOT_DIR = realpath($BASE_DIR . '/..') ?: dirname($BASE_DIR);

$DATA_DIR_ENV = trim((string)(getenv('QMS_DATA_DIR') ?: ''));

// When api/index.php is required from api.php, $DATA_DIR is already resolved
// using the smart legacy-detection logic in api.php (resolve_runtime_data_dir).
// Reusing it avoids a path mismatch where QMS_DATA_DIR still points to the
// legacy qms-data directory while the actual runtime data lives in mom/data.
if (!isset($DATA_DIR) || $DATA_DIR === '') {
    $DATA_DIR = $DATA_DIR_ENV !== ''
        ? rtrim(str_replace('\\', '/', $DATA_DIR_ENV), '/\\')
        : $BASE_DIR . '/data';
}

$LOG_FILE = $DATA_DIR . '/php_error.log';
@ini_set('error_log', $LOG_FILE);

// Load legacy helpers early so direct api/index.php requests get the same
// structured JSON exception handling as requests forwarded through api.php.
if (!function_exists('api_json') && !defined('API_HELPERS_ONLY')) {
    define('API_HELPERS_ONLY', true);
    require_once $BASE_DIR . '/api.php';
}

try {
    $apiConfig = require __DIR__ . '/config.php';
    if (!is_array($apiConfig)) {
        @error_log('[API index bootstrap] config.php did not return an array; using defaults');
        $apiConfig = [];
    }
} catch (Throwable $e) {
    @error_log('[API index bootstrap] config.php failed: ' . $e->getMessage());
    $apiConfig = [];
}

// â”€â”€ Autoloader â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// Composer autoloader (includes PSR-4 mappings defined in composer.json)
$composerAutoload = dirname(__DIR__) . '/vendor/autoload.php';
if (is_file($composerAutoload)) {
    $autoloadBufferLevel = ob_get_level();
    ob_start();
    try {
        require_once $composerAutoload;
        $autoloadOutput = (string)ob_get_clean();
        if ($autoloadOutput !== '') {
            @error_log('[API index bootstrap] Composer autoload emitted output and it was suppressed.');
        }
    } catch (Throwable $e) {
        while (ob_get_level() > $autoloadBufferLevel) {
            ob_end_clean();
        }
        @error_log('[API index bootstrap] Composer autoload failed; using fallback autoloader: ' . $e->getMessage());
    }
}

if (!class_exists('MOM\\Api\\Router')) {
    // Fallback: Simple PSR-4-like autoloader when Composer is not installed
    spl_autoload_register(function (string $class): void {
        $map = [
            'MOM\\Api\\Controllers\\'  => __DIR__ . '/controllers/',
            'MOM\\Api\\Middleware\\'    => __DIR__ . '/middleware/',
            'MOM\\Api\\Validators\\'    => __DIR__ . '/validators/',
            'MOM\\Api\\Services\\'      => __DIR__ . '/services/',
            'MOM\\Services\\'           => __DIR__ . '/services/',
            'MOM\\Api\\'               => __DIR__ . '/',
            'MOM\\Database\\'           => dirname(__DIR__) . '/database/',
        ];

        foreach ($map as $prefix => $baseDir) {
            $len = strlen($prefix);
            if (strncmp($class, $prefix, $len) !== 0) {
                continue;
            }
            $relativeClass = substr($class, $len);
            $file = $baseDir . str_replace('\\', '/', $relativeClass) . '.php';
            if (is_file($file)) {
                require_once $file;
                return;
            }
        }
    });
}

// â”€â”€ Load Legacy Functions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// The legacy api.php contains many helper functions that controllers depend on.
// We include it in a way that loads the functions but does NOT execute the
// action dispatch (the switch statement). We achieve this by requiring the
// legacy file only if the functions are not yet defined.
if (!function_exists('api_json') && !defined('API_HELPERS_ONLY')) {
    // Load the legacy api.php for its helper functions only.
    // The API_HELPERS_ONLY guard prevents the boot section and switch statement
    // from executing, so we can bootstrap the MVC router ourselves.
    define('API_HELPERS_ONLY', true);
    require_once $BASE_DIR . '/api.php';
}

// If helper functions are already loaded (e.g. from a separate bootstrap),
// initialize session and load store
if (!isset($store)) {
    if (session_status() !== PHP_SESSION_ACTIVE) {
        session_init();
    }
    $USERS_FILE = $DATA_DIR . '/config/users.json';
    $store = users_load($USERS_FILE);
}

// â”€â”€ Import Classes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

use MOM\Api\Router;
use MOM\Api\Middleware\AuthMiddleware;
use MOM\Api\Middleware\CorsMiddleware;
use MOM\Api\Middleware\RateLimitMiddleware;
use MOM\Api\Middleware\AuditMiddleware;
use MOM\Api\Middleware\ApiKeyMiddleware;
use MOM\Api\Middleware\CsrfMiddleware;
use MOM\Api\Services\CacheService;
use MOM\Api\Services\QueueService;
use MOM\Api\Services\EventBroadcaster;
use MOM\Api\Services\LogTransport;
use MOM\Api\Services\EventBus;
use MOM\Api\Services\DomainEvent;
use MOM\Services\SliceObservability;
use MOM\Database\DataLayer;

// â”€â”€ Bootstrap DataLayer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

$dataLayer = new DataLayer($DATA_DIR, $ROOT_DIR);
SliceObservability::beginRequest($DATA_DIR);

// â”€â”€ Build Router â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

$router = new Router($dataLayer, $ROOT_DIR, $DATA_DIR);
$router->setStore($store);
$router->setEmitBackendHeaders((bool)($apiConfig['observability']['emit_backend_headers'] ?? true));

// â”€â”€ Register Middleware â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// Infrastructure services (Phase 0.2+)
$cacheService   = new CacheService($DATA_DIR);
$queueService   = new QueueService($DATA_DIR);
$logTransport   = new LogTransport($DATA_DIR);
$eventBroadcast = new EventBroadcaster($cacheService);

// Event-Driven Architecture (Phase 4.1)
$eventBus = new EventBus($queueService, $eventBroadcast, $logTransport);
$eventBus->registerDefaultRules();
EventBus::setInstance($eventBus);

$corsMiddleware      = new CorsMiddleware(
    (array)($apiConfig['cors']['allowed_origins'] ?? []),
    (array)($apiConfig['cors']['allowed_methods'] ?? ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']),
    (array)($apiConfig['cors']['allowed_headers'] ?? ['Content-Type', 'X-CSRF-Token', 'X-Requested-With', 'Authorization']),
    (int)($apiConfig['cors']['max_age'] ?? 86400),
    (bool)($apiConfig['cors']['allow_credentials'] ?? true),
);
$apiKeyMiddleware    = new ApiKeyMiddleware($DATA_DIR, $cacheService);
$authMiddleware      = new AuthMiddleware($store, (array)($apiConfig['auth'] ?? []));
$rateLimitMiddleware = new RateLimitMiddleware($DATA_DIR . '/ratelimit', 120, 60, [], $cacheService);
$legacyAuditLogEnabled = in_array(strtolower((string)getenv('MOM_ENABLE_LEGACY_AUDIT_LOG')), ['1', 'true', 'yes'], true);
$auditMiddleware     = new AuditMiddleware($DATA_DIR . '/audit.log', [], $legacyAuditLogEnabled);

$router->use($corsMiddleware->handler());
$router->use($apiKeyMiddleware->handler());  // API key/JWT checked before session auth
$router->use($authMiddleware->handler());
$router->use($rateLimitMiddleware->handler());
$router->use((new CsrfMiddleware())->handler());  // CSRF validation after rate limiting
$router->use($auditMiddleware->handler());

// Route module order preserves legacy action alias precedence and REST matching.
$routeModules = [
    __DIR__ . '/routes/auth-routes.php',
    __DIR__ . '/routes/core-routes.php',
    __DIR__ . '/routes/operations-routes.php',
    __DIR__ . '/routes/platform-routes.php',
    __DIR__ . '/routes/graphics-governance-routes.php',
    __DIR__ . '/routes/eqms-control-plane-routes.php',
    __DIR__ . '/routes/generic-runtime-routes.php',
    __DIR__ . '/routes/frontend-alias-routes.php',
    __DIR__ . '/routes/rest-routes.php',
];

foreach ($routeModules as $routeModule) {
    $registerRoutes = require $routeModule;
    if (!is_callable($registerRoutes)) {
        throw new \RuntimeException('Route module did not return a callable: ' . $routeModule);
    }

    $registerRoutes($router, $DATA_DIR);
}
// â”€â”€ Dispatch â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

$handled = $router->dispatch();

if (!$handled) {
    // Fall back to legacy api.php for unmapped actions
    // The legacy file has already been loaded above and handled the request.
    // If we reach here, no action was matched.
    api_json(['ok' => false, 'error' => 'unknown_action'], 400);
}

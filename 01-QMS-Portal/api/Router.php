<?php

declare(strict_types=1);

namespace HESEM\QMS\Api;

use HESEM\QMS\Api\Controllers\BaseController;
use HESEM\QMS\Api\Controllers\ExitException;
use HESEM\QMS\Database\DataLayer;
use RuntimeException;
use Throwable;

/**
 * PSR-7 style router for HESEM QMS Portal API.
 *
 * Maps legacy `?action=xxx` parameters to Controller methods while also
 * supporting RESTful routes (e.g. `GET /api/documents`, `POST /api/forms/FRM-631/entries`).
 *
 * Features:
 * - Backward compatible with existing frontend `?action=xxx` calls
 * - Middleware pipeline: auth -> CORS -> rate-limit -> audit -> controller -> response
 * - Proper HTTP status codes and JSON error handling
 *
 * @package HESEM\QMS\Api
 * @since   2.0.0
 */
class Router
{
    /** @var array<string, array{class: class-string<BaseController>, method: string}> Action -> handler map. */
    private array $actionRoutes = [];

    /** @var array<string, array<string, array{class: class-string<BaseController>, method: string}>> RESTful route map: [method => [pattern => handler]]. */
    private array $restRoutes = [];

    /** @var list<callable> Middleware stack (executed in order). */
    private array $middleware = [];

    /** @var DataLayer Shared data layer. */
    private DataLayer $data;

    /** @var string Absolute project root path. */
    private string $rootDir;

    /** @var string Absolute qms-data path. */
    private string $dataDir;

    /** @var array|null User store. */
    private ?array $store = null;

    /** @var array<string, BaseController> Controller instance cache. */
    private array $controllerCache = [];

    /** @var bool Emit backend observability headers. */
    private bool $emitBackendHeaders = true;

    // ── Construction ────────────────────────────────────────────────────────

    /**
     * @param DataLayer $data    Data layer instance.
     * @param string    $rootDir Project root path.
     * @param string    $dataDir qms-data path.
     */
    public function __construct(DataLayer $data, string $rootDir, string $dataDir)
    {
        $this->data    = $data;
        $this->rootDir = $rootDir;
        $this->dataDir = $dataDir;
    }

    /**
     * Inject the user store for controllers.
     *
     * @param array|null $store Users store data.
     * @return static
     */
    public function setStore(?array $store): static
    {
        $this->store = $store;
        return $this;
    }

    public function setEmitBackendHeaders(bool $emitBackendHeaders): static
    {
        $this->emitBackendHeaders = $emitBackendHeaders;
        return $this;
    }

    // ── Route Registration ──────────────────────────────────────────────────

    /**
     * Register a legacy `?action=xxx` route.
     *
     * @param string                       $action     Action name (e.g. 'auth_login').
     * @param class-string<BaseController> $controller Controller class name.
     * @param string                       $method     Controller method name.
     * @return static
     */
    public function action(string $action, string $controller, string $method): static
    {
        $this->actionRoutes[$action] = ['class' => $controller, 'method' => $method];
        return $this;
    }

    /**
     * Register a batch of legacy action routes.
     *
     * @param array<string, array{0: class-string<BaseController>, 1: string}> $routes [action => [class, method]].
     * @return static
     */
    public function actions(array $routes): static
    {
        foreach ($routes as $actionName => [$controller, $method]) {
            $this->action($actionName, $controller, $method);
        }
        return $this;
    }

    /**
     * Register a RESTful route.
     *
     * @param string                       $httpMethod HTTP method (GET, POST, PUT, DELETE).
     * @param string                       $pattern    URL pattern (e.g. '/api/documents', '/api/forms/{code}/entries').
     * @param class-string<BaseController> $controller Controller class name.
     * @param string                       $method     Controller method name.
     * @return static
     */
    public function route(string $httpMethod, string $pattern, string $controller, string $method): static
    {
        $httpMethod = strtoupper($httpMethod);
        $this->restRoutes[$httpMethod][$pattern] = ['class' => $controller, 'method' => $method];
        return $this;
    }

    /**
     * Shorthand for GET route.
     *
     * @param string                       $pattern    URL pattern.
     * @param class-string<BaseController> $controller Controller class.
     * @param string                       $method     Controller method.
     * @return static
     */
    public function get(string $pattern, string $controller, string $method): static
    {
        return $this->route('GET', $pattern, $controller, $method);
    }

    /**
     * Shorthand for POST route.
     *
     * @param string                       $pattern    URL pattern.
     * @param class-string<BaseController> $controller Controller class.
     * @param string                       $method     Controller method.
     * @return static
     */
    public function post(string $pattern, string $controller, string $method): static
    {
        return $this->route('POST', $pattern, $controller, $method);
    }

    /**
     * Shorthand for PUT route.
     *
     * @param string                       $pattern    URL pattern.
     * @param class-string<BaseController> $controller Controller class.
     * @param string                       $method     Controller method.
     * @return static
     */
    public function put(string $pattern, string $controller, string $method): static
    {
        return $this->route('PUT', $pattern, $controller, $method);
    }

    /**
     * Shorthand for DELETE route.
     *
     * @param string                       $pattern    URL pattern.
     * @param class-string<BaseController> $controller Controller class.
     * @param string                       $method     Controller method.
     * @return static
     */
    public function delete(string $pattern, string $controller, string $method): static
    {
        return $this->route('DELETE', $pattern, $controller, $method);
    }

    // ── Middleware ───────────────────────────────────────────────────────────

    /**
     * Add a middleware to the pipeline.
     *
     * Middleware signature: `function(string $action, callable $next): void`
     *
     * @param callable $middleware Middleware callable.
     * @return static
     */
    public function use(callable $middleware): static
    {
        $this->middleware[] = $middleware;
        return $this;
    }

    // ── Dispatch ────────────────────────────────────────────────────────────

    /**
     * Resolve the action from the current request.
     *
     * Checks `?action=xxx` first (backward compat), then tries RESTful path matching.
     *
     * @return array{action: string, handler: ?array{class: class-string<BaseController>, method: string}, params: array<string, string>}
     */
    public function resolve(): array
    {
        // 1. Legacy ?action= parameter
        $action = (string)($_GET['action'] ?? ($_POST['action'] ?? ''));

        // Normalize action aliases (backward compat with old frontend code)
        $action = match ($action) {
            'auth_status'                      => 'status',
            'login'                            => 'auth_login',
            'mfa_verify', 'verify'             => 'auth_mfa_verify',
            'enroll_verify', 'enroll'          => 'auth_enroll_verify',
            'logout'                           => 'auth_logout',
            default                            => $action,
        };

        if ($action !== '' && isset($this->actionRoutes[$action])) {
            return [
                'action'  => $action,
                'handler' => $this->actionRoutes[$action],
                'params'  => [],
            ];
        }

        // 2. RESTful path matching
        $httpMethod = strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET'));
        $pathInfo   = (string)($_SERVER['PATH_INFO'] ?? '');
        if ($pathInfo === '') {
            $uri  = (string)($_SERVER['REQUEST_URI'] ?? '/');
            $path = parse_url($uri, PHP_URL_PATH);
            $pathInfo = is_string($path) ? $path : '/';
        }
        $pathInfo = '/' . trim($pathInfo, '/');

        $routes = $this->restRoutes[$httpMethod] ?? [];
        foreach ($routes as $pattern => $handler) {
            $params = $this->matchPattern($pattern, $pathInfo);
            if ($params !== null) {
                return [
                    'action'  => $httpMethod . ':' . $pattern,
                    'handler' => $handler,
                    'params'  => $params,
                ];
            }
        }

        // 3. If action was given but not mapped, return it for fallback
        if ($action !== '') {
            return [
                'action'  => $action,
                'handler' => null,
                'params'  => [],
            ];
        }

        return [
            'action'  => '',
            'handler' => null,
            'params'  => [],
        ];
    }

    /**
     * Dispatch the current request through the middleware pipeline and into the controller.
     *
     * Returns false if the action is not mapped (caller should fall back to legacy api.php).
     *
     * @return bool True if handled, false if not mapped.
     */
    public function dispatch(): bool
    {
        $resolved = $this->resolve();
        $handler  = $resolved['handler'];
        $params   = $resolved['params'];
        $action   = $resolved['action'];

        if ($handler === null) {
            return false; // Not mapped -> fallback to legacy
        }

        // Store params for controllers
        if (!empty($params)) {
            foreach ($params as $k => $v) {
                $_GET[$k] = $v;
            }
        }

        // Build the middleware chain
        $controllerCall = function () use ($handler): void {
            $controller = $this->resolveController($handler['class']);
            $method     = $handler['method'];
            if (!method_exists($controller, $method)) {
                throw new RuntimeException("Controller method {$handler['class']}::{$method} not found");
            }
            $controller->{$method}();
        };

        // Wrap in middleware pipeline (reverse order)
        $pipeline = $controllerCall;
        foreach (array_reverse($this->middleware) as $mw) {
            $next = $pipeline;
            $pipeline = static function () use ($mw, $action, $next): void {
                $mw($action, $next);
            };
        }

        try {
            $pipeline();
        } catch (ExitException $e) {
            $this->emitResponse($e, $action);
        } catch (Throwable $e) {
            $this->handleException($e, $action);
        }

        return true;
    }

    // ── Internal ────────────────────────────────────────────────────────────

    /**
     * Resolve and cache a controller instance.
     *
     * @param class-string<BaseController> $className Controller class name.
     * @return BaseController
     */
    private function resolveController(string $className): BaseController
    {
        if (!isset($this->controllerCache[$className])) {
            /** @var BaseController $instance */
            $instance = new $className($this->data, $this->rootDir, $this->dataDir);
            $instance->setStore($this->store);
            $this->controllerCache[$className] = $instance;
        }
        return $this->controllerCache[$className];
    }

    /**
     * Match a URL pattern against a path, extracting parameters.
     *
     * Pattern syntax: `/api/forms/{code}/entries` matches `/api/forms/FRM-631/entries`
     * with params `['code' => 'FRM-631']`.
     *
     * @param string $pattern Pattern with `{param}` placeholders.
     * @param string $path    Actual request path.
     * @return array<string, string>|null Extracted params or null on no match.
     */
    private function matchPattern(string $pattern, string $path): ?array
    {
        // Convert pattern to regex
        $regex = preg_replace_callback('/\{([a-zA-Z_]+)\}/', static function (array $m): string {
            return '(?P<' . $m[1] . '>[^/]+)';
        }, $pattern);
        $regex = '#^' . $regex . '$#';

        if (preg_match($regex, $path, $matches)) {
            $params = [];
            foreach ($matches as $key => $value) {
                if (is_string($key)) {
                    $params[$key] = $value;
                }
            }
            return $params;
        }
        return null;
    }

    /**
     * Handle an uncaught exception from the controller pipeline.
     *
     * @param Throwable $e      The exception.
     * @param string    $action The action that was being dispatched.
     * @return void
     */
    private function handleException(Throwable $e, string $action): void
    {
        @error_log("[API] Error in {$action}: " . $e->getMessage() . ' in ' . $e->getFile() . ':' . $e->getLine());

        $this->emitResponse(ExitException::json([
            'ok'          => false,
            'error'       => 'server_error',
            'server_time' => gmdate('c'),
        ], 500), $action);
    }

    private function emitResponse(ExitException $response, string $action): void
    {
        if (session_status() === PHP_SESSION_ACTIVE) {
            @session_write_close();
        }

        http_response_code($response->getStatusCode());
        $this->emitStandardHeaders($action);

        foreach ($response->getHeaders() as $name => $value) {
            header($name . ': ' . $value);
        }

        $body = $response->getBody();
        if ($body !== '') {
            echo $body;
        }
    }

    private function emitStandardHeaders(string $action): void
    {
        if (!$this->emitBackendHeaders) {
            return;
        }

        header('X-QMS-API-Pipeline: mvc');
        header('X-QMS-API-Route: ' . $action);
        header('X-QMS-Data-Mode: ' . $this->data->getMode());
    }

    /**
     * Get all registered action route names (for debugging / docs).
     *
     * @return list<string>
     */
    public function getRegisteredActions(): array
    {
        return array_keys($this->actionRoutes);
    }

    /**
     * Get all registered RESTful routes (for debugging / docs).
     *
     * @return array<string, list<string>>
     */
    public function getRegisteredRoutes(): array
    {
        $out = [];
        foreach ($this->restRoutes as $method => $patterns) {
            $out[$method] = array_keys($patterns);
        }
        return $out;
    }
}

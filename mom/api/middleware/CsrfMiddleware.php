<?php

declare(strict_types=1);

namespace MOM\Api\Middleware;

use MOM\Api\Services\CsrfService;
use MOM\Api\Controllers\ExitException;

/**
 * SVC-005: CSRF Middleware - Automatic enforcement of CSRF protection.
 *
 * Validates CSRF tokens for all state-changing requests (POST, PUT, DELETE, PATCH).
 * Automatically applied to entire pipeline - no opt-in per controller needed.
 *
 * Exempts:
 * - GET/HEAD/OPTIONS requests (safe operations)
 * - Endpoints in CsrfService::isExempt() (API key auth, webhook signatures, etc.)
 * - Requests with valid X-CSRF-Token header
 *
 * @package MOM\Api\Middleware
 * @since   2.5.0
 */
class CsrfMiddleware
{
    /**
     * Create the middleware callable.
     *
     * @return callable(string, callable): void
     */
    public function handler(): callable
    {
        return static function (string $action, callable $next): void {
            $method = strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET'));

            // GET, HEAD, OPTIONS are safe - no CSRF needed
            if (in_array($method, ['GET', 'HEAD', 'OPTIONS', 'TRACE'], true)) {
                $next();
                return;
            }

            $path = (string)($_SERVER['REQUEST_URI'] ?? '/');

            // Check if this endpoint is exempt from CSRF (API key auth, webhooks, etc.)
            if (CsrfService::isExempt($path)) {
                $next();
                return;
            }

            // For all state-changing requests, validate CSRF token
            CsrfService::validate();

            $next();
        };
    }
}

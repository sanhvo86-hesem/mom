<?php

declare(strict_types=1);

namespace MOM\Api\Middleware;

use MOM\Api\Controllers\ExitException;

/**
 * CORS middleware for HESEM MOM API.
 *
 * Handles Cross-Origin Resource Sharing headers and preflight OPTIONS requests.
 * Configurable allowed origins with sensible defaults for the QMS portal.
 *
 * @package MOM\Api\Middleware
 * @since   2.0.0
 */
class CorsMiddleware
{
    /** @var list<string> Allowed origin patterns (exact or wildcard). */
    private array $allowedOrigins;

    /** @var list<string> Allowed HTTP methods. */
    private array $allowedMethods;

    /** @var list<string> Allowed request headers. */
    private array $allowedHeaders;

    /** @var int Preflight cache duration in seconds. */
    private int $maxAge;

    /** @var bool Whether to allow credentials (cookies). */
    private bool $credentials;

    // ── Construction ────────────────────────────────────────────────────────

    /**
     * @param list<string> $allowedOrigins Origin patterns (default: same-origin only).
     * @param list<string> $allowedMethods Allowed HTTP methods.
     * @param list<string> $allowedHeaders Allowed request headers.
     * @param int          $maxAge         Preflight cache seconds.
     * @param bool         $credentials    Allow cookies/credentials.
     */
    public function __construct(
        array $allowedOrigins = [],
        array $allowedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        array $allowedHeaders = ['Content-Type', 'X-CSRF-Token', 'X-Requested-With', 'Authorization'],
        int $maxAge = 86400,
        bool $credentials = true,
    ) {
        $this->allowedOrigins = $allowedOrigins ?: [
            // SECURITY FIX: Use explicit domain whitelist instead of wildcard patterns.
            'https://qms.hesem.com.vn',
            'https://portal.hesem.com.vn',
            'https://app.hesem.com.vn',
            'https://admin.hesem.com.vn',
        ];
        $this->allowedMethods = $allowedMethods;
        $this->allowedHeaders = $allowedHeaders;
        $this->maxAge         = $maxAge;
        $this->credentials    = $credentials;
    }

    /**
     * Create the middleware callable.
     *
     * @return callable(string, callable): void
     */
    public function handler(): callable
    {
        $self = $this;

        return static function (string $action, callable $next) use ($self): void {
            // SECURITY FIX: Set security headers to prevent common attacks.
            // These headers must be set early in the middleware pipeline.
            if (!headers_sent()) {
                // Prevent MIME type sniffing (XSS protection)
                header('X-Content-Type-Options: nosniff');
                // Prevent clickjacking attacks
                header('X-Frame-Options: DENY');
                // Control referrer information leakage
                header('Referrer-Policy: strict-origin-when-cross-origin');
                // Legacy XSS protection (modern browsers ignore, but good for defense-in-depth)
                header('X-XSS-Protection: 1; mode=block');
            }

            $origin = (string)($_SERVER['HTTP_ORIGIN'] ?? '');

            if ($origin !== '' && $self->isOriginAllowed($origin)) {
                header('Access-Control-Allow-Origin: ' . $origin);
                header('Vary: Origin');

                if ($self->credentials) {
                    header('Access-Control-Allow-Credentials: true');
                }
            }

            // Handle preflight OPTIONS requests
            $method = strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET'));
            if ($method === 'OPTIONS') {
                if ($origin !== '' && $self->isOriginAllowed($origin)) {
                    // Authorized CORS preflight - return allowed methods/headers
                    $headers = [
                        'Access-Control-Allow-Methods' => implode(', ', $self->allowedMethods),
                        'Access-Control-Allow-Headers' => implode(', ', $self->allowedHeaders),
                        'Access-Control-Max-Age' => (string)$self->maxAge,
                        'Access-Control-Allow-Origin' => $origin,
                        'Vary' => 'Origin',
                    ];
                    if ($self->credentials) {
                        $headers['Access-Control-Allow-Credentials'] = 'true';
                    }
                    throw ExitException::empty(204, $headers);
                } elseif ($origin !== '') {
                    // INFRA-015 FIX: Return 403 for unauthorized CORS preflight from known cross-origin
                    throw ExitException::empty(403, ['Vary' => 'Origin']);
                } else {
                    // No Origin header (same-origin or non-browser client) - allow through with 204
                    throw ExitException::empty(204, []);
                }
            }

            $next();
        };
    }

    /**
     * Check whether a given origin is in the allowed list.
     *
     * Supports exact match and simple wildcard patterns (e.g. `https://*.hesem.com.vn`).
     * SECURITY FIX: Wildcard patterns must match at domain boundary to prevent subdomain bypass attacks.
     *
     * @param string $origin The Origin header value.
     * @return bool
     */
    public function isOriginAllowed(string $origin): bool
    {
        $origin = strtolower(trim($origin));
        if ($origin === '') {
            return false;
        }

        foreach ($this->allowedOrigins as $allowed) {
            $allowed = strtolower(trim($allowed));
            if ($allowed === $origin) {
                return true;
            }
            // Wildcard matching: https://*.example.com
            // SECURITY: Ensure wildcard matches only at domain boundaries, not in the middle of domain names
            if (str_contains($allowed, '*')) {
                // Only allow * at the beginning of the subdomain (e.g. https://*.example.com)
                if (str_starts_with($allowed, 'https://*.') || str_starts_with($allowed, 'http://*.')) {
                    // Extract the domain part after ://*. and properly escape it
                    $pattern = preg_quote(preg_replace('/^\w+:\/\/\*\./', '', $allowed), '/');
                    // Subdomain can be one or more segments of alphanumeric + hyphen, separated by dots
                    // The regex ensures the wildcard part ends exactly at the quoted domain boundary
                    $regex = '/^https?:\/\/[a-z0-9]([a-z0-9\-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9\-]{0,61}[a-z0-9])?)*\.' . $pattern . '$/i';
                    if (preg_match($regex, $origin)) {
                        return true;
                    }
                }
            }
        }

        return false;
    }
}

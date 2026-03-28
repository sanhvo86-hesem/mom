<?php

declare(strict_types=1);

namespace HESEM\QMS\Api\Middleware;

/**
 * CORS middleware for HESEM QMS API.
 *
 * Handles Cross-Origin Resource Sharing headers and preflight OPTIONS requests.
 * Configurable allowed origins with sensible defaults for the QMS portal.
 *
 * @package HESEM\QMS\Api\Middleware
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
            'https://qms.hesem.com.vn',
            'https://*.hesem.com.vn',
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
                    header('Access-Control-Allow-Methods: ' . implode(', ', $self->allowedMethods));
                    header('Access-Control-Allow-Headers: ' . implode(', ', $self->allowedHeaders));
                    header('Access-Control-Max-Age: ' . $self->maxAge);
                }
                http_response_code(204);
                exit;
            }

            $next();
        };
    }

    /**
     * Check whether a given origin is in the allowed list.
     *
     * Supports exact match and simple wildcard patterns (e.g. `https://*.hesem.com.vn`).
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
            if (str_contains($allowed, '*')) {
                $regex = '/^' . str_replace('\*', '[a-z0-9-]+', preg_quote($allowed, '/')) . '$/';
                if (preg_match($regex, $origin)) {
                    return true;
                }
            }
        }

        return false;
    }
}

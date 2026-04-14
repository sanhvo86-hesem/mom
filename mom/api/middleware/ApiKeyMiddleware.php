<?php

declare(strict_types=1);

namespace MOM\Api\Middleware;

use MOM\Api\Controllers\ExitException;
use MOM\Api\Services\CacheService;

/**
 * API Key / JWT Authentication Middleware.
 *
 * Extends authentication beyond session cookies to support:
 *   1. API Keys (Bearer tokens) for service-to-service communication
 *   2. JWT tokens for machine-to-machine short-lived auth
 *
 * Checked BEFORE session auth — if an Authorization header is present,
 * it takes precedence over the session cookie.
 *
 * API Key format: Authorization: Bearer mom_key_<base64_key>
 * JWT format:     Authorization: Bearer eyJ...
 *
 * @package MOM\Api\Middleware
 * @since   2.1.0
 */
class ApiKeyMiddleware
{
    private string $dataDir;
    private ?CacheService $cache;

    /** @var array<int, array> Loaded API keys (cached per-request) */
    private ?array $keyStore = null;

    public function __construct(string $dataDir, ?CacheService $cache = null)
    {
        $this->dataDir = $dataDir;
        $this->cache = $cache;
    }

    /**
     * Create the middleware callable.
     *
     * Returns a middleware that:
     * - If Authorization header is present, validates it
     * - If valid, sets $_SESSION equivalents and calls next
     * - If invalid, returns 401
     * - If no Authorization header, passes through (session auth takes over)
     *
     * @return callable(string, callable): void
     */
    public function handler(): callable
    {
        $self = $this;

        return static function (string $action, callable $next) use ($self): void {
            $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? '';

            // No Authorization header — let session auth handle it
            if ($authHeader === '') {
                $next();
                return;
            }

            // Extract bearer token
            if (!preg_match('/^Bearer\s+(.+)$/i', $authHeader, $matches)) {
                $self->deny('invalid_auth_scheme', 401);
            }

            $token = trim($matches[1]);

            // Determine token type
            if (str_starts_with($token, 'mom_key_')) {
                // API Key authentication
                $self->authenticateApiKey($token);
            } elseif (str_starts_with($token, 'eyJ')) {
                // JWT authentication
                $self->authenticateJwt($token);
            } else {
                $self->deny('invalid_token_format', 401);
            }

            $next();
        };
    }

    /**
     * Authenticate via API Key.
     */
    private function authenticateApiKey(string $token): void
    {
        $keys = $this->loadApiKeys();
        $hashedToken = hash('sha256', $token);

        $key = null;
        foreach ($keys as $k) {
            if (hash_equals($k['hash'] ?? '', $hashedToken)) {
                $key = $k;
                break;
            }
        }

        if ($key === null) {
            $this->deny('invalid_api_key', 401);
        }

        // Check expiry
        if (!empty($key['expires_at'])) {
            $expiresAt = strtotime($key['expires_at']);
            if ($expiresAt !== false && $expiresAt < time()) {
                $this->deny('api_key_expired', 401);
            }
        }

        // Check active status
        if (!($key['active'] ?? true)) {
            $this->deny('api_key_revoked', 401);
        }

        // Set session-compatible context for downstream controllers
        $_SESSION['user'] = $key['user_id'] ?? 'api-service';
        $_SESSION['mfa_ok'] = true; // API keys bypass MFA
        $_SESSION['auth_method'] = 'api_key';
        $_SESSION['api_key_id'] = $key['key_id'] ?? null;
        // SEC-002 FIX: Set admin flag based on key metadata
        $_SESSION['api_key_is_admin'] = (bool)($key['is_admin'] ?? false);
        $_SESSION['api_key_scopes'] = $key['scopes'] ?? [];
        $_SESSION['last_active'] = time();
    }

    /**
     * Authenticate via JWT.
     */
    private function authenticateJwt(string $token): void
    {
        $jwtSecret = getenv('JWT_SECRET') ?: '';
        if ($jwtSecret === '') {
            $this->deny('jwt_not_configured', 500);
        }

        try {
            // Use lcobucci/jwt for proper JWT validation
            $config = \Lcobucci\JWT\Configuration::forSymmetricSigner(
                new \Lcobucci\JWT\Signer\Hmac\Sha256(),
                \Lcobucci\JWT\Signer\Key\InMemory::plainText($jwtSecret)
            );

            $parsedToken = $config->parser()->parse($token);

            // Validate claims
            $clock = new class implements \Psr\Clock\ClockInterface {
                public function now(): \DateTimeImmutable
                {
                    return new \DateTimeImmutable('now', new \DateTimeZone('UTC'));
                }
            };
            $constraints = [
                new \Lcobucci\JWT\Validation\Constraint\StrictValidAt($clock),
                new \Lcobucci\JWT\Validation\Constraint\SignedWith(
                    $config->signer(),
                    $config->signingKey()
                ),
            ];

            if (!$config->validator()->validate($parsedToken, ...$constraints)) {
                $this->deny('invalid_jwt', 401);
            }

            if (!$parsedToken instanceof \Lcobucci\JWT\UnencryptedToken) {
                $this->deny('invalid_jwt', 401);
            }

            // Extract claims
            $claims = $parsedToken->claims();
            $userId = $claims->get('sub', 'jwt-service');
            $scopes = $claims->get('scopes', ['*']);

            // Set session-compatible context
            $_SESSION['user'] = $userId;
            $_SESSION['mfa_ok'] = true;
            $_SESSION['auth_method'] = 'jwt';
            $_SESSION['jwt_scopes'] = is_array($scopes) ? $scopes : [$scopes];
            $_SESSION['last_active'] = time();
        } catch (\Throwable $e) {
            @error_log("[ApiKeyMiddleware] JWT error: {$e->getMessage()}");
            $this->deny('invalid_jwt', 401);
        }
    }

    /**
     * Load API keys from store (cached).
     *
     * @return array<int, array>
     */
    private function loadApiKeys(): array
    {
        if ($this->keyStore !== null) {
            return $this->keyStore;
        }

        // Try cache first
        if ($this->cache) {
            $cached = $this->cache->get('api_keys:store');
            if (is_array($cached)) {
                $this->keyStore = array_values(array_filter($cached, 'is_array'));
                return $this->keyStore;
            }
        }

        // Load from JSON file
        $file = $this->dataDir . '/config/api_keys.json';
        if (!is_file($file)) {
            $this->keyStore = [];
            return $this->keyStore;
        }

        $raw = @file_get_contents($file);
        $data = $raw !== false ? json_decode($raw, true) : null;
        $keys = is_array($data) && is_array($data['keys'] ?? null) ? $data['keys'] : [];
        $this->keyStore = array_values(array_filter($keys, 'is_array'));

        // Cache for 5 minutes
        if ($this->cache) {
            $this->cache->set('api_keys:store', $this->keyStore, 300);
        }

        return $this->keyStore;
    }

    /**
     * Check if the current request has a specific scope.
     * SEC-002 FIX: Wildcard '*' scope only allowed for admin API keys.
     * Regular API keys must have explicit scope list.
     */
    public static function hasScope(string $scope): bool
    {
        $scopes = $_SESSION['api_key_scopes'] ?? $_SESSION['jwt_scopes'] ?? [];

        // SEC-002: Wildcard '*' only allowed if auth method is NOT api_key OR is explicitly admin key
        $authMethod = $_SESSION['auth_method'] ?? 'session';
        $isAdminKey = ($authMethod === 'api_key') && (bool)($_SESSION['api_key_is_admin'] ?? false);

        if (in_array('*', $scopes, true)) {
            // Wildcard only for admin API keys; reject for regular API keys
            if ($authMethod === 'api_key' && !$isAdminKey) {
                return false;
            }
            return true;
        }

        if (in_array('admin:*', $scopes, true)) {
            return $isAdminKey;
        }

        return in_array($scope, $scopes, true);
    }

    /**
     * Get the authentication method used for the current request.
     *
     * @return string 'session'|'api_key'|'jwt'|'none'
     */
    public static function authMethod(): string
    {
        return $_SESSION['auth_method'] ?? (empty($_SESSION['user']) ? 'none' : 'session');
    }

    private function deny(string $error, int $statusCode): never
    {
        throw ExitException::json([
            'ok'          => false,
            'error'       => $error,
            'server_time' => gmdate('c'),
        ], $statusCode);
    }
}

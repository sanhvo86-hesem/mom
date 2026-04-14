<?php

declare(strict_types=1);

$envBool = static function (string $name, bool $default): bool {
    $raw = getenv($name);
    if ($raw === false || $raw === null || trim((string)$raw) === '') {
        return $default;
    }
    $parsed = filter_var($raw, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
    return $parsed ?? $default;
};

$envList = static function (string $name, array $default): array {
    $raw = getenv($name);
    if ($raw === false || $raw === null || trim((string)$raw) === '') {
        return $default;
    }

    $items = array_values(array_filter(array_map(
        static fn(string $item): string => trim($item),
        explode(',', (string)$raw)
    ), static fn(string $item): bool => $item !== ''));

    return $items !== [] ? $items : $default;
};

return [
    'router' => [
        'legacy_action_fallback' => $envBool('QMS_API_LEGACY_ACTION_FALLBACK', false),
    ],
    'cors' => [
        'allowed_origins' => $envList('QMS_API_ALLOWED_ORIGINS', [
            // SECURITY FIX: Replace wildcard patterns with explicit domain list.
            // Wildcard subdomains (*.hesem.com.vn) are too permissive and allow potentially compromised subdomains.
            // Only list known trusted frontend domains.
            'https://eqms.hesemeng.com',
            'https://portal.hesemeng.com',
            'https://qms.hesem.com.vn',
            'https://portal.hesem.com.vn',
            'https://app.hesem.com.vn',
            'https://admin.hesem.com.vn',
            // Development/local origins
            'http://localhost:3000',
            'http://127.0.0.1:3000',
            'http://localhost:4173',
            'http://127.0.0.1:4173',
            'http://localhost:5173',
            'http://127.0.0.1:5173',
        ]),
        'allowed_methods' => $envList('QMS_API_ALLOWED_METHODS', ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']),
        'allowed_headers' => $envList('QMS_API_ALLOWED_HEADERS', ['Content-Type', 'X-CSRF-Token', 'X-Requested-With', 'Authorization', 'If-Match', 'X-Row-Version', 'Idempotency-Key']),
        'max_age' => max(0, (int)(getenv('QMS_API_CORS_MAX_AGE') ?: 86400)),
        'allow_credentials' => $envBool('QMS_API_ALLOW_CREDENTIALS', true),
    ],
    'auth' => [
        'enforce_middleware' => $envBool('QMS_API_ENFORCE_AUTH_MIDDLEWARE', true),
        'idle_timeout_seconds' => max(60, (int)(getenv('QMS_API_IDLE_TIMEOUT_SECONDS') ?: 1800)), // SEC-001 FIX: Changed from 14400 (4h) to 1800 (30m)
        'public_actions' => $envList('QMS_API_PUBLIC_ACTIONS', [
            'status',
            'auth_login',
            'auth_mfa_verify',
            'auth_enroll_verify',
        ]),
        'public_routes' => $envList('QMS_API_PUBLIC_ROUTES', [
            'GET /api/auth/status',
            'POST /api/auth/login',
            'POST /api/auth/mfa',
            'POST /api/auth/enroll',
            'GET /api/health/live',
            'GET /api/health/ready',
        ]),
    ],
    'observability' => [
        'emit_backend_headers' => $envBool('QMS_API_EMIT_BACKEND_HEADERS', true),
    ],
    'idempotency' => [
        'enabled' => $envBool('QMS_API_IDEMPOTENCY_ENABLED', true),
        'ttl_seconds' => max(300, (int)(getenv('QMS_API_IDEMPOTENCY_TTL_SECONDS') ?: 86400)),
        'retry_window_seconds' => max(15, (int)(getenv('QMS_API_IDEMPOTENCY_RETRY_WINDOW_SECONDS') ?: 120)),
    ],
    'ai' => [
        'anthropic_api_key'    => getenv('ANTHROPIC_API_KEY') ?: '',
        'anthropic_model'      => getenv('ANTHROPIC_MODEL') ?: 'claude-sonnet-4-20250514',
        'anthropic_max_tokens' => (int)(getenv('ANTHROPIC_MAX_TOKENS') ?: 4096),
        'anthropic_timeout'    => (int)(getenv('ANTHROPIC_TIMEOUT') ?: 30),
        'cache_ttl'            => (int)(getenv('AI_CACHE_TTL') ?: 300),
        'enabled'              => $envBool('AI_ENABLED', false),
    ],
];

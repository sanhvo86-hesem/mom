<?php

declare(strict_types=1);

/**
 * HESEM MOM Portal - Database Configuration
 *
 * Environment-driven configuration for PostgreSQL connection and feature flags.
 * All values can be overridden via environment variables for deployment flexibility.
 *
 * Feature Flags:
 *   USE_POSTGRES   - Enable PostgreSQL as a data backend (default: false)
 *   SHADOW_WRITE   - Migration-only dual-write mode (default: false)
 *   JSON_FALLBACK  - Break-glass JSON fallback on PostgreSQL errors (default: false)
 *
 * @package MOM\Database
 * @since   1.0.0
 */

$envBool = static function (string $name, bool $default): bool {
    $raw = getenv($name);
    if ($raw === false || $raw === null || $raw === '') {
        return $default;
    }
    $parsed = filter_var($raw, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
    return $parsed ?? $default;
};

// SECURITY FIX: Validate DB_PASSWORD is set in production/staging mode.
// Do not allow empty passwords to silently fall through.
$dbPassword = getenv('DB_PASSWORD');
$appEnv = strtolower(trim((string)(getenv('APP_ENV') ?: 'production')));
if (($dbPassword === false || $dbPassword === '' || $dbPassword === null)
    && in_array($appEnv, ['production', 'staging'], true)) {
    throw new \RuntimeException(
        'DB_PASSWORD environment variable is required and must not be empty in ' . $appEnv . ' environment'
    );
}

return [
    // Connection
    'driver'   => 'pgsql',
    'host'     => getenv('DB_HOST') ?: 'localhost',
    'port'     => (int)(getenv('DB_PORT') ?: 5432),
    'database' => getenv('DB_NAME') ?: 'mom',
    'username' => getenv('DB_USER') ?: 'mom_app',
    'password' => $dbPassword !== false ? $dbPassword : '',
    'charset'  => 'utf8',
    'schema'   => 'public',
    'sslmode'  => getenv('DB_SSL') ?: 'prefer',
    'allow_empty_password' => $envBool('DB_ALLOW_EMPTY_PASSWORD', false),

    // Connection Pool
    'connect_timeout' => (int)(getenv('DB_CONNECT_TIMEOUT') ?: 5),
    'statement_timeout' => (int)(getenv('DB_STATEMENT_TIMEOUT') ?: 30000), // ms
    'read_retry_count' => max(1, (int)(getenv('DB_READ_RETRY_COUNT') ?: 3)),
    'read_retry_delay_ms' => max(0, (int)(getenv('DB_READ_RETRY_DELAY_MS') ?: 150)),

    // Feature Flags
    'use_postgres'  => $envBool('USE_POSTGRES', false),
    'shadow_write'  => $envBool('SHADOW_WRITE', false),
    'json_fallback' => $envBool('JSON_FALLBACK', false),

    // Logging
    'log_queries'  => $envBool('DB_LOG_QUERIES', false),
    'log_file'     => getenv('DB_LOG_FILE') ?: __DIR__ . '/../data/db_queries.log',
    'slow_query_ms' => (int)(getenv('DB_SLOW_QUERY_MS') ?: 500),
];

<?php

declare(strict_types=1);

/**
 * HESEM QMS Portal - Database Configuration
 *
 * Environment-driven configuration for PostgreSQL connection and feature flags.
 * All values can be overridden via environment variables for deployment flexibility.
 *
 * Feature Flags:
 *   USE_POSTGRES   - Enable PostgreSQL as a data backend (default: false)
 *   SHADOW_WRITE   - Write to both JSON and PostgreSQL simultaneously (default: true)
 *   JSON_FALLBACK  - Fall back to JSON on PostgreSQL errors (default: true)
 *
 * @package HESEM\QMS\Database
 * @since   1.0.0
 */

return [
    // ── Connection ──────────────────────────────────────────────────────────
    'driver'   => 'pgsql',
    'host'     => getenv('DB_HOST') ?: 'localhost',
    'port'     => (int)(getenv('DB_PORT') ?: 5432),
    'database' => getenv('DB_NAME') ?: 'hesem_qms',
    'username' => getenv('DB_USER') ?: 'qms_app',
    'password' => getenv('DB_PASS') ?: '',
    'charset'  => 'utf8',
    'schema'   => 'public',
    'sslmode'  => getenv('DB_SSL') ?: 'prefer',

    // ── Connection Pool ─────────────────────────────────────────────────────
    'connect_timeout' => (int)(getenv('DB_CONNECT_TIMEOUT') ?: 5),
    'statement_timeout' => (int)(getenv('DB_STATEMENT_TIMEOUT') ?: 30000), // ms

    // ── Feature Flags ───────────────────────────────────────────────────────
    'use_postgres'  => (bool)(getenv('USE_POSTGRES') ?: false),
    'shadow_write'  => (bool)(getenv('SHADOW_WRITE') ?: true),
    'json_fallback' => (bool)(getenv('JSON_FALLBACK') ?: true),

    // ── Logging ─────────────────────────────────────────────────────────────
    'log_queries'  => (bool)(getenv('DB_LOG_QUERIES') ?: false),
    'log_file'     => getenv('DB_LOG_FILE') ?: __DIR__ . '/../qms-data/db_queries.log',
    'slow_query_ms' => (int)(getenv('DB_SLOW_QUERY_MS') ?: 500),
];

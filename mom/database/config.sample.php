<?php
/**
 * HESEM MOM Database Configuration.
 * Copy this file to config.php and fill in your PostgreSQL credentials.
 *
 * Operating Modes (migration ladder):
 *   JSON_ONLY        - Local/offline mode: JSON files only
 *   SHADOW_WRITE     - Migration-only mode: JSON primary + PostgreSQL shadow
 *   POSTGRES_PRIMARY - Break-glass mode: read PostgreSQL, fallback to JSON
 *   POSTGRES_ONLY    - Production authority target: PostgreSQL only
 */
return [
    // PostgreSQL connection
    'host'     => getenv('PGHOST')     ?: 'localhost',
    'port'     => (int)(getenv('PGPORT') ?: 5432),
    'dbname'   => getenv('PGDATABASE') ?: 'mom',
    'user'     => getenv('PGUSER')     ?: 'mom_app',
    'password' => getenv('PGPASSWORD') ?: '',
    'sslmode'  => getenv('PGSSLMODE')  ?: 'prefer',

    // Operating mode flags
    'use_postgres'   => false,   // Set true to enable PostgreSQL path
    'shadow_write'   => false,   // Opt in only during controlled JSON->PG migration
    'json_fallback'  => false,   // Opt in only as a monitored break-glass recovery path

    // Performance
    'read_retry_count'    => 2,
    'read_retry_delay_ms' => 50,
    'connection_timeout'  => 5,
    'statement_timeout'   => 30000, // ms

    // Shadow sync
    'shadow_sync_enabled' => true,
    'shadow_sync_batch_size' => 100,
];

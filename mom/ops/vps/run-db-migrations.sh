#!/usr/bin/env bash
# ============================================================================
# HESEM MOM Portal - VPS database migration and schema smoke gate
#
# This script is intentionally deployment-local: it reads DB connection settings
# from the current shell or PHP-FPM pool config, runs the governed migration
# ledger, then verifies Data Schema sees the live DB as release-ready.
# ============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"

RUN_DB_MIGRATIONS="${RUN_DB_MIGRATIONS:-1}"
RUN_DB_SCHEMA_SMOKE="${RUN_DB_SCHEMA_SMOKE:-1}"
FPM_POOL_CONF="${FPM_POOL_CONF:-}"
DB_SCHEMA="${DB_SCHEMA:-public}"

log() {
  printf '%s\n' "==> $*"
}

die() {
  printf '%s\n' "ERROR: $*" >&2
  exit 1
}

read_fpm_env() {
  local key="$1"
  local conf
  local value
  local candidates=()

  if [ -n "${FPM_POOL_CONF:-}" ]; then
    candidates+=("$FPM_POOL_CONF")
  fi

  while IFS= read -r conf; do
    [ -n "$conf" ] && candidates+=("$conf")
  done < <(find /etc/php -path '*/fpm/pool.d/*.conf' -type f 2>/dev/null | sort)

  for conf in "${candidates[@]}"; do
    [ -f "$conf" ] || continue
    value="$(
      awk -v key="$key" '
        $0 ~ "^[[:space:]]*env\\[" key "\\]" {
          sub(/^[^=]*=[[:space:]]*/, "")
          gsub(/^[[:space:]]+|[[:space:]]+$/, "")
          print
          exit
        }
      ' "$conf"
    )"
    if [ -n "$value" ]; then
      printf '%s\n' "$value"
      return 0
    fi
  done

  return 1
}

env_or_fpm() {
  local key="$1"
  local default="${2:-}"
  local current="${!key:-}"
  if [ -n "$current" ]; then
    printf '%s\n' "$current"
    return
  fi
  read_fpm_env "$key" 2>/dev/null || printf '%s\n' "$default"
}

resolve_db_env() {
  DB_HOST="$(env_or_fpm DB_HOST localhost)"
  DB_PORT="$(env_or_fpm DB_PORT 5432)"
  DB_NAME="$(env_or_fpm DB_NAME mom)"
  DB_USER="$(env_or_fpm DB_USER mom_app)"
  DB_PASSWORD="${DB_PASSWORD:-${DB_PASS:-}}"
  if [ -z "$DB_PASSWORD" ]; then
    DB_PASSWORD="$(read_fpm_env DB_PASSWORD 2>/dev/null || true)"
  fi
  if [ -z "$DB_PASSWORD" ]; then
    DB_PASSWORD="$(read_fpm_env DB_PASS 2>/dev/null || true)"
  fi

  USE_POSTGRES="$(env_or_fpm USE_POSTGRES 1)"
  SHADOW_WRITE="$(env_or_fpm SHADOW_WRITE 0)"
  JSON_FALLBACK="$(env_or_fpm JSON_FALLBACK 0)"

  [ -n "$DB_HOST" ] || die "DB_HOST is empty"
  [ -n "$DB_PORT" ] || die "DB_PORT is empty"
  [ -n "$DB_NAME" ] || die "DB_NAME is empty"
  [ -n "$DB_USER" ] || die "DB_USER is empty"
  [ -n "$DB_PASSWORD" ] || die "DB_PASSWORD/DB_PASS is empty"

  export DB_HOST DB_PORT DB_NAME DB_USER DB_PASSWORD DB_PASS="$DB_PASSWORD"
  export USE_POSTGRES SHADOW_WRITE JSON_FALLBACK DB_SCHEMA
  export PGPASSWORD="$DB_PASSWORD"
}

run_migrations() {
  if [ "$RUN_DB_MIGRATIONS" != "1" ]; then
    log "DB migrations skipped (RUN_DB_MIGRATIONS=$RUN_DB_MIGRATIONS)"
    return
  fi

  command -v psql >/dev/null 2>&1 || die "psql is required for DB migrations"
  log "Running governed DB migrations for ${DB_HOST}:${DB_PORT}/${DB_NAME} as ${DB_USER}"
  bash "${REPO_ROOT}/mom/database/migrate.sh" \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_USER" \
    -d "$DB_NAME"
}

schema_smoke() {
  if [ "$RUN_DB_SCHEMA_SMOKE" != "1" ]; then
    log "DB schema smoke skipped (RUN_DB_SCHEMA_SMOKE=$RUN_DB_SCHEMA_SMOKE)"
    return
  fi

  command -v php >/dev/null 2>&1 || die "php is required for DB schema smoke"
  log "Running Data Schema live-DB smoke"
  php <<'PHP'
<?php
declare(strict_types=1);

$root = getcwd();
$bootstrap = $root . '/mom/tests/bootstrap.php';
if (!is_file($bootstrap)) {
    fwrite(STDERR, "ERROR: smoke bootstrap not found at {$bootstrap}\n");
    exit(2);
}

require $bootstrap;
restore_exception_handler();
restore_error_handler();

$dataLayer = new MOM\Database\DataLayer(QMS_TEST_DATA_DIR, QMS_TEST_ROOT_DIR);
$service = new MOM\Services\DataSchemaService($dataLayer, QMS_TEST_DATA_DIR, QMS_TEST_ROOT_DIR);
$workspace = $service->getWorkspace();
$connection = is_array($workspace['connection'] ?? null) ? $workspace['connection'] : [];

$summary = [
    'db_target_status' => (string)($connection['db_target_status'] ?? ''),
    'db_target_healthy' => (bool)($connection['db_target_healthy'] ?? false),
    'present_table_count' => (int)($connection['present_table_count'] ?? 0),
    'authority_table_count' => (int)($connection['db_target_authority_table_count'] ?? 0),
    'missing_table_count' => (int)($connection['missing_table_count'] ?? 0),
    'structural_drift_table_count' => (int)($connection['structural_drift_table_count'] ?? 0),
    'pending_migration_count' => (int)($connection['pending_migration_count'] ?? 0),
    'applied_migration_count' => (int)($connection['applied_migration_count'] ?? 0),
    'migration_file_count' => (int)($connection['migration_file_count'] ?? 0),
];

echo json_encode($summary, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES), PHP_EOL;

$failures = [];
if (($connection['db_probe_resolved'] ?? false) !== true) {
    $failures[] = 'DB probe did not resolve against the configured PostgreSQL target.';
}
if ($summary['pending_migration_count'] !== 0) {
    $failures[] = 'Pending migrations remain after deploy.';
}
if ($summary['missing_table_count'] !== 0) {
    $failures[] = 'Registry authority tables are still missing from the live DB.';
}
if ($summary['structural_drift_table_count'] !== 0) {
    $failures[] = 'Live DB structure still drifts from registry authority.';
}
if ($summary['db_target_status'] !== 'aligned' || $summary['db_target_healthy'] !== true) {
    $failures[] = 'Data Schema does not classify the live DB target as aligned.';
}

if ($failures !== []) {
    foreach ($failures as $failure) {
        fwrite(STDERR, "ERROR: {$failure}\n");
    }
    exit(1);
}
PHP
}

cd "$REPO_ROOT"
resolve_db_env
run_migrations
schema_smoke

#!/usr/bin/env bash
# ============================================================================
# HESEM MOM - No-Data-Loss Live DB Promotion Apply
# ============================================================================
# Promotes the live runtime database to the current system contract authority by
# reusing the same SQL plan proven by probe_live_db_promotion.sh on a disposable
# clone. This script always creates a binary pg_dump backup before mutating the
# target DB and refuses to apply if the clone probe does not finish aligned.
#
# Usage:
#   ./apply_live_db_promotion.sh --execute [--target-db mom]
#                                [--authority-db mom_runtime_stage]
#                                [--schema public]
# ============================================================================

set -euo pipefail

TARGET_DB="${DB_NAME:-mom}"
AUTHORITY_DB="${AUTHORITY_DB:-mom_runtime_stage}"
SCHEMA_NAME="${DB_SCHEMA:-public}"
PG_HOST="${PGHOST:-/var/run/postgresql}"
PG_PORT="${PGPORT:-5432}"
PG_USER="${PGUSER:-postgres}"
DB_OS_USER="${DB_OS_USER:-postgres}"
EXECUTE=false
KEEP_GUARD=false

usage() {
    echo "Usage: $0 --execute [--target-db mom] [--authority-db mom_runtime_stage] [--schema public] [--keep-guard]"
    exit 1
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        --execute) EXECUTE=true; shift ;;
        --target-db) TARGET_DB="$2"; shift 2 ;;
        --authority-db) AUTHORITY_DB="$2"; shift 2 ;;
        --schema) SCHEMA_NAME="$2"; shift 2 ;;
        --keep-guard) KEEP_GUARD=true; shift ;;
        -h|--help) usage ;;
        *) echo "Unknown option: $1"; usage ;;
    esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PORTAL_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
PROJECT_ROOT="$(cd "${PORTAL_ROOT}/.." && pwd)"
MIGRATIONS_DIR="${PORTAL_ROOT}/database/migrations"
BACKUP_DIR="${PORTAL_ROOT}/data/db-backups"
RUN_ID="$(date +%Y%m%d%H%M%S)"
WORKDIR="/tmp/mom_live_promotion_${RUN_ID}"
GUARD_PROBE_DB="mom_promotion_apply_guard_${RUN_ID}"
GUARD_WORKDIR="/tmp/${GUARD_PROBE_DB}"
PROBE_LOG="${WORKDIR}/probe.log"
BACKUP_FILE="${BACKUP_DIR}/${TARGET_DB}_pre_schema_promotion_${RUN_ID}.dump"

mkdir -p "$WORKDIR" "$BACKUP_DIR"

as_db_user() {
    if [[ -n "$DB_OS_USER" && "$(id -un)" != "$DB_OS_USER" ]]; then
        sudo -u "$DB_OS_USER" "$@"
    else
        "$@"
    fi
}

psql_db() {
    local db="$1"
    shift
    as_db_user psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d "$db" "$@"
}

sql_escape() {
    printf "%s" "$1" | sed "s/'/''/g"
}

file_checksum() {
    local file="$1"
    if command -v sha256sum >/dev/null 2>&1; then
        sha256sum "$file" | awk '{print $1}'
    else
        shasum -a 256 "$file" | awk '{print $1}'
    fi
}

cleanup_guard() {
    if [[ "$KEEP_GUARD" != "true" ]]; then
        as_db_user dropdb --if-exists "$GUARD_PROBE_DB" >/dev/null 2>&1 || true
        rm -rf "$GUARD_WORKDIR"
    fi
}
trap cleanup_guard EXIT

if [[ "$EXECUTE" != "true" ]]; then
    echo "ERROR: live promotion requires --execute. Run the probe first if you only need proof."
    usage
fi

if [[ "$TARGET_DB" == "$AUTHORITY_DB" ]]; then
    echo "ERROR: target DB and authority DB must be different." >&2
    exit 2
fi

echo "target_db=${TARGET_DB}"
echo "authority_db=${AUTHORITY_DB}"
echo "schema=${SCHEMA_NAME}"
echo "workdir=${WORKDIR}"
echo "guard_probe_db=${GUARD_PROBE_DB}"
echo "backup_file=${BACKUP_FILE}"

echo "step=guard_probe"
bash "${SCRIPT_DIR}/probe_live_db_promotion.sh" \
    --target-db "$TARGET_DB" \
    --authority-db "$AUTHORITY_DB" \
    --schema "$SCHEMA_NAME" \
    --probe-db "$GUARD_PROBE_DB" \
    --keep-probe \
    --keep-workdir | tee "$PROBE_LOG"

grep -q '^dataschema_status=aligned$' "$PROBE_LOG"
grep -q '^dataschema_missing_tables=0$' "$PROBE_LOG"
grep -q '^dataschema_missing_columns=0$' "$PROBE_LOG"
grep -q '^dataschema_unexpected_columns=0$' "$PROBE_LOG"
grep -q '^dataschema_pk_drift=0$' "$PROBE_LOG"
grep -q '^dataschema_type_drifts=0$' "$PROBE_LOG"
grep -q '^dataschema_structural_drift=0$' "$PROBE_LOG"

if [[ ! -d "$GUARD_WORKDIR" ]]; then
    echo "ERROR: guard workdir missing: ${GUARD_WORKDIR}" >&2
    exit 3
fi

echo "step=backup"
as_db_user pg_dump -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -Fc "$TARGET_DB" > "$BACKUP_FILE"
if [[ ! -s "$BACKUP_FILE" ]]; then
    echo "ERROR: backup was not created or is empty: ${BACKUP_FILE}" >&2
    exit 4
fi
echo "backup_ready=1"

echo "step=row_count_snapshot_before"
psql_db "$TARGET_DB" -At > "${WORKDIR}/row_counts_before.sql" <<SQL
SELECT format('SELECT %L || E''\t'' || COUNT(*)::text FROM %I.%I;', table_name, table_schema, table_name)
FROM information_schema.tables
WHERE table_schema = '${SCHEMA_NAME}'
  AND table_type = 'BASE TABLE'
  AND table_name <> 'schema_migrations'
ORDER BY table_name;
SQL
psql_db "$TARGET_DB" -At -f "${WORKDIR}/row_counts_before.sql" > "${WORKDIR}/row_counts_before.tsv"

apply_sql() {
    local file="$1"
    local path="${GUARD_WORKDIR}/${file}"
    if [[ ! -f "$path" ]]; then
        echo "ERROR: required plan file missing: ${path}" >&2
        exit 5
    fi
    echo "apply=${file}"
    psql_db "$TARGET_DB" -v ON_ERROR_STOP=1 -f "$path" >/dev/null
}

echo "step=apply_plan"
apply_sql "00_extensions.sql"
apply_sql "01_enums.sql"
apply_sql "01_functions.sql"
apply_sql "02_drop_existing_foreign_keys.sql"
apply_sql "02_add_missing_columns.sql"
apply_sql "02_backfill_missing_columns.sql"
apply_sql "02_align_column_types.sql"
apply_sql "02_enforce_missing_column_not_null.sql"
apply_sql "05_contract_key_compatibility.sql"
apply_sql "03_missing_tables_predata.sql"
apply_sql "02_restore_existing_foreign_keys.sql"
apply_sql "04_missing_tables_postdata.sql"

echo "step=baseline_schema_migrations"
psql_db "$TARGET_DB" -v ON_ERROR_STOP=1 -q <<'SQL'
CREATE TABLE IF NOT EXISTS schema_migrations (
    migration_id    VARCHAR(200)    PRIMARY KEY,
    applied_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    checksum        VARCHAR(64)     NOT NULL,
    execution_ms    INT             DEFAULT 0
);
SQL

BASELINED_MIGRATIONS=0
for migration_file in "${MIGRATIONS_DIR}/"*.sql; do
    migration_id="$(basename "$migration_file" .sql)"
    escaped_id="$(sql_escape "$migration_id")"
    checksum="$(file_checksum "$migration_file")"
    escaped_checksum="$(sql_escape "$checksum")"
    psql_db "$TARGET_DB" -v ON_ERROR_STOP=1 -q \
        -c "INSERT INTO schema_migrations (migration_id, checksum, execution_ms) VALUES ('${escaped_id}', '${escaped_checksum}', 0) ON CONFLICT (migration_id) DO UPDATE SET checksum = EXCLUDED.checksum;"
    BASELINED_MIGRATIONS=$((BASELINED_MIGRATIONS + 1))
done
echo "baselined_migrations=${BASELINED_MIGRATIONS}"

echo "step=row_count_snapshot_after"
psql_db "$TARGET_DB" -At -f "${WORKDIR}/row_counts_before.sql" > "${WORKDIR}/row_counts_after.tsv"
python3 - "${WORKDIR}/row_counts_before.tsv" "${WORKDIR}/row_counts_after.tsv" <<'PY'
import sys
before = {}
after = {}
for path, target in [(sys.argv[1], before), (sys.argv[2], after)]:
    with open(path, 'r', encoding='utf-8') as handle:
        for raw in handle:
            raw = raw.rstrip('\n')
            if not raw:
                continue
            name, count = raw.split('\t', 1)
            target[name] = int(count)
drift = [(name, before[name], after.get(name)) for name in sorted(before) if after.get(name) != before[name]]
if drift:
    print('row_count_drift=1')
    for name, old, new in drift[:30]:
        print(f'row_count_changed={name}:before={old}:after={new}')
    raise SystemExit(6)
print(f'row_count_verified={len(before)}')
PY

DATASCHEMA_SCRIPT="${WORKDIR}/dataschema_metrics.php"
cat > "$DATASCHEMA_SCRIPT" <<PHP
<?php
require '${PORTAL_ROOT}/tests/bootstrap.php';
use MOM\\Database\\DataLayer;
use MOM\\Services\\DataSchemaService;
putenv('DB_HOST=${PG_HOST}');
putenv('DB_PORT=${PG_PORT}');
putenv('DB_NAME=${TARGET_DB}');
putenv('DB_USER=${PG_USER}');
putenv('DB_PASS=');
putenv('DB_ALLOW_EMPTY_PASSWORD=1');
putenv('USE_POSTGRES=1');
putenv('SHADOW_WRITE=1');
putenv('JSON_FALLBACK=1');
\$service = new DataSchemaService(new DataLayer('${PORTAL_ROOT}/data', '${PROJECT_ROOT}'), '${PORTAL_ROOT}/data', '${PROJECT_ROOT}');
\$ws = \$service->getWorkspace();
\$metrics = \$ws['metrics'] ?? [];
\$conn = \$ws['connection'] ?? [];
echo 'dataschema_status=' . (\$conn['db_target_status'] ?? '') . PHP_EOL;
echo 'dataschema_tables=' . (\$metrics['db_present_table_count'] ?? '') . '/' . (\$metrics['table_count'] ?? '') . PHP_EOL;
echo 'dataschema_missing_tables=' . (\$metrics['db_missing_table_count'] ?? '') . PHP_EOL;
echo 'dataschema_missing_columns=' . (\$metrics['db_missing_column_count'] ?? '') . PHP_EOL;
echo 'dataschema_unexpected_columns=' . (\$metrics['db_unexpected_column_count'] ?? '') . PHP_EOL;
echo 'dataschema_pk_drift=' . (\$metrics['db_pk_drift_table_count'] ?? '') . PHP_EOL;
echo 'dataschema_type_drifts=' . (\$metrics['db_type_drift_column_count'] ?? '') . PHP_EOL;
echo 'dataschema_structural_drift=' . (\$metrics['db_structural_drift_table_count'] ?? '') . PHP_EOL;
PHP

echo "step=dataschema_verify"
as_db_user env DB_ALLOW_EMPTY_PASSWORD=1 php "$DATASCHEMA_SCRIPT" | tee "${WORKDIR}/dataschema_after.log"
grep -q '^dataschema_status=aligned$' "${WORKDIR}/dataschema_after.log"
grep -q '^dataschema_missing_tables=0$' "${WORKDIR}/dataschema_after.log"
grep -q '^dataschema_missing_columns=0$' "${WORKDIR}/dataschema_after.log"
grep -q '^dataschema_unexpected_columns=0$' "${WORKDIR}/dataschema_after.log"
grep -q '^dataschema_pk_drift=0$' "${WORKDIR}/dataschema_after.log"
grep -q '^dataschema_type_drifts=0$' "${WORKDIR}/dataschema_after.log"
grep -q '^dataschema_structural_drift=0$' "${WORKDIR}/dataschema_after.log"

echo "promotion_status=applied"
echo "backup_file=${BACKUP_FILE}"
echo "workdir_retained=${WORKDIR}"

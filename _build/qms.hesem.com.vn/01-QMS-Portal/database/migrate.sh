#!/usr/bin/env bash
# ============================================================================
# HESEM MOM Portal - Database Migration Runner
# Runs all migration files in order against a PostgreSQL database
# ============================================================================
# Usage:
#   ./migrate.sh -d <database> [-h <host>] [-p <port>] [-U <user>]
#
# Examples:
#   ./migrate.sh -d qms_portal
#   ./migrate.sh -h localhost -p 5432 -U postgres -d qms_portal
#   ./migrate.sh -d qms_portal --dry-run
#   ./migrate.sh -d qms_portal --status
# ============================================================================

set -euo pipefail

# Defaults
DB_HOST="${PGHOST:-localhost}"
DB_PORT="${PGPORT:-5432}"
DB_USER="${PGUSER:-postgres}"
DB_NAME=""
DRY_RUN=false
STATUS_ONLY=false
ALLOW_UNTRACKED_LIVE_DB=false

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

usage() {
    echo "Usage: $0 -d <database> [-h <host>] [-p <port>] [-U <user>] [--dry-run] [--status] [--allow-untracked-live-db]"
    echo ""
    echo "Options:"
    echo "  -d    Database name (required)"
    echo "  -h    Host (default: localhost)"
    echo "  -p    Port (default: 5432)"
    echo "  -U    User (default: postgres)"
    echo "  --dry-run  Show which files would be run without executing"
    echo "  --status   Show applied/pending migration status"
    echo "  --allow-untracked-live-db  Dangerous: only for disposable cloned probes"
    exit 1
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -d) DB_NAME="$2"; shift 2 ;;
        -h) DB_HOST="$2"; shift 2 ;;
        -p) DB_PORT="$2"; shift 2 ;;
        -U) DB_USER="$2"; shift 2 ;;
        --dry-run) DRY_RUN=true; shift ;;
        --status) STATUS_ONLY=true; shift ;;
        --allow-untracked-live-db) ALLOW_UNTRACKED_LIVE_DB=true; shift ;;
        *) echo "Unknown option: $1"; usage ;;
    esac
done

if [[ -z "$DB_NAME" ]]; then
    echo -e "${RED}Error: Database name is required (-d flag)${NC}"
    usage
fi

# Resolve script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MIGRATIONS_DIR="${SCRIPT_DIR}/migrations"

if [[ ! -d "$MIGRATIONS_DIR" ]]; then
    echo -e "${RED}Error: Migrations directory not found at ${MIGRATIONS_DIR}${NC}"
    exit 1
fi

# Auto-discover ordered migration files.
# Zero-padded numeric prefixes keep lexical sort aligned with execution order.
shopt -s nullglob
MIGRATIONS=()
for filepath in "${MIGRATIONS_DIR}"/*.sql; do
    MIGRATIONS+=("$(basename "$filepath")")
done
shopt -u nullglob

if [[ ${#MIGRATIONS[@]} -eq 0 ]]; then
    echo -e "${RED}Error: No SQL migration files found in ${MIGRATIONS_DIR}${NC}"
    exit 1
fi

IFS=$'\n' MIGRATIONS=($(printf '%s\n' "${MIGRATIONS[@]}" | sort))
unset IFS

psql_query() {
    local sql="$1"
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        -v ON_ERROR_STOP=1 \
        --no-psqlrc \
        -At \
        -c "$sql"
}

psql_exec() {
    local sql="$1"
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
        -v ON_ERROR_STOP=1 \
        --no-psqlrc \
        -q \
        -c "$sql"
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

ledger_exists="$(psql_query "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = current_schema() AND table_name = 'schema_migrations')")"
if [[ "$ledger_exists" != "t" && "$ledger_exists" != "true" ]]; then
    if [[ "$DRY_RUN" == "true" || "$STATUS_ONLY" == "true" ]]; then
        echo -e "${YELLOW}Warning: schema_migrations ledger is missing; output is advisory only.${NC}"
    else
        if ! psql_exec "CREATE TABLE schema_migrations (migration_id VARCHAR(200) PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), checksum VARCHAR(64) NOT NULL, execution_ms INT DEFAULT 0)" 2>/tmp/migrate_ledger_err_$$; then
            echo -e "${RED}Error: Cannot create schema_migrations with user ${DB_USER}.${NC}"
            echo "Run migrations with a database owner/migration user. Application runtime users should not own DDL privileges."
            cat /tmp/migrate_ledger_err_$$
            rm -f /tmp/migrate_ledger_err_$$
            exit 1
        fi
        rm -f /tmp/migrate_ledger_err_$$
        ledger_exists="t"
    fi
fi

LIVE_TABLE_COUNT="$(psql_query "SELECT COUNT(*)::int FROM information_schema.tables WHERE table_schema = current_schema() AND table_type = 'BASE TABLE' AND table_name <> 'schema_migrations'")"
APPLIED_COUNT=0
if [[ "$ledger_exists" == "t" || "$ledger_exists" == "true" ]]; then
    APPLIED_COUNT="$(psql_query "SELECT COUNT(*)::int FROM schema_migrations")"
fi

echo "============================================================================"
echo " HESEM MOM Portal - Database Migration"
echo "============================================================================"
echo " Host:     ${DB_HOST}:${DB_PORT}"
echo " Database: ${DB_NAME}"
echo " User:     ${DB_USER}"
echo " Files:    ${#MIGRATIONS[@]} migrations"
if $DRY_RUN; then
    echo " Mode:     DRY RUN (no changes will be made)"
elif $STATUS_ONLY; then
    echo " Mode:     STATUS (no changes will be made)"
fi
echo " Ledger:   ${APPLIED_COUNT} applied migrations"
echo " Tables:   ${LIVE_TABLE_COUNT} live base tables"
echo "============================================================================"
echo ""

if [[ "$STATUS_ONLY" == "true" ]]; then
    PENDING=0
    for migration in "${MIGRATIONS[@]}"; do
        migration_id="${migration%.sql}"
        escaped_id="$(sql_escape "$migration_id")"
        applied_at=""
        if [[ "$ledger_exists" == "t" || "$ledger_exists" == "true" ]]; then
            applied_at="$(psql_query "SELECT COALESCE(MAX(applied_at)::text, '') FROM schema_migrations WHERE migration_id = '${escaped_id}'")"
        fi
        if [[ -n "$applied_at" ]]; then
            echo -e "${GREEN}[APPLIED]${NC} ${migration_id} ${applied_at}"
        else
            echo -e "${YELLOW}[PENDING]${NC} ${migration_id}"
            PENDING=$((PENDING + 1))
        fi
    done
    echo ""
    echo "Status: ${APPLIED_COUNT} applied | ${PENDING} pending"
    if [[ "$LIVE_TABLE_COUNT" -gt 0 && "$APPLIED_COUNT" -eq 0 ]]; then
        echo -e "${YELLOW}Warning: target DB has live tables but no applied migration ledger. Use a no-data-loss promotion/baseline workflow.${NC}"
    fi
    exit 0
fi

if [[ "$DRY_RUN" != "true" && "$ALLOW_UNTRACKED_LIVE_DB" != "true" && "$LIVE_TABLE_COUNT" -gt 0 && "$APPLIED_COUNT" -eq 0 ]]; then
    echo -e "${RED}Error: target DB contains ${LIVE_TABLE_COUNT} live tables but schema_migrations has zero applied migrations.${NC}"
    echo "Refusing to run ordered migrations over an untracked production-like schema because this can corrupt or partially apply DDL."
    echo "Use the no-data-loss DB promotion/baseline workflow, or pass --allow-untracked-live-db only against a disposable cloned probe."
    exit 2
fi

FAILED=0
SUCCEEDED=0
SKIPPED=0

for migration in "${MIGRATIONS[@]}"; do
    filepath="${MIGRATIONS_DIR}/${migration}"
    migration_id="${migration%.sql}"

    if [[ ! -f "$filepath" ]]; then
        echo -e "${YELLOW}[SKIP]${NC} ${migration} (file not found)"
        SKIPPED=$((SKIPPED + 1))
        continue
    fi

    if $DRY_RUN; then
        escaped_id="$(sql_escape "$migration_id")"
        applied_at=""
        if [[ "$ledger_exists" == "t" || "$ledger_exists" == "true" ]]; then
            applied_at="$(psql_query "SELECT COALESCE(MAX(applied_at)::text, '') FROM schema_migrations WHERE migration_id = '${escaped_id}'")"
        fi
        if [[ -n "$applied_at" ]]; then
            echo -e "${GREEN}[SKIP]${NC} ${migration} (already applied)"
            SKIPPED=$((SKIPPED + 1))
        else
            echo -e "${YELLOW}[DRY]${NC}  ${migration}"
            SUCCEEDED=$((SUCCEEDED + 1))
        fi
        continue
    fi

    escaped_id="$(sql_escape "$migration_id")"
    applied_checksum="$(psql_query "SELECT COALESCE(MAX(checksum), '') FROM schema_migrations WHERE migration_id = '${escaped_id}'")"
    if [[ -n "$applied_checksum" ]]; then
        current_checksum="$(file_checksum "$filepath")"
        if [[ "$applied_checksum" != "$current_checksum" ]]; then
            echo -e "${YELLOW}[WARN]${NC} ${migration} checksum changed since application"
        fi
        echo -e "${GREEN}[SKIP]${NC} ${migration} (already applied)"
        SKIPPED=$((SKIPPED + 1))
        continue
    fi

    echo -n "[....] ${migration}"
    start_ms="$(perl -MTime::HiRes=time -e 'printf "%.0f\n", time()*1000')"

    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
            -v ON_ERROR_STOP=1 \
            --no-psqlrc \
            -q \
            -f "$filepath" 2>/tmp/migrate_err_$$; then
        end_ms="$(perl -MTime::HiRes=time -e 'printf "%.0f\n", time()*1000')"
        elapsed_ms=$((end_ms - start_ms))
        checksum="$(file_checksum "$filepath")"
        escaped_checksum="$(sql_escape "$checksum")"
        psql_exec "INSERT INTO schema_migrations (migration_id, checksum, execution_ms) VALUES ('${escaped_id}', '${escaped_checksum}', ${elapsed_ms})"
        echo -e "\r${GREEN}[ OK ]${NC} ${migration}"
        SUCCEEDED=$((SUCCEEDED + 1))
    else
        echo -e "\r${RED}[FAIL]${NC} ${migration}"
        echo -e "${RED}Error output:${NC}"
        cat /tmp/migrate_err_$$
        FAILED=$((FAILED + 1))
        echo ""
        echo -e "${RED}Migration aborted. Fix the error and re-run.${NC}"
        echo "To resume from this file:  psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f $filepath"
        rm -f /tmp/migrate_err_$$
        exit 1
    fi

    rm -f /tmp/migrate_err_$$
done

echo ""
echo "============================================================================"
echo " Migration Complete"
echo " Succeeded: ${SUCCEEDED}  |  Failed: ${FAILED}  |  Skipped: ${SKIPPED}"
echo "============================================================================"

if [[ $FAILED -gt 0 ]]; then
    exit 1
fi

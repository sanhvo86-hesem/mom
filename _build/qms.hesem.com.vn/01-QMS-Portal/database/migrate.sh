#!/usr/bin/env bash
# ============================================================================
# HESEM QMS Portal - Database Migration Runner
# Runs all migration files in order against a PostgreSQL database
# ============================================================================
# Usage:
#   ./migrate.sh -d <database> [-h <host>] [-p <port>] [-U <user>]
#
# Examples:
#   ./migrate.sh -d qms_portal
#   ./migrate.sh -h localhost -p 5432 -U postgres -d qms_portal
#   ./migrate.sh -d qms_portal --dry-run
# ============================================================================

set -euo pipefail

# Defaults
DB_HOST="${PGHOST:-localhost}"
DB_PORT="${PGPORT:-5432}"
DB_USER="${PGUSER:-postgres}"
DB_NAME=""
DRY_RUN=false

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

usage() {
    echo "Usage: $0 -d <database> [-h <host>] [-p <port>] [-U <user>] [--dry-run]"
    echo ""
    echo "Options:"
    echo "  -d    Database name (required)"
    echo "  -h    Host (default: localhost)"
    echo "  -p    Port (default: 5432)"
    echo "  -U    User (default: postgres)"
    echo "  --dry-run  Show which files would be run without executing"
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

echo "============================================================================"
echo " HESEM QMS Portal - Database Migration"
echo "============================================================================"
echo " Host:     ${DB_HOST}:${DB_PORT}"
echo " Database: ${DB_NAME}"
echo " User:     ${DB_USER}"
echo " Files:    ${#MIGRATIONS[@]} migrations"
if $DRY_RUN; then
    echo " Mode:     DRY RUN (no changes will be made)"
fi
echo "============================================================================"
echo ""

FAILED=0
SUCCEEDED=0
SKIPPED=0

for migration in "${MIGRATIONS[@]}"; do
    filepath="${MIGRATIONS_DIR}/${migration}"

    if [[ ! -f "$filepath" ]]; then
        echo -e "${YELLOW}[SKIP]${NC} ${migration} (file not found)"
        SKIPPED=$((SKIPPED + 1))
        continue
    fi

    if $DRY_RUN; then
        echo -e "${YELLOW}[DRY]${NC}  ${migration}"
        SUCCEEDED=$((SUCCEEDED + 1))
        continue
    fi

    echo -n "[....] ${migration}"

    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
            -v ON_ERROR_STOP=1 \
            --no-psqlrc \
            -q \
            -f "$filepath" 2>/tmp/migrate_err_$$; then
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

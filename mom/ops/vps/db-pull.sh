#!/usr/bin/env bash
# ============================================================================
# HESEM MOM Portal — Pull VPS database to local for development
#
# Usage:
#   bash mom/ops/vps/db-pull.sh               # dump only
#   bash mom/ops/vps/db-pull.sh --restore     # dump + restore to local DB
#   bash mom/ops/vps/db-pull.sh --restore --local-db mydb  # custom local DB name
#
# The script SSHs into the VPS, reads DB credentials from PHP-FPM pool config,
# runs pg_dump, streams the dump back, and optionally restores it locally.
# ============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

VPS="${TARGET:-root@103.110.87.55}"
APP_DIR="${APP_DIR:-/var/www/hesem-mom}"
DUMP_FILE="/tmp/hesem_vps_$(date +%Y%m%d_%H%M%S).dump"

LOCAL_DB="${LOCAL_DB:-mom}"
LOCAL_USER="${LOCAL_DB_USER:-postgres}"
LOCAL_HOST="${LOCAL_DB_HOST:-localhost}"
DO_RESTORE=0

log()  { printf '==> %s\n' "$*"; }
warn() { printf 'WARN: %s\n' "$*" >&2; }
die()  { printf 'ERROR: %s\n' "$*" >&2; exit 1; }

# Parse args
while [[ $# -gt 0 ]]; do
  case "$1" in
    --restore)    DO_RESTORE=1; shift ;;
    --local-db)   LOCAL_DB="$2"; shift 2 ;;
    --local-user) LOCAL_USER="$2"; shift 2 ;;
    --vps)        VPS="$2"; shift 2 ;;
    *) die "Unknown argument: $1" ;;
  esac
done

log "HESEM DB Pull: VPS → Local"
log "VPS: $VPS"
log "Dump file: $DUMP_FILE"
echo ""

# ── Step 1: Dump from VPS ────────────────────────────────────────────────────
log "[1/2] Dumping PostgreSQL from VPS..."

# Remote script: reads DB creds from FPM pool config, then pg_dumps
ssh "$VPS" bash <<'REMOTE'
set -euo pipefail

read_fpm_env() {
  local key="$1"
  local value
  while IFS= read -r conf; do
    [ -f "$conf" ] || continue
    value="$(awk -v key="$key" '
      $0 ~ "^[[:space:]]*env\\[" key "\\]" {
        sub(/^[^=]*=[[:space:]]*/, "")
        gsub(/^[[:space:]]+|[[:space:]]+$/, "")
        print; exit
      }
    ' "$conf")"
    if [ -n "$value" ]; then echo "$value"; return 0; fi
  done < <(find /etc/php -path '*/fpm/pool.d/*.conf' -type f 2>/dev/null | sort)
  return 1
}

DB_HOST="${DB_HOST:-$(read_fpm_env DB_HOST 2>/dev/null || echo localhost)}"
DB_PORT="${DB_PORT:-$(read_fpm_env DB_PORT 2>/dev/null || echo 5432)}"
DB_NAME="${DB_NAME:-$(read_fpm_env DB_NAME 2>/dev/null || echo mom)}"
DB_USER="${DB_USER:-$(read_fpm_env DB_USER 2>/dev/null || echo mom_app)}"
DB_PASSWORD="${DB_PASSWORD:-$(read_fpm_env DB_PASSWORD 2>/dev/null || read_fpm_env DB_PASS 2>/dev/null || echo '')}"

[ -n "$DB_PASSWORD" ] || { echo "ERROR: Cannot read DB_PASSWORD from FPM config" >&2; exit 1; }

PGPASSWORD="$DB_PASSWORD" pg_dump \
  -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
  --no-owner --no-acl -Fc
REMOTE
) > "$DUMP_FILE"

DUMP_SIZE="$(du -sh "$DUMP_FILE" 2>/dev/null | cut -f1 || echo '?')"
log "  Dump size: $DUMP_SIZE  →  $DUMP_FILE"
echo ""

# ── Step 2: Restore (optional) ───────────────────────────────────────────────
if [[ "$DO_RESTORE" == "1" ]]; then
  log "[2/2] Restoring to local PostgreSQL..."
  log "  Target: ${LOCAL_USER}@${LOCAL_HOST}/${LOCAL_DB}"

  # Ensure the local database exists
  if ! psql -U "$LOCAL_USER" -h "$LOCAL_HOST" -lqt 2>/dev/null | cut -d'|' -f1 | grep -qw "$LOCAL_DB"; then
    log "  Creating local database '$LOCAL_DB'..."
    createdb -U "$LOCAL_USER" -h "$LOCAL_HOST" "$LOCAL_DB" || \
      warn "createdb failed — proceeding anyway (DB may already exist)"
  fi

  pg_restore \
    -U "$LOCAL_USER" -h "$LOCAL_HOST" -d "$LOCAL_DB" \
    --clean --if-exists --no-owner \
    "$DUMP_FILE" \
    && log "  Restored to local DB: $LOCAL_DB" \
    || {
      warn "pg_restore exited with warnings/errors (may still be OK)"
      log "  Dump is at: $DUMP_FILE"
    }
else
  log "[2/2] Skipped restore (no --restore flag)."
  echo ""
  log "  To restore, run:"
  echo "      pg_restore -U $LOCAL_USER -d $LOCAL_DB --clean --if-exists --no-owner $DUMP_FILE"
  echo ""
  log "  Or re-run with --restore:"
  echo "      bash $0 --restore"
fi

echo ""
log "Done."

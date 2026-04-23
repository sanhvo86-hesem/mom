#!/usr/bin/env bash
# ============================================================================
# HESEM MOM Portal — Restore a local PostgreSQL dump back to the VPS DB
#
# !! DESTRUCTIVE !! This OVERWRITES the production database.
#
# Usage:
#   bash tools/vps-setup/scripts/db-push.sh \
#       --dump  ~/mom-vps-data/db/hesem_vps_20260423_080000.dump \
#       --change-ref CR-2026-099 \
#       --i-understand-this-overwrites-production
#
# This is the LAST RESORT. The professional path is:
#   * Configuration drift → use data-push.sh (file sync, drift-protected).
#   * Schema change       → write a migration in mom/database/migrations/.
#   * Data fix            → ship as a versioned migration (BEGIN; UPDATE; COMMIT).
# Use this script only when you are restoring from a known-good backup
# after an incident, or seeding a fresh VPS from a sanitised dev dump.
#
# Safety rails (all required, all checked before any destructive action):
#   1. --i-understand-this-overwrites-production opt-in flag.
#   2. --change-ref tying the operation to a CR/ticket.
#   3. /var/run/qms-data-push.lock.d (shared with data-push.sh) prevents
#      overlap with deploy.sh / data-push.sh.
#   4. Pre-restore pg_dump of the live VPS DB to
#      $PRIVATE_DATA/.db-backups/<timestamp>.dump  → rollback evidence.
#   5. Maintenance window: php-fpm stopped before restore, started after,
#      so requests don't see a half-restored DB.
#   6. Audit row in audit_events + line in /var/log/qms-data-sync.log.
#   7. Refuses to run if the dump is empty or not in PostgreSQL custom format.
#
# ISO context
# -----------
# Production-data restoration is a "control of nonconforming output" event
# (ISO 9001 §8.7) that customer auditors expect to see fully traced. The
# pre-restore backup + audit row + change-ref give them the full forensic
# trail in one place.
# ============================================================================
set -euo pipefail

VPS="${TARGET:-${VPS:-deploy@vps.hesemeng.com}}"
PRIVATE_DATA="${PRIVATE_DATA:-/var/www/data-private}"
DUMP_FILE=""
CHANGE_REF=""
I_UNDERSTAND=0
DRY_RUN=0

log()  { printf '==> %s\n' "$*"; }
warn() { printf 'WARN: %s\n' "$*" >&2; }
die()  { printf 'ERROR: %s\n' "$*" >&2; exit 1; }

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dump)        DUMP_FILE="$2"; shift 2 ;;
    --change-ref)  CHANGE_REF="$2"; shift 2 ;;
    --i-understand-this-overwrites-production) I_UNDERSTAND=1; shift ;;
    --vps)         VPS="$2"; shift 2 ;;
    --dry-run)     DRY_RUN=1; shift ;;
    -h|--help)
      sed -n '2,40p' "$0"
      exit 0
      ;;
    *) die "Unknown argument: $1" ;;
  esac
done

[[ -n "$DUMP_FILE" ]] || die "--dump <file.dump> is required"
[[ -f "$DUMP_FILE" ]] || die "Dump file not found: $DUMP_FILE"
[[ -s "$DUMP_FILE" ]] || die "Dump file is empty: $DUMP_FILE"

# pg_dump custom-format files start with the literal "PGDMP" magic header.
HEADER="$(head -c 5 "$DUMP_FILE" 2>/dev/null || true)"
if [[ "$HEADER" != "PGDMP" ]]; then
  die "Dump is not in PostgreSQL custom format (header was '$HEADER', expected 'PGDMP')"
fi

if [[ "$DRY_RUN" != "1" ]]; then
  [[ -n "$CHANGE_REF" ]] || die "--change-ref <CR-id> is required (omit only with --dry-run)"
  [[ "$I_UNDERSTAND" == "1" ]] || die "Refusing to run without --i-understand-this-overwrites-production"
fi

command -v ssh    >/dev/null 2>&1 || die "ssh not installed locally"
command -v jq     >/dev/null 2>&1 || die "jq not installed locally (brew install jq)"

ACTOR="$(id -un)@$(hostname -s 2>/dev/null || echo localhost)"
NOW="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
DUMP_SIZE="$(du -sh "$DUMP_FILE" 2>/dev/null | cut -f1 || echo '?')"
DUMP_HASH="$( (command -v sha256sum >/dev/null 2>&1 && sha256sum "$DUMP_FILE" || shasum -a 256 "$DUMP_FILE") | awk '{print $1}')"
LOCK_DIR_REMOTE="/var/run/qms-data-push.lock.d"
LOCK_HOLDER_ID="$ACTOR pid=$$ change_ref=${CHANGE_REF:-dry-run} db_push=1 ts=$NOW"
LOCK_ACQUIRED=0

log "HESEM DB push (DESTRUCTIVE — restores a dump onto the VPS DB)"
log "Dump:       $DUMP_FILE  ($DUMP_SIZE, sha256=${DUMP_HASH:0:16}…)"
log "VPS:        $VPS"
log "Actor:      $ACTOR"
log "Change ref: ${CHANGE_REF:-(dry-run)}"
[[ "$DRY_RUN" == "1" ]] && log "DRY RUN — only stages the dump, will not restore."
echo ""

if [[ "$DRY_RUN" != "1" ]]; then
  read -r -p "Type the change-ref ($CHANGE_REF) to confirm: " typed
  [[ "$typed" == "$CHANGE_REF" ]] || die "Confirmation does not match — aborting."
  echo ""
fi

acquire_remote_lock() {
  [[ "$DRY_RUN" == "1" ]] && return 0
  if ssh "$VPS" \
       "LOCK_DIR='$LOCK_DIR_REMOTE' HOLDER_ID='$LOCK_HOLDER_ID' bash -s" \
       <<'REMOTE'
set -eu
STALE_CUTOFF_SECONDS=28800   # 8h — DB restore windows can legitimately be long
mk() {
  if mkdir "$LOCK_DIR" 2>/dev/null; then return 0; fi
  if sudo -n mkdir "$LOCK_DIR" 2>/dev/null; then return 0; fi
  return 1
}
write_holder() {
  if printf '%s\n' "$HOLDER_ID" > "$LOCK_DIR/holder" 2>/dev/null; then return 0; fi
  printf '%s\n' "$HOLDER_ID" | sudo -n tee "$LOCK_DIR/holder" >/dev/null 2>&1
}
if mk; then
  write_holder || { rmdir "$LOCK_DIR" 2>/dev/null || sudo -n rmdir "$LOCK_DIR" 2>/dev/null; exit 1; }
  exit 0
fi
if [ -f "$LOCK_DIR/holder" ]; then
  holder_ts=$(stat -c '%Y' "$LOCK_DIR/holder" 2>/dev/null || echo 0)
  now=$(date +%s)
  age=$((now - holder_ts))
  if [ "$age" -lt "$STALE_CUTOFF_SECONDS" ]; then
    echo "ERROR: Push lock held by: $(cat "$LOCK_DIR/holder" 2>/dev/null || echo unknown) (age ${age}s < ${STALE_CUTOFF_SECONDS}s)" >&2
    exit 1
  fi
  echo "WARN: breaking stale lock (age ${age}s) held by $(cat "$LOCK_DIR/holder" 2>/dev/null || echo unknown)" >&2
  rm -rf "$LOCK_DIR" 2>/dev/null || sudo -n rm -rf "$LOCK_DIR" 2>/dev/null || { echo "ERROR: cannot remove stale $LOCK_DIR" >&2; exit 1; }
  mk && write_holder
else
  echo "ERROR: $LOCK_DIR exists with no holder file — refusing to touch (manual cleanup required)" >&2
  exit 1
fi
REMOTE
  then
    LOCK_ACQUIRED=1
    log "Push lock acquired on VPS ($LOCK_DIR_REMOTE)"
  else
    die "Could not acquire push lock on VPS (see error above)"
  fi
}

release_remote_lock() {
  [[ "$LOCK_ACQUIRED" == "1" ]] || return 0
  ssh "$VPS" \
    "LOCK_DIR='$LOCK_DIR_REMOTE' bash -s" <<'REMOTE' 2>/dev/null || true
rm -rf "$LOCK_DIR" 2>/dev/null || sudo -n rm -rf "$LOCK_DIR" 2>/dev/null || true
REMOTE
}
trap release_remote_lock EXIT

# ── Precondition: NOPASSWD sudo for systemctl is mandatory ──────────────────
# We MUST be able to stop php-fpm before restore (so requests don't observe
# a half-restored DB) and to start it afterwards. If sudo is unavailable,
# the silent failure mode would leave php-fpm serving an inconsistent DB —
# refuse to start the destructive flow at all.
if [[ "$DRY_RUN" != "1" ]]; then
  log "Precondition check: sudo -n systemctl on $VPS..."
  if ! ssh "$VPS" "sudo -n systemctl is-active php8.5-fpm >/dev/null 2>&1 || sudo -n systemctl is-enabled php8.5-fpm >/dev/null 2>&1"; then
    die "sudo -n systemctl on php8.5-fpm is not allowed for the SSH user. Add a NOPASSWD sudoers rule for /bin/systemctl (stop|start|reload) php8.5-fpm before running db-push.sh."
  fi
  log "  sudo systemctl OK"
  echo ""
fi

acquire_remote_lock

# ── Step 1: Stage dump on VPS ────────────────────────────────────────────────
# /tmp is world-readable. The dump contains every row of production data.
# Tighten file mode to 600 immediately after scp so other VPS users cannot
# read it during the restore window.
log "[1/5] Uploading dump to VPS staging area..."
REMOTE_STAGE="/tmp/hesem_dbpush_$(date -u +%Y%m%dT%H%M%SZ)_${DUMP_HASH:0:8}.dump"
scp -q "$DUMP_FILE" "${VPS}:${REMOTE_STAGE}" \
  || die "scp upload failed"
if ! ssh "$VPS" "chmod 600 '$REMOTE_STAGE'"; then
  ssh "$VPS" "rm -f '$REMOTE_STAGE'" >/dev/null 2>&1 || true
  die "Could not chmod 600 the staging file on VPS — refusing to continue with an exposed production dump"
fi
log "  Staged at $REMOTE_STAGE (mode 600)"
echo ""

if [[ "$DRY_RUN" == "1" ]]; then
  log "[2-5/5] Skipped (dry-run). Cleaning up staging file."
  ssh "$VPS" "rm -f '$REMOTE_STAGE'" || true
  exit 0
fi

# ── Steps 2-5 run on VPS inside a single ssh session under the push lock ────
ssh "$VPS" \
  "REMOTE_STAGE='$REMOTE_STAGE' PRIVATE_DATA='$PRIVATE_DATA' \
   ACTOR='$ACTOR' CHANGE_REF='$CHANGE_REF' DUMP_HASH='$DUMP_HASH' bash -s" <<'REMOTE'
set -euo pipefail

log()  { printf '==> %s\n' "$*"; }
die()  { printf 'ERROR: %s\n' "$*" >&2; exit 1; }

read_fpm_env() {
  local key="$1" value
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
[ -n "$DB_PASSWORD" ] || die "Cannot read DB_PASSWORD from FPM config"

# Step 2: pre-restore backup
log "[2/5] Backing up live DB before restore..."
BACKUP_DIR="$PRIVATE_DATA/.db-backups"
sudo -n mkdir -p "$BACKUP_DIR" 2>/dev/null || mkdir -p "$BACKUP_DIR"
BACKUP_FILE="$BACKUP_DIR/pre_restore_$(date -u +%Y%m%dT%H%M%SZ).dump"
PGPASSWORD="$DB_PASSWORD" pg_dump \
  -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
  --no-owner --no-acl -Fc -f "$BACKUP_FILE"
log "  Backup at $BACKUP_FILE ($(du -sh "$BACKUP_FILE" | cut -f1))"

# Prune backups: keep 30 most recent.
ls -1 "$BACKUP_DIR/"*.dump 2>/dev/null | sort | head -n -30 | xargs -r rm -f

# Step 3: maintenance window — stop php-fpm so requests don't hit a half-restored DB.
log "[3/5] Stopping php-fpm for maintenance window..."
sudo -n systemctl stop php8.5-fpm >/dev/null 2>&1 \
  || die "Could not stop php8.5-fpm; refusing to restore while live traffic may still hit the database"

# Step 4: restore
log "[4/5] Restoring dump into $DB_NAME..."
RESTORE_RC=0
PGPASSWORD="$DB_PASSWORD" pg_restore \
  -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
  --clean --if-exists --no-owner --single-transaction \
  "$REMOTE_STAGE" || RESTORE_RC=$?

if [ "$RESTORE_RC" -ne 0 ]; then
  log "  Restore failed (code $RESTORE_RC) — rolling back from $BACKUP_FILE"
  ROLLBACK_RC=0
  PGPASSWORD="$DB_PASSWORD" pg_restore \
    -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    --clean --if-exists --no-owner --single-transaction \
    "$BACKUP_FILE" || ROLLBACK_RC=$?

  rm -f "$REMOTE_STAGE"

  if [ "$ROLLBACK_RC" -eq 0 ]; then
    log "  Rollback succeeded — DB is back to pre-restore state"
    sudo -n systemctl start php8.5-fpm >/dev/null 2>&1 \
      || die "Rollback succeeded but php8.5-fpm could not be restarted. Manual service recovery is required before reopening traffic."
    die "Restore aborted (DB is recovered to pre-restore state, backup kept at $BACKUP_FILE)"
  fi

  # Rollback failed — DB is in unknown half-state. Leave php-fpm STOPPED
  # so requests don't observe the inconsistency, and exit very loudly.
  log "  ROLLBACK ALSO FAILED (code $ROLLBACK_RC) — DB is in UNKNOWN STATE"
  log "  PHP-FPM is intentionally NOT being restarted to prevent serving inconsistent data."
  log "  Manual recovery required. Backup file: $BACKUP_FILE"
  log "  Steps for the on-call DBA:"
  log "    1. Inspect $DB_NAME state: psql -U $DB_USER $DB_NAME"
  log "    2. Restore manually:  pg_restore --clean --if-exists --no-owner --single-transaction -d $DB_NAME $BACKUP_FILE"
  log "    3. Only after verification: sudo systemctl start php8.5-fpm"
  die "DOUBLE FAILURE — DB unknown, FPM stopped, manual recovery needed"
fi
log "  Restore OK."

# Step 5: restart + audit
log "[5/5] Restarting php-fpm and writing audit row..."
sudo -n systemctl start php8.5-fpm >/dev/null 2>&1 \
  || die "Restore succeeded but php8.5-fpm could not be restarted. Investigate the service before reopening traffic."

# Flat audit log.
LOG=/var/log/qms-data-sync.log
NOW="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
if sudo -n test -w "$(dirname "$LOG")" 2>/dev/null; then
  printf '%s [%s] db-push change_ref=%s actor=%s dump_sha256=%s pre_restore_backup=%s\n' \
    "$NOW" "DB-PUSH" "$CHANGE_REF" "$ACTOR" "$DUMP_HASH" "$BACKUP_FILE" \
    | sudo -n tee -a "$LOG" >/dev/null 2>&1 || true
fi

# DB audit row. Use psql variables (:'name') instead of string interpolation
# so a quote/backslash in $ACTOR / $DB_NAME cannot break out of the literal.
PAYLOAD="$(jq -nc \
  --arg actor "$ACTOR" \
  --arg cr "$CHANGE_REF" \
  --arg dump_hash "$DUMP_HASH" \
  --arg backup "$BACKUP_FILE" \
  '{actor:$actor, change_ref:$cr, dump_sha256:$dump_hash, pre_restore_backup:$backup}'
)"
PGPASSWORD="$DB_PASSWORD" psql \
  -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
  -v ON_ERROR_STOP=1 -q \
  -v aggregate_id="$DB_NAME" \
  -v actor_name="$ACTOR" \
  -v payload="$PAYLOAD" \
  -c "INSERT INTO audit_events (event_type, aggregate_type, aggregate_id,
        actor_name, payload, recorded_at)
      VALUES ('db_push', 'database',
        :'aggregate_id', :'actor_name', :'payload'::jsonb, NOW());" \
  || echo "WARN: could not write audit_events row (kept flat-file log only)" >&2

rm -f "$REMOTE_STAGE"
log "Done. Pre-restore backup: $BACKUP_FILE"
REMOTE

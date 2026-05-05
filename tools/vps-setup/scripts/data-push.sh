#!/usr/bin/env bash
# ============================================================================
# HESEM MOM Portal — Push edited runtime files from local back to VPS
#
# Usage:
#   bash tools/vps-setup/scripts/data-push.sh --source ~/mom-vps-data/.../latest
#   bash tools/vps-setup/scripts/data-push.sh --source <dir> --dry-run
#   bash tools/vps-setup/scripts/data-push.sh --source <dir> --change-ref CR-2026-042
#
# Required arguments:
#   --source <dir>      Path to a directory previously created by data-pull.sh.
#                       Must contain manifest.json + files/ subtree.
#   --change-ref <id>   Identifier of the change request that authorises this
#                       push (links the audit entry to your CR/ticket system).
#                       Optional only with --dry-run.
#
# What it does
# ------------
#   1. Acquires /var/run/qms-data-push.lock.d (atomic mkdir lock) to prevent
#      overlap with another push or with db-push.sh.
#   2. Re-checksums every file in the VPS subset and compares it to the
#      original pull manifest. If ANY file changed on VPS since the pull,
#      the push aborts (drift protection — required by ALCOA+ "Original").
#   3. Snapshots the current VPS subset to
#      $PRIVATE_DATA/.snapshots/<timestamp>/  (rollback evidence).
#   4. rsync's the local edited files up.
#   5. Restores correct ownership ($DEPLOY_USER:$WEB_GROUP, mode 750/640).
#   6. Reloads php-fpm so cached config takes effect.
#   7. Writes an audit row into the audit_events table (uses FPM-pool DB
#      credentials, same way deploy.sh + db-pull.sh discover them).
#   8. Logs the operation to /var/log/qms-data-sync.log.
#
# Safety properties
# -----------------
#   * Drift detection means a concurrent VPS edit aborts the push instead of
#     silently overwriting (no lost-update).
#   * Snapshot retention: 30 most recent snapshots kept, older pruned.
#   * --dry-run executes drift detection + checksum diff without uploading.
#
# ISO context
# -----------
# Together with the manifest produced by data-pull.sh, this push satisfies
# the ALCOA+ chain: each prod-data mutation is attributable to a named CR,
# original-state-preserved (snapshot), contemporaneously logged, and
# reproducible from the audit row + snapshot dir. This is what ISO 9001
# §8.5.6 "control of changes" expects when an auditor asks "show me every
# change to the live config in the last 90 days and prove no silent edits
# happened in between".
# ============================================================================
set -euo pipefail

VPS="${TARGET:-${VPS:-deploy@vps.hesemeng.com}}"
PRIVATE_DATA="${PRIVATE_DATA:-/var/www/data-private}"
SOURCE=""
CHANGE_REF=""
DRY_RUN=0
DEPLOY_USER_REMOTE="${DEPLOY_USER_REMOTE:-deploy}"
WEB_GROUP_REMOTE="${WEB_GROUP_REMOTE:-www-data}"

log()  { printf '==> %s\n' "$*"; }
warn() { printf 'WARN: %s\n' "$*" >&2; }
die()  { printf 'ERROR: %s\n' "$*" >&2; exit 1; }

while [[ $# -gt 0 ]]; do
  case "$1" in
    --source)      SOURCE="$2"; shift 2 ;;
    --change-ref)  CHANGE_REF="$2"; shift 2 ;;
    --dry-run)     DRY_RUN=1; shift ;;
    --vps)         VPS="$2"; shift 2 ;;
    --private-dir) PRIVATE_DATA="$2"; shift 2 ;;
    -h|--help)
      sed -n '2,52p' "$0"
      exit 0
      ;;
    *) die "Unknown argument: $1" ;;
  esac
done

[[ -n "$SOURCE" ]] || die "--source <dir> is required (output of data-pull.sh)"
[[ -d "$SOURCE" ]] || die "Source directory not found: $SOURCE"
[[ -f "$SOURCE/manifest.json" ]] || die "$SOURCE has no manifest.json — was it created by data-pull.sh?"
[[ -d "$SOURCE/files" ]] || die "$SOURCE has no files/ subtree"

if [[ "$DRY_RUN" != "1" && -z "$CHANGE_REF" ]]; then
  die "--change-ref <CR-id> is required for real pushes (omit only with --dry-run)"
fi

command -v rsync  >/dev/null 2>&1 || die "rsync not installed locally"
command -v ssh    >/dev/null 2>&1 || die "ssh not installed locally"
command -v jq     >/dev/null 2>&1 || die "jq not installed locally (brew install jq)"
command -v sha256sum >/dev/null 2>&1 || command -v shasum >/dev/null 2>&1 \
  || die "sha256sum / shasum not installed locally"

# Reject paths with shell metacharacters / whitespace (same reason as
# data-pull.sh — ${var#$ROOT/} expansion treats $ROOT as a glob pattern).
[[ "$PRIVATE_DATA" =~ ^/[A-Za-z0-9._/-]+$ ]] \
  || die "PRIVATE_DATA path contains forbidden characters: $PRIVATE_DATA"

SUBSET="$(jq -r '.subset' "$SOURCE/manifest.json")"
ORIGINAL_GIT_REV="$(jq -r '.git_revision' "$SOURCE/manifest.json")"
PULLED_AT="$(jq -r '.pulled_at' "$SOURCE/manifest.json")"
ACTOR="$(id -un)@$(hostname -s 2>/dev/null || echo localhost)"
NOW="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

[[ "$SUBSET" =~ ^[a-zA-Z0-9_.-]+$ || "$SUBSET" == "all" ]] \
  || die "Manifest subset '$SUBSET' is not a safe identifier"

REMOTE_TARGET="$PRIVATE_DATA"
[[ "$SUBSET" != "all" ]] && REMOTE_TARGET="$PRIVATE_DATA/$SUBSET"

log "HESEM data push (file sync — does NOT touch DB)"
log "Source:       $SOURCE"
log "VPS:          $VPS"
log "Remote:       $REMOTE_TARGET"
log "Subset:       $SUBSET"
log "Originally pulled: $PULLED_AT (git rev $ORIGINAL_GIT_REV)"
log "Actor:        $ACTOR"
log "Change ref:   ${CHANGE_REF:-(dry-run, no CR required)}"
[[ "$DRY_RUN" == "1" ]] && log "DRY RUN — no upload, no snapshot, no audit row."
echo ""

# ── Acquire long-lived push lock on VPS ────────────────────────────────────
# Each VPS step below opens a separate ssh — flock inside one ssh would not
# survive the others. We use an atomic mkdir lock dir with a holder file
# and a stale-lock cutoff, released by EXIT trap. This blocks two pushes
# (or push + db-push) from interleaving across the whole drift→snapshot→
# upload→verify→audit lifecycle. Skipped under --dry-run because dry-run
# performs no writes.
LOCK_DIR_REMOTE="${QMS_PUSH_LOCK_DIR:-/var/run/qms-data-push.lock.d}"
LOCK_HOLDER_ID="$ACTOR pid=$$ change_ref=${CHANGE_REF:-dry-run} ts=$(date -u +%Y-%m-%dT%H:%M:%SZ)"
LOCK_ACQUIRED=0

acquire_remote_lock() {
  [[ "$DRY_RUN" == "1" ]] && return 0
  if ssh "$VPS" \
       "LOCK_DIR='$LOCK_DIR_REMOTE' HOLDER_ID='$LOCK_HOLDER_ID' bash -s" \
       <<'REMOTE'
set -eu
STALE_CUTOFF_SECONDS=28800   # 8h — long uploads must not be mistaken for stale locks
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
# Existing lock — check staleness
if [ -f "$LOCK_DIR/holder" ]; then
  # Portable mtime (GNU stat -c %Y; BSD stat -f %m).
  holder_ts=$(stat -c '%Y' "$LOCK_DIR/holder" 2>/dev/null \
              || stat -f '%m' "$LOCK_DIR/holder" 2>/dev/null \
              || echo 0)
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

acquire_remote_lock

# ── Step 1: Drift detection (compare VPS now vs manifest from pull) ─────────
log "[1/5] Verifying VPS state against pull manifest (drift detection)..."

# Re-checksum the VPS subset and emit a JSON manifest in the same shape as
# data-pull.sh.
VPS_CURRENT_MANIFEST=$(SUBSET="$SUBSET" PRIVATE_DATA="$PRIVATE_DATA" \
  ssh "$VPS" "SUBSET='$SUBSET' PRIVATE_DATA='$PRIVATE_DATA' bash -s" <<'REMOTE'
set -euo pipefail
ROOT="$PRIVATE_DATA"
[ -d "$ROOT" ] || { echo "ERROR: $ROOT not found on VPS" >&2; exit 1; }

if [ "$SUBSET" = "all" ]; then
  TARGETS=("$ROOT")
else
  TARGETS=("$ROOT/$SUBSET")
fi

find_sync_files() {
  find "$@" \
    \( -path '*/.snapshots' -o -path '*/.snapshots/*' \
       -o -path '*/.backups' -o -path '*/.backups/*' \) -prune \
    -o -type f ! -name '*.tmp' -print0 2>/dev/null
}

FILES_JSON="$(
  find_sync_files "${TARGETS[@]}" | \
    while IFS= read -r -d '' f; do
      rel="${f#$ROOT/}"
      h="$(sha256sum "$f" | awk '{print $1}')"
      printf '{"path":"%s","sha256":"%s"}\n' "$rel" "$h"
    done | jq -s '.'
)"

jq -n --argjson files "$FILES_JSON" '{files: $files}'
REMOTE
)

# Build {path: sha256} maps from both manifests.
# `// {}` guards: `from_entries` on an empty array yields {}; but if .files
# is absent (jq -s '.' on no input), we coerce to {} explicitly so the
# subsequent `add | keys` step never sees a null.
MANIFEST_MAP="$(jq '([.files // [] | .[] | {key: .path, value: .sha256}] | from_entries) // {}' "$SOURCE/manifest.json")"
CURRENT_MAP="$(echo "$VPS_CURRENT_MANIFEST" | jq '([.files // [] | .[] | {key: .path, value: .sha256}] | from_entries) // {}')"

# Compute drift = files where CURRENT differs from MANIFEST or new files appeared.
DRIFT="$(jq -n \
  --argjson manifest "$MANIFEST_MAP" \
  --argjson current  "$CURRENT_MAP" '
    ([$manifest, $current] | add | keys) as $all
    | [
        $all[] as $p
        | {
            path: $p,
            manifest: ($manifest[$p] // null),
            current:  ($current[$p]  // null)
          }
        | select(.manifest != .current)
      ]
  '
)"

DRIFT_COUNT="$(echo "$DRIFT" | jq 'length')"

if [[ "$DRIFT_COUNT" -gt 0 ]]; then
  echo ""
  warn "Drift detected on VPS — $DRIFT_COUNT file(s) changed since you pulled at $PULLED_AT:"
  echo "$DRIFT" | jq -r '.[] | "  \(.path): manifest=\(.manifest // "(absent)") current=\(.current // "(absent)")"' >&2
  echo ""

  # ISO §8.5.6 wants every change-control attempt traced — including
  # refusals. Try VPS flat-file audit; if sudo is unavailable, mirror the
  # entry to local stderr so the operator at least has client-side
  # evidence of the refusal.
  AUDIT_LINE="$(date -u +%Y-%m-%dT%H:%M:%SZ) [PUSH-ABORTED-DRIFT] subset=$SUBSET change_ref=$CHANGE_REF actor=$ACTOR pulled_at=$PULLED_AT drift_files=$DRIFT_COUNT"
  REMOTE_LOGGED="$(ssh "$VPS" \
    "AUDIT_LINE='$AUDIT_LINE' bash -s" <<'REMOTE' 2>/dev/null || true
set -u
LOG=/var/log/qms-data-sync.log
if printf '%s\n' "$AUDIT_LINE" | sudo -n tee -a "$LOG" >/dev/null 2>&1; then
  echo OK
fi
REMOTE
  )"
  if [[ "$REMOTE_LOGGED" != "OK" ]]; then
    warn "Could not record refusal in /var/log/qms-data-sync.log on VPS (sudo unavailable). Refusal entry (keep for your records):"
    printf '  %s\n' "$AUDIT_LINE" >&2
  fi

  die "Refusing to push — pull a fresh copy, merge your edits, and try again. (This is the ALCOA+ 'Original' guarantee.)"
fi
log "  No drift. VPS still matches the manifest you pulled."
echo ""

# ── Step 2: Show what WILL change (rsync --dry-run --itemize) ───────────────
log "[2/5] Computing local-vs-VPS diff..."
LOCAL_ROOT="$SOURCE/files/"
ssh "$VPS" "test -d '$REMOTE_TARGET'" || die "$REMOTE_TARGET does not exist on VPS"

DIFF_OUTPUT="$(rsync -avzn --checksum --itemize-changes --delete \
  --exclude '.snapshots/***' --exclude '.backups/***' --exclude '*.tmp' \
  "$LOCAL_ROOT" "${VPS}:${REMOTE_TARGET}/" 2>&1 | grep -E '^[<>cdh*]' || true)"

if [[ -z "$DIFF_OUTPUT" ]]; then
  log "  No changes — local matches VPS exactly. Nothing to push."
  exit 0
fi

echo "$DIFF_OUTPUT" | sed 's/^/  /'
echo ""

if [[ "$DRY_RUN" == "1" ]]; then
  log "[3-5/5] Skipped (dry-run)."
  exit 0
fi

# ── Step 3: Snapshot current VPS subset for rollback evidence ───────────────
log "[3/5] Snapshotting current VPS state..."
SNAPSHOT_TS="$(date -u +%Y%m%dT%H%M%SZ)"
ssh "$VPS" \
  "SNAPSHOT_TS='$SNAPSHOT_TS' PRIVATE_DATA='$PRIVATE_DATA' SUBSET='$SUBSET' \
   DEPLOY_USER='$DEPLOY_USER_REMOTE' WEB_GROUP='$WEB_GROUP_REMOTE' \
   ACTOR='$ACTOR' CHANGE_REF='$CHANGE_REF' bash -s" <<'REMOTE'
set -euo pipefail
# Outer push lock (mkdir-based) is held by the calling shell — see
# acquire_remote_lock(). We do not re-flock here because a per-ssh flock
# would only protect this one heredoc and not the rsync/chown/audit ssh
# sessions that follow.

SNAPSHOT_DIR="$PRIVATE_DATA/.snapshots/$SNAPSHOT_TS"
mkdir -p "$SNAPSHOT_DIR"

if [ "$SUBSET" = "all" ]; then
  rsync -a --exclude '.snapshots' --exclude '.backups' \
    "$PRIVATE_DATA/" "$SNAPSHOT_DIR/"
else
  mkdir -p "$SNAPSHOT_DIR/$SUBSET"
  rsync -a "$PRIVATE_DATA/$SUBSET/" "$SNAPSHOT_DIR/$SUBSET/"
fi

# Record context inside the snapshot so it's self-describing. Build the
# JSON via jq so any quote/$/backtick in $CHANGE_REF or $ACTOR is escaped
# safely (cannot inject into the file or the shell).
jq -n \
  --arg sid    "$SNAPSHOT_TS" \
  --arg subset "$SUBSET" \
  --arg actor  "$ACTOR" \
  --arg cr     "$CHANGE_REF" \
  --arg root   "$PRIVATE_DATA" \
  --arg now    "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  '{
     snapshot_id: $sid,
     subset: $subset,
     captured_before_push_by: $actor,
     change_ref: $cr,
     captured_at: $now,
     vps_root: $root
   }' > "$SNAPSHOT_DIR/SNAPSHOT.json"

# Prune snapshots — keep 30 most recent.
# Keep 30 most recent snapshots. Portable across GNU/BSD (BSD head has no -n -N).
ls -1d "$PRIVATE_DATA/.snapshots/"* 2>/dev/null | sort | \
  awk 'BEGIN{keep=30}{a[NR]=$0}END{for(i=1;i<=NR-keep;i++)print a[i]}' | \
  while IFS= read -r old; do rm -rf "$old"; done

echo "$SNAPSHOT_DIR"
REMOTE
log "  Snapshot created on VPS at $PRIVATE_DATA/.snapshots/$SNAPSHOT_TS/"
echo ""

# ── Step 4: rsync up + fix permissions + reload php-fpm ─────────────────────
log "[4/5] Uploading + fixing permissions + reloading PHP-FPM..."
rsync -avz --checksum --delete \
  --exclude '.snapshots/***' --exclude '.backups/***' --exclude '*.tmp' \
  "$LOCAL_ROOT" "${VPS}:${REMOTE_TARGET}/" \
  || die "rsync upload failed (snapshot is at $PRIVATE_DATA/.snapshots/$SNAPSHOT_TS)"

ssh "$VPS" \
  "PRIVATE_DATA='$PRIVATE_DATA' SUBSET='$SUBSET' \
   DEPLOY_USER='$DEPLOY_USER_REMOTE' WEB_GROUP='$WEB_GROUP_REMOTE' bash -s" <<'REMOTE'
set -euo pipefail
TARGET="$PRIVATE_DATA"
[ "$SUBSET" != "all" ] && TARGET="$PRIVATE_DATA/$SUBSET"

if id -u "$DEPLOY_USER" >/dev/null 2>&1 && getent group "$WEB_GROUP" >/dev/null 2>&1; then
  if ! sudo -n chown -R "$DEPLOY_USER:$WEB_GROUP" "$TARGET" 2>/dev/null; then
    echo "WARN: could not chown $TARGET to $DEPLOY_USER:$WEB_GROUP" >&2
  fi
fi
if ! sudo -n find "$TARGET" -type d -exec chmod 750 {} + 2>/dev/null; then
  echo "WARN: could not chmod directories under $TARGET to 750" >&2
fi
if ! sudo -n find "$TARGET" -type f -exec chmod 640 {} + 2>/dev/null; then
  echo "WARN: could not chmod files under $TARGET to 640" >&2
fi

if ! sudo -n systemctl reload php8.5-fpm 2>/dev/null; then
  echo "WARN: could not reload php8.5-fpm; verify whether runtime config is re-read dynamically or reload it manually" >&2
fi
REMOTE
log "  Upload + permissions + PHP-FPM reload done."
echo ""

# ── Step 4b: Post-upload checksum verification ──────────────────────────────
# ALCOA+ "Accurate": confirm the bytes the VPS holds now actually match
# what we have locally. Re-checksum on the VPS, compare to local.
log "[4b/5] Verifying VPS checksums match local source..."

POST_VPS_MANIFEST=$(SUBSET="$SUBSET" PRIVATE_DATA="$PRIVATE_DATA" \
  ssh "$VPS" "SUBSET='$SUBSET' PRIVATE_DATA='$PRIVATE_DATA' bash -s" <<'REMOTE'
set -euo pipefail
ROOT="$PRIVATE_DATA"
if [ "$SUBSET" = "all" ]; then
  TARGETS=("$ROOT")
else
  TARGETS=("$ROOT/$SUBSET")
fi
find_sync_files() {
  find "$@" \
    \( -path '*/.snapshots' -o -path '*/.snapshots/*' \
       -o -path '*/.backups' -o -path '*/.backups/*' \) -prune \
    -o -type f ! -name '*.tmp' -print0 2>/dev/null
}
FILES_JSON="$(
  find_sync_files "${TARGETS[@]}" | \
    while IFS= read -r -d '' f; do
      rel="${f#$ROOT/}"
      h="$(sha256sum "$f" | awk '{print $1}')"
      printf '{"path":"%s","sha256":"%s"}\n' "$rel" "$h"
    done | jq -s '.'
)"
jq -n --argjson files "$FILES_JSON" '{files: $files}'
REMOTE
)

if command -v sha256sum >/dev/null 2>&1; then SHA="sha256sum"; else SHA="shasum -a 256"; fi
PREFIX=""
[[ "$SUBSET" != "all" ]] && PREFIX="$SUBSET/"

# Build {path: hash} for the LOCAL source we just uploaded.
# `// {}` guards against the empty-input case where `jq -s 'from_entries'`
# on no objects would yield null and crash the comparison below.
LOCAL_MAP="$(
  cd "$LOCAL_ROOT" && find . \
    \( -path './.snapshots' -o -path './.snapshots/*' \
       -o -path './.backups' -o -path './.backups/*' \) -prune \
    -o -type f ! -name '*.tmp' -print0 \
    | while IFS= read -r -d '' f; do
        rel="${f#./}"
        h="$($SHA "$f" | awk '{print $1}')"
        printf '{"key":"%s%s","value":"%s"}\n' "$PREFIX" "$rel" "$h"
      done | jq -s 'from_entries // {}'
)"
VPS_MAP="$(echo "$POST_VPS_MANIFEST" | jq '([.files // [] | .[] | {key:.path, value:.sha256}] | from_entries) // {}')"

POST_DIFF="$(jq -n \
  --argjson local "$LOCAL_MAP" --argjson vps "$VPS_MAP" '
    ([$local, $vps] | add | keys) as $all
    | [ $all[] as $p
        | { path:$p, local:($local[$p] // null), vps:($vps[$p] // null) }
        | select(.local != .vps)
      ]
  ')"
POST_DIFF_COUNT="$(echo "$POST_DIFF" | jq 'length')"

if [[ "$POST_DIFF_COUNT" -gt 0 ]]; then
  warn "Post-upload mismatch ($POST_DIFF_COUNT file(s)):"
  echo "$POST_DIFF" | jq -r '.[] | "  \(.path): local=\(.local // "(absent)") vps=\(.vps // "(absent)")"' >&2
  die "Bytes on VPS do not match local source. Snapshot is at $PRIVATE_DATA/.snapshots/$SNAPSHOT_TS — restore from there."
fi
log "  Verified: VPS now matches local source byte-for-byte."
echo ""

# ── Step 5: Audit log (DB + flat-file) ──────────────────────────────────────
log "[5/5] Recording audit entry..."
ssh "$VPS" \
  "ACTOR='$ACTOR' CHANGE_REF='$CHANGE_REF' SUBSET='$SUBSET' \
   PULLED_AT='$PULLED_AT' ORIGINAL_GIT_REV='$ORIGINAL_GIT_REV' \
   SNAPSHOT_TS='$SNAPSHOT_TS' bash -s" <<'REMOTE'
set -euo pipefail

NOW="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

# Append-only flat log — always writeable, captures the operation even when
# DB is down.
LOG=/var/log/qms-data-sync.log
if sudo -n test -w "$(dirname "$LOG")" 2>/dev/null; then
  printf '%s [%s] data-push subset=%s change_ref=%s actor=%s pulled_at=%s snapshot=%s\n' \
    "$NOW" "PUSH" "$SUBSET" "$CHANGE_REF" "$ACTOR" "$PULLED_AT" "$SNAPSHOT_TS" \
    | sudo -n tee -a "$LOG" >/dev/null 2>&1 || true
fi

# Best-effort DB audit row via psql, using FPM env credentials.
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

if [ -n "$DB_PASSWORD" ] && command -v psql >/dev/null 2>&1; then
  PAYLOAD="$(jq -nc \
    --arg actor "$ACTOR" \
    --arg cr "$CHANGE_REF" \
    --arg subset "$SUBSET" \
    --arg pulled_at "$PULLED_AT" \
    --arg orig_rev "$ORIGINAL_GIT_REV" \
    --arg snap "$SNAPSHOT_TS" \
    '{actor:$actor, change_ref:$cr, subset:$subset, pulled_at:$pulled_at,
      original_git_revision:$orig_rev, snapshot_id:$snap}'
  )"
  # Use psql variables (:'name') instead of string interpolation so a quote
  # or backslash in $ACTOR / $SUBSET cannot break out of the SQL literal.
  PGPASSWORD="$DB_PASSWORD" psql \
    -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    -v ON_ERROR_STOP=1 -q \
    -v aggregate_id="$SUBSET" \
    -v actor_name="$ACTOR" \
    -v payload="$PAYLOAD" \
    -c "INSERT INTO audit_events (event_type, aggregate_type, aggregate_id,
          actor_name, payload, recorded_at)
        VALUES ('data_push', 'data_private',
          :'aggregate_id', :'actor_name', :'payload'::jsonb, NOW());" \
    2>/dev/null || echo "WARN: could not write audit_events row (kept flat-file log only)" >&2
fi
REMOTE
log "  Audit recorded."
echo ""

log "Push complete."
log "  Snapshot (rollback): $PRIVATE_DATA/.snapshots/$SNAPSHOT_TS/"
log "  To roll back manually:"
log "    ssh $VPS \"sudo rsync -av --delete $PRIVATE_DATA/.snapshots/$SNAPSHOT_TS/$SUBSET/ $REMOTE_TARGET/\""

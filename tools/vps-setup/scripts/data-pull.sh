#!/usr/bin/env bash
# ============================================================================
# HESEM MOM Portal — Pull runtime data files from VPS to local
#
# Usage:
#   bash tools/vps-setup/scripts/data-pull.sh
#   bash tools/vps-setup/scripts/data-pull.sh --subset config
#   bash tools/vps-setup/scripts/data-pull.sh --vps deploy@vps.hesemeng.com
#
# Environment:
#   VPS / TARGET — SSH host (default: deploy@vps.hesemeng.com via .ssh/config)
#   PRIVATE_DATA — VPS path containing config/uploads (default /var/www/data-private)
#   LOCAL_DEST   — local mirror root (default ~/mom-vps-data/<host>/<timestamp>)
#   SUBSET       — subdir to pull (default: config). Use "all" to pull everything
#                  defined in $ALLOWED_SUBSETS below.
#
# What it does
# ------------
#   1. Generates a checksum + audit manifest on the VPS describing exactly
#      what is being exported (which file, sha256, size, mtime, who pulled,
#      git revision currently deployed).
#   2. Writes that manifest into BOTH the VPS audit log
#      (/var/log/qms-data-sync.log) AND the local snapshot directory
#      (manifest.json) so the chain of custody is reproducible.
#   3. rsync's the requested subset down with --checksum so corruption is
#      caught immediately.
#   4. Verifies local checksums against the manifest before declaring success.
#
# What it does NOT do
# -------------------
#   * Does NOT modify VPS files.
#   * Does NOT pull database content (use mom/ops/vps/db-pull.sh for that).
#   * Does NOT mask PII in pulled files. If a file under data-private/config/
#     contains personal data, treat the local copy as confidential.
#
# ISO context
# -----------
# The audit manifest covers ALCOA+ "Attributable / Contemporaneous / Original"
# for every export from production data. The companion data-push.sh refuses
# to overwrite VPS state unless the local manifest still matches, which is
# how customer auditors expect ISO 9001 §7.5.3 documented information control
# to behave.
# ============================================================================
set -euo pipefail

ALLOWED_SUBSETS=(config)

VPS="${TARGET:-${VPS:-deploy@vps.hesemeng.com}}"
PRIVATE_DATA="${PRIVATE_DATA:-/var/www/data-private}"
SUBSET="${SUBSET:-config}"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
LOCAL_DEST_DEFAULT="${HOME}/mom-vps-data/${VPS//[^a-zA-Z0-9]/_}/${TS}"
LOCAL_DEST="${LOCAL_DEST:-$LOCAL_DEST_DEFAULT}"

log()  { printf '==> %s\n' "$*"; }
warn() { printf 'WARN: %s\n' "$*" >&2; }
die()  { printf 'ERROR: %s\n' "$*" >&2; exit 1; }

while [[ $# -gt 0 ]]; do
  case "$1" in
    --vps)         VPS="$2"; shift 2 ;;
    --subset)      SUBSET="$2"; shift 2 ;;
    --dest)        LOCAL_DEST="$2"; shift 2 ;;
    --private-dir) PRIVATE_DATA="$2"; shift 2 ;;
    -h|--help)
      sed -n '2,42p' "$0"
      exit 0
      ;;
    *) die "Unknown argument: $1" ;;
  esac
done

# Validate subset against allow-list to prevent path traversal via SSH.
case "$SUBSET" in
  all) ;;
  *)
    SUBSET_OK=0
    for allowed in "${ALLOWED_SUBSETS[@]}"; do
      [[ "$allowed" == "$SUBSET" ]] && SUBSET_OK=1
    done
    [[ "$SUBSET_OK" == "1" ]] || die "Subset '$SUBSET' is not in the allow-list (${ALLOWED_SUBSETS[*]} or 'all')"
    ;;
esac

command -v rsync  >/dev/null 2>&1 || die "rsync not installed locally"
command -v ssh    >/dev/null 2>&1 || die "ssh not installed locally"
command -v jq     >/dev/null 2>&1 || die "jq not installed locally (brew install jq)"
command -v sha256sum >/dev/null 2>&1 || command -v shasum >/dev/null 2>&1 \
  || die "sha256sum / shasum not installed locally"

# Reject paths with shell metacharacters / whitespace. The remote heredoc
# uses ${var#$ROOT/} parameter expansion, which treats $ROOT as a glob —
# spaces, *, ?, [ in $PRIVATE_DATA would silently produce wrong relpaths.
[[ "$PRIVATE_DATA" =~ ^/[A-Za-z0-9._/-]+$ ]] \
  || die "PRIVATE_DATA path contains forbidden characters: $PRIVATE_DATA"

mkdir -p "$LOCAL_DEST"

log "HESEM data pull (file sync only — DB is separate)"
log "VPS:        $VPS"
log "Source:     $PRIVATE_DATA  (subset: $SUBSET)"
log "Local dest: $LOCAL_DEST"
echo ""

# ── Step 1: Manifest on VPS (checksum + identity + git revision) ────────────
log "[1/4] Generating manifest on VPS..."

# We embed the requested subset into the remote script via env so we never
# expand it inside the heredoc — protects against quoting bugs in $SUBSET.
REMOTE_MANIFEST=$(SUBSET="$SUBSET" PRIVATE_DATA="$PRIVATE_DATA" \
  ssh "$VPS" "SUBSET='$SUBSET' PRIVATE_DATA='$PRIVATE_DATA' bash -s" <<'REMOTE'
set -euo pipefail
ROOT="$PRIVATE_DATA"
[ -d "$ROOT" ] || { echo "ERROR: $ROOT not found on VPS" >&2; exit 1; }

if [ "$SUBSET" = "all" ]; then
  TARGETS=("$ROOT")
else
  TARGETS=("$ROOT/$SUBSET")
  [ -d "${TARGETS[0]}" ] || { echo "ERROR: ${TARGETS[0]} not found on VPS" >&2; exit 1; }
fi

# Identity for chain-of-custody.
ACTOR="$(id -un)@$(hostname -f 2>/dev/null || hostname)"
NOW="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
GIT_REV="$(git -C /var/www/eqms.hesemeng.com rev-parse HEAD 2>/dev/null || echo unknown)"

find_sync_files() {
  find "$@" \
    \( -path '*/.snapshots' -o -path '*/.snapshots/*' \
       -o -path '*/.backups' -o -path '*/.backups/*' \) -prune \
    -o -type f ! -name '*.tmp' -print0 2>/dev/null
}

# Build a JSON array of {path, size, mtime, sha256} for each tracked file.
FILES_JSON="$(
  find_sync_files "${TARGETS[@]}" | \
    while IFS= read -r -d '' f; do
      rel="${f#$ROOT/}"
      sz="$(stat -c '%s' "$f" 2>/dev/null || echo 0)"
      mt="$(date -u -r "$(stat -c '%Y' "$f")" +%Y-%m-%dT%H:%M:%SZ 2>/dev/null \
            || date -u -d "@$(stat -c '%Y' "$f")" +%Y-%m-%dT%H:%M:%SZ)"
      h="$(sha256sum "$f" | awk '{print $1}')"
      printf '{"path":"%s","size":%s,"mtime":"%s","sha256":"%s"}\n' \
             "$rel" "$sz" "$mt" "$h"
    done | jq -s '.'
)"

jq -n \
  --arg actor    "$ACTOR" \
  --arg ts       "$NOW" \
  --arg subset   "$SUBSET" \
  --arg root     "$ROOT" \
  --arg gitrev   "$GIT_REV" \
  --argjson files "$FILES_JSON" \
  '{
    schema_version: 1,
    operation:      "data-pull",
    pulled_at:      $ts,
    pulled_by:      $actor,
    vps_root:       $root,
    subset:         $subset,
    git_revision:   $gitrev,
    file_count:     ($files | length),
    files:          $files
  }'

# Append to VPS-side audit log (append-only, requires log dir to be writable
# by the SSH user). Best-effort — we still echo the manifest if the log
# write fails, so the local side has the data even if the VPS log is
# rotating.
LOG=/var/log/qms-data-sync.log
LOG_LINE="$(
  printf '%s [%s] data-pull subset=%s files=%s actor=%s rev=%s' \
    "$NOW" "PULL" "$SUBSET" \
    "$(echo "$FILES_JSON" | jq 'length')" "$ACTOR" "$GIT_REV"
)"
if ! { printf '%s\n' "$LOG_LINE" >> "$LOG" 2>/dev/null \
       || printf '%s\n' "$LOG_LINE" | sudo -n tee -a "$LOG" >/dev/null 2>&1; }; then
  echo "WARN: could not append pull audit line to $LOG (check sudoers / file permissions)" >&2
fi
REMOTE
)

if [[ -z "$REMOTE_MANIFEST" ]]; then
  die "Empty manifest from VPS — aborting (probably ssh or jq failure)"
fi

# Persist manifest locally.
echo "$REMOTE_MANIFEST" | jq '.' > "$LOCAL_DEST/manifest.json" \
  || die "Manifest is not valid JSON — VPS-side script likely failed"

FILE_COUNT="$(jq '.file_count' "$LOCAL_DEST/manifest.json")"
log "  Manifest written: $LOCAL_DEST/manifest.json ($FILE_COUNT files)"
echo ""

# ── Step 2: rsync down ───────────────────────────────────────────────────────
log "[2/4] Syncing files (rsync --checksum)..."

REMOTE_PATH="$PRIVATE_DATA"
[[ "$SUBSET" != "all" ]] && REMOTE_PATH="$PRIVATE_DATA/$SUBSET"

rsync -avz --checksum \
  --exclude '.snapshots/***' \
  --exclude '.backups/***' \
  --exclude '*.tmp' \
  "${VPS}:${REMOTE_PATH}/" \
  "${LOCAL_DEST}/files/" \
  || die "rsync failed"
echo ""

# ── Step 3: Verify checksums locally ────────────────────────────────────────
log "[3/4] Verifying local checksums against manifest..."

if command -v sha256sum >/dev/null 2>&1; then SHA="sha256sum"; else SHA="shasum -a 256"; fi

PREFIX=""
[[ "$SUBSET" != "all" ]] && PREFIX="$SUBSET/"

MISMATCH=0
while IFS=$'\t' read -r expected_hash rel_path; do
  # Strip the subset prefix because we rsync'd the subset itself.
  local_rel="${rel_path#$PREFIX}"
  local_path="$LOCAL_DEST/files/$local_rel"
  if [[ ! -f "$local_path" ]]; then
    warn "MISSING locally: $rel_path"
    MISMATCH=$((MISMATCH + 1))
    continue
  fi
  actual_hash="$($SHA "$local_path" | awk '{print $1}')"
  if [[ "$actual_hash" != "$expected_hash" ]]; then
    warn "CHECKSUM MISMATCH: $rel_path (vps=$expected_hash local=$actual_hash)"
    MISMATCH=$((MISMATCH + 1))
  fi
done < <(jq -r '.files[] | "\(.sha256)\t\(.path)"' "$LOCAL_DEST/manifest.json")

if [[ "$MISMATCH" -gt 0 ]]; then
  die "$MISMATCH file(s) failed checksum verification — pull is NOT trustworthy"
fi
log "  All $FILE_COUNT files match manifest checksums."
echo ""

# ── Step 4: Convenience symlink for "latest pull" ───────────────────────────
log "[4/4] Updating 'latest' symlink..."
LATEST_LINK="$(dirname "$LOCAL_DEST")/latest"
ln -sfn "$LOCAL_DEST" "$LATEST_LINK"
log "  $LATEST_LINK → $LOCAL_DEST"
echo ""

log "Pull complete. Files are at: $LOCAL_DEST/files/"
log "Edit them locally, then push back with:"
log "  bash tools/vps-setup/scripts/data-push.sh --source $LOCAL_DEST"

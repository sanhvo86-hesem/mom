#!/usr/bin/env bash
# Pull runtime config from the VPS to the local sync pool, then optionally
# apply the allowlisted local-app file(s). This script is intended for a
# developer laptop LaunchAgent, not for production VPS execution.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../../.." && pwd)"

TARGET="${TARGET:-eqms}"
APPLY_DECISION_THRESHOLDS="${APPLY_DECISION_THRESHOLDS:-0}"
HOST_SLUG="${TARGET//[^a-zA-Z0-9]/_}"
WORKING_DIR="${WORKING_DIR:-${HOME}/mom-vps-data/${HOST_SLUG}/working}"
TS="$(date -u +%Y%m%dT%H%M%SZ)"

log() { printf '==> %s\n' "$*"; }
die() { printf 'ERROR: %s\n' "$*" >&2; exit 1; }

log "Local pull-down sync"
log "Target:      $TARGET"
log "Repo:        $ROOT_DIR"
log "Working dir: $WORKING_DIR"

TARGET="$TARGET" WORKING_DIR="$WORKING_DIR" \
  bash "$SCRIPT_DIR/data-sync.sh" --pull-only --yes

if [[ "$APPLY_DECISION_THRESHOLDS" != "1" ]]; then
  log "Apply step disabled; local sync pool is updated only."
  exit 0
fi

src="$WORKING_DIR/files/config/decision_thresholds.json"
dest="$ROOT_DIR/mom/data/config/decision_thresholds.json"
[[ -f "$src" ]] || die "Pulled decision_thresholds.json not found at $src"

if command -v jq >/dev/null 2>&1; then
  jq empty "$src" >/dev/null
else
  php -r 'json_decode(file_get_contents($argv[1]), true); if (json_last_error() !== JSON_ERROR_NONE) { fwrite(STDERR, json_last_error_msg().PHP_EOL); exit(1); }' "$src"
fi

mkdir -p "$(dirname "$dest")"
if [[ -f "$dest" ]]; then
  cp -p "$dest" "${dest}.pre-local-sync.${TS}"
fi
tmp="${dest}.tmp.${TS}"
cp -p "$src" "$tmp"
mv "$tmp" "$dest"

log "Applied decision_thresholds.json to local app runtime."

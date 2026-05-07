#!/usr/bin/env bash
# ============================================================================
# Pull portal-managed HTML document files from VPS to local working tree.
#
# Why this script exists
# ----------------------
# Portal doc files (mom/docs/**/*.html) are git-tracked BUT also written at
# runtime by the portal editor (DocumentController::saveDraft / approve).
# When you edit a document in Chrome on localhost, that edit stays in your
# local file. If VPS has a different (newer or older) version, the two
# copies diverge silently. This script makes your local tree match VPS
# before you do any git work on docs.
#
# Usage:
#   bash tools/dev-setup/sync-docs-from-vps.sh
#   bash tools/dev-setup/sync-docs-from-vps.sh --dry-run
#   bash tools/dev-setup/sync-docs-from-vps.sh --vps deploy@vps.hesemeng.com
#
# What it does:
#   rsync --checksum the five portal doc directories from VPS to local.
#   Does NOT push anything to VPS. Does NOT run git operations.
# ============================================================================
set -euo pipefail

VPS="${TARGET:-${VPS:-deploy@vps.hesemeng.com}}"
SITE_DIR="${REMOTE_SITE_DIR:-/var/www/eqms.hesemeng.com}"
DRY_RUN=0

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

log()  { printf '==> %s\n' "$*"; }
die()  { printf 'ERROR: %s\n' "$*" >&2; exit 1; }

while [[ $# -gt 0 ]]; do
    case "$1" in
        --vps)      VPS="$2"; shift 2 ;;
        --dry-run)  DRY_RUN=1; shift ;;
        -h|--help)
            sed -n '2,30p' "$0"; exit 0 ;;
        *) die "Unknown argument: $1" ;;
    esac
done

RSYNC_FLAGS=(-a --checksum --human-readable --info=progress2)
if [ "$DRY_RUN" = "1" ]; then
    RSYNC_FLAGS+=(--dry-run)
    log "DRY RUN — no files will be written"
fi

DOC_DIRS=(
    mom/docs/system
    mom/docs/operations
    mom/docs/forms
    mom/docs/training
    mom/docs/glossary
)

log "Syncing portal doc files from $VPS..."
for rel in "${DOC_DIRS[@]}"; do
    src="$VPS:$SITE_DIR/$rel/"
    dest="$REPO_ROOT/$rel/"
    if [ "$DRY_RUN" = "0" ]; then
        mkdir -p "$dest"
    fi
    log "  $rel"
    rsync "${RSYNC_FLAGS[@]}" \
        --exclude '_*.en.html' \
        --exclude '_*.vi.html' \
        --exclude 'tmp/' \
        --exclude '.backups/' \
        "$src" "$dest" || die "rsync failed for $rel"
done

log "Done. Local doc tree now matches VPS."
log ""
log "If the pre-commit hook was blocking doc files, they now match VPS"
log "and you can safely commit structural (CSS/template) changes with:"
log "  ALLOW_DOC_COMMIT=1 git commit --no-verify"

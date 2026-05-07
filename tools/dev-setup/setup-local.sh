#!/usr/bin/env bash
# ============================================================================
# One-time local dev setup for HESEM MOM Portal.
#
# Run once after cloning or whenever you get a fresh checkout:
#   bash tools/dev-setup/setup-local.sh
#
# What it does:
#   1. Activates shared git hooks (.githooks/pre-commit, .githooks/pre-push)
#      so you cannot accidentally commit runtime-managed files.
#   2. Marks portal-managed HTML doc files as --skip-worktree so that
#      git reset --hard / git pull never silently overwrites portal edits.
# ============================================================================
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO_ROOT"

log()  { printf '==> %s\n' "$*"; }
ok()   { printf '    [ok] %s\n' "$*"; }

# ── Step 1: Activate shared git hooks ────────────────────────────────────
log "Activating shared git hooks (.githooks/)..."
git config core.hooksPath .githooks
ok "core.hooksPath = .githooks"

# ── Step 2: Mark portal doc HTML files as skip-worktree ──────────────────
# git update-index --skip-worktree tells git: "if this file exists and differs
# from HEAD, leave it alone during checkout/reset/pull". The file stays
# writable by PHP-FPM (portal editor) but git won't overwrite it.
log "Marking portal HTML doc files as skip-worktree..."
count=0
while IFS= read -r f; do
    git update-index --skip-worktree "$f" 2>/dev/null || true
    count=$((count + 1))
done < <(git ls-files mom/docs/system mom/docs/operations mom/docs/forms mom/docs/training mom/docs/glossary | grep '\.html$')
ok "Protected $count HTML doc files with --skip-worktree"

log ""
log "Local dev setup complete."
log ""
log "What this means:"
log "  - pre-commit hook will block runtime-managed config JSON and doc HTML"
log "  - git reset --hard / git pull will NOT overwrite local portal edits"
log ""
log "To commit a genuine structural doc fix (CSS, template — not content):"
log "  # First, undo skip-worktree for the specific file:"
log "  git update-index --no-skip-worktree mom/docs/system/quality-manual/qms-man-001-qms-manual.html"
log "  # Then commit with override:"
log "  ALLOW_DOC_COMMIT=1 git commit --no-verify"
log "  # Restore protection afterwards:"
log "  git update-index --skip-worktree mom/docs/system/quality-manual/qms-man-001-qms-manual.html"
log ""
log "To pull the current VPS doc state to local before dev work:"
log "  bash tools/dev-setup/sync-docs-from-vps.sh"

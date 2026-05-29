#!/usr/bin/env bash
# ============================================================================
# AI Session Preflight — anti-collision + anti-data-loss snapshot
# ============================================================================
# Run at the start of every AI-assisted coding session. Records the branch
# base SHA so the pre-push hook can detect collisions, and warns about state
# that has historically caused data loss:
#
#   - skip-worktree flags (ANNEX trap: file tracked but invisible on disk)
#   - unpushed commits (lost work if window closes)
#   - dirty working tree (uncommitted changes get clobbered on branch switch)
#   - migration drift (ghost migrations from earlier sessions)
#   - active VPS local-sync-agent (race against in-flight pull)
#
# Usage:
#   bash tools/ai/preflight.sh          # interactive report
#   bash tools/ai/preflight.sh --json   # machine-readable for CI/hooks
#   bash tools/ai/preflight.sh --quiet  # only fail on hard errors
#
# Side-effect: writes .ai/session-state.json with branch_base_sha so the
# pre-push hook can compare against it without re-deriving.
# ============================================================================
set -uo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$REPO_ROOT" || exit 2

STATE_FILE="$REPO_ROOT/.ai/session-state.json"
mkdir -p "$REPO_ROOT/.ai"

# Auto-install hooks path on first run so the pre-push collision guard
# protects every AI session without manual setup. Idempotent — does nothing
# if already configured to .githooks.
CURRENT_HOOKS_PATH="$(git config --get core.hooksPath 2>/dev/null || true)"
if [[ "$CURRENT_HOOKS_PATH" != ".githooks" ]] && [[ -d "$REPO_ROOT/.githooks" ]]; then
    git config core.hooksPath .githooks
    echo "preflight: enabled .githooks (was: ${CURRENT_HOOKS_PATH:-<unset>})"
fi

FORMAT="text"
QUIET=0
for arg in "$@"; do
    case "$arg" in
        --json) FORMAT="json" ;;
        --quiet) QUIET=1 ;;
    esac
done

# ── 1. Capture current state ──────────────────────────────────────────────
BRANCH="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo unknown)"
HEAD_SHA="$(git rev-parse HEAD 2>/dev/null || echo unknown)"
UPSTREAM="$(git rev-parse --abbrev-ref --symbolic-full-name '@{u}' 2>/dev/null || echo none)"
SESSION_ID="${SESSION_ID:-$(date -u +%Y%m%dT%H%M%SZ)-$$}"

# fetch quietly so subsequent comparisons are accurate; do not block on failure
git fetch origin --quiet 2>/dev/null || true
ORIGIN_MAIN_SHA="$(git rev-parse origin/main 2>/dev/null || echo unknown)"

# ── 2. Detect hazards ─────────────────────────────────────────────────────
HAZARDS=()

# 2a. skip-worktree files (the ANNEX trap)
SKIP_FILES="$(git ls-files -v 2>/dev/null | awk '/^[Ss]/ {print $2}')"
if [ -n "$SKIP_FILES" ]; then
    count=$(printf '%s\n' "$SKIP_FILES" | wc -l | tr -d ' ')
    HAZARDS+=("skip_worktree:$count files have skip-worktree flag (tracked but invisible on disk)")
fi

# 2b. unpushed commits
if [ "$UPSTREAM" != "none" ] && [ "$BRANCH" != "unknown" ]; then
    AHEAD=$(git rev-list --count "@{u}..HEAD" 2>/dev/null || echo 0)
    if [ "$AHEAD" -gt 0 ]; then
        HAZARDS+=("unpushed:$AHEAD commit(s) on $BRANCH not pushed to $UPSTREAM")
    fi
fi

# 2c. dirty working tree
DIRTY="$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')"
if [ "$DIRTY" -gt 0 ]; then
    HAZARDS+=("dirty_tree:$DIRTY uncommitted change(s) in working tree")
fi

# 2d. branch drift vs origin/main (informational unless on main itself)
BEHIND_MAIN=0
if [ "$ORIGIN_MAIN_SHA" != "unknown" ] && [ "$HEAD_SHA" != "unknown" ]; then
    BEHIND_MAIN=$(git rev-list --count HEAD.."$ORIGIN_MAIN_SHA" 2>/dev/null || echo 0)
    if [ "$BEHIND_MAIN" -gt 0 ] && [ "$BRANCH" = "main" ]; then
        HAZARDS+=("behind_main:local main is $BEHIND_MAIN commit(s) behind origin/main — pull before editing")
    fi
fi

# 2e. migration drift (cheap offline check)
DRIFT_STATUS="skipped"
DRIFT_OUTPUT=""
if [ -f "$REPO_ROOT/mom/tools/release/check_migration_drift.php" ]; then
    DRIFT_OUTPUT="$(php "$REPO_ROOT/mom/tools/release/check_migration_drift.php" --quiet 2>&1)"
    DRIFT_RC=$?
    if [ $DRIFT_RC -eq 0 ]; then
        DRIFT_STATUS="clean"
    elif [ $DRIFT_RC -eq 1 ]; then
        DRIFT_STATUS="drift"
        HAZARDS+=("migration_drift:run 'php mom/tools/release/check_migration_drift.php' for details")
    else
        DRIFT_STATUS="error"
    fi
fi

# 2f. VPS local-sync-agent running on laptop
SYNC_AGENT_PID=""
if command -v lsof >/dev/null 2>&1; then
    SYNC_AGENT_PID=$(lsof -ti TCP:48735 -sTCP:LISTEN 2>/dev/null | head -1 || true)
fi
SYNC_AGENT_ACTIVE="no"
if [ -n "$SYNC_AGENT_PID" ]; then
    SYNC_AGENT_ACTIVE="yes"
fi

# 2g. Cross-branch file collision — another AI session touching the same files
# This is the primary cause of silent overwrites in multi-AI concurrent work.
# We diff our unique commits (merge-base → HEAD) against every other active
# codex/* remote branch that also has commits ahead of origin/main.
CROSS_COLLISION_BRANCHES=()
MY_CROSS_BASE="$(git merge-base HEAD origin/main 2>/dev/null || true)"
if [ -n "$MY_CROSS_BASE" ]; then
    MY_CROSS_FILES="$(git diff --name-only "$MY_CROSS_BASE" HEAD 2>/dev/null | sort -u || true)"
    if [ -n "$MY_CROSS_FILES" ]; then
        while IFS= read -r remote_branch; do
            remote_branch="${remote_branch// /}"
            remote_short="${remote_branch#origin/}"
            # skip our own tracking branch
            [ "$remote_short" = "$BRANCH" ] && continue
            # skip branches with no commits ahead of main (already merged)
            other_ahead=$(git rev-list --count origin/main.."$remote_branch" 2>/dev/null || echo 0)
            [ "$other_ahead" -eq 0 ] && continue
            other_base="$(git merge-base "$remote_branch" origin/main 2>/dev/null || true)"
            [ -z "$other_base" ] && continue
            other_files="$(git diff --name-only "$other_base" "$remote_branch" 2>/dev/null | sort -u || true)"
            [ -z "$other_files" ] && continue
            overlap_count=$(comm -12 \
                <(printf '%s\n' "$MY_CROSS_FILES") \
                <(printf '%s\n' "$other_files") 2>/dev/null | wc -l | tr -d ' ')
            if [ "$overlap_count" -gt 0 ]; then
                CROSS_COLLISION_BRANCHES+=("$remote_short:${overlap_count}files")
            fi
        done < <(git branch -r 2>/dev/null | grep 'origin/codex/' | tr -d ' ')
        if [ ${#CROSS_COLLISION_BRANCHES[@]} -gt 0 ]; then
            joined=$(IFS=', '; echo "${CROSS_COLLISION_BRANCHES[*]}")
            HAZARDS+=("cross_branch_collision:files overlap with other active AI branches: $joined — cherry-pick separately via 'bash tools/ai/cherry-pick-to-main.sh'")
        fi
    fi
fi

# ── 3. Write session state ────────────────────────────────────────────────
cat > "$STATE_FILE" <<JSON
{
  "session_id": "$SESSION_ID",
  "started_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "branch": "$BRANCH",
  "branch_base_sha": "$HEAD_SHA",
  "origin_main_sha": "$ORIGIN_MAIN_SHA",
  "upstream": "$UPSTREAM",
  "drift_status": "$DRIFT_STATUS",
  "sync_agent_active": "$SYNC_AGENT_ACTIVE",
  "hazards_count": ${#HAZARDS[@]}
}
JSON

# ── 4. Report ─────────────────────────────────────────────────────────────
if [ "$FORMAT" = "json" ]; then
    cat "$STATE_FILE"
    exit 0
fi

if [ "$QUIET" -eq 0 ]; then
    echo "═══ AI Session Preflight ═══"
    echo "  Repo:       $REPO_ROOT"
    echo "  Branch:     $BRANCH @ $(echo "$HEAD_SHA" | head -c 8)"
    echo "  Upstream:   $UPSTREAM"
    echo "  Origin main: $(echo "$ORIGIN_MAIN_SHA" | head -c 8)"
    echo "  Session:    $SESSION_ID"
    echo "  Drift:      $DRIFT_STATUS"
    echo "  Sync agent: $SYNC_AGENT_ACTIVE"
    echo ""
fi

if [ ${#HAZARDS[@]} -eq 0 ]; then
    [ "$QUIET" -eq 0 ] && echo "✓ no hazards detected — safe to start session"
    exit 0
fi

echo "⚠ ${#HAZARDS[@]} hazard(s) detected:"
for h in "${HAZARDS[@]}"; do
    echo "  - $h"
done

# Hazards are advisory by default. A future session may pass --strict to fail.
exit 0

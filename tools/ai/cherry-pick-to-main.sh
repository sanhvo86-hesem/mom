#!/usr/bin/env bash
# ============================================================================
# cherry-pick-to-main.sh — safe integration of one AI session branch → main
# ============================================================================
# Each AI session works on its own codex/* branch. When done, THIS script
# stages the commits on a clean cherry/* branch from origin/main so they can
# be pushed / PR'd without trampling parallel sessions.
#
# Why cherry-pick instead of merge:
#   - merge carries the entire branch history including work-in-progress commits
#   - cherry-pick applies only the exact logical commits we decided are done
#   - two AI sessions on the same file can interleave: session A picks commits
#     1-3, session B picks commits 4-6, no conflict
#
# Usage:
#   bash tools/ai/cherry-pick-to-main.sh              # stage + summarise
#   bash tools/ai/cherry-pick-to-main.sh --push       # also push cherry/* to origin
#   bash tools/ai/cherry-pick-to-main.sh --dry-run    # list commits only, no checkout
#   bash tools/ai/cherry-pick-to-main.sh --from SHA   # cherry-pick from specific SHA
# ============================================================================
set -uo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$REPO_ROOT" || exit 2

DRY_RUN=0
DO_PUSH=0
FROM_SHA=""

while [[ $# -gt 0 ]]; do
    case "$1" in
        --dry-run) DRY_RUN=1 ;;
        --push)    DO_PUSH=1 ;;
        --from)    shift; FROM_SHA="${1:-}" ;;
        *) echo "Unknown argument: $1"; exit 1 ;;
    esac
    shift
done

CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
TIMESTAMP="$(date -u +%Y%m%dT%H%M%SZ)"
# Keep staging branch name short: cherry/YYYYMMDD-slug
BRANCH_SLUG="${CURRENT_BRANCH##*/}"        # strip any prefix
BRANCH_SLUG="${BRANCH_SLUG:0:40}"          # cap length
STAGING_BRANCH="cherry/${TIMESTAMP%T*}-${BRANCH_SLUG}"

# ── Guard: working tree must be clean ─────────────────────────────────────
DIRTY="$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')"
if [[ "$DIRTY" -gt 0 ]]; then
    echo "ERROR: working tree has $DIRTY uncommitted change(s). Commit or stash first."
    exit 1
fi

# ── Fetch so origin/main is current ───────────────────────────────────────
echo "Fetching origin..."
git fetch origin --quiet

# ── Determine commit range ─────────────────────────────────────────────────
if [[ -n "$FROM_SHA" ]]; then
    RANGE_BASE="$FROM_SHA"
else
    RANGE_BASE="$(git merge-base HEAD origin/main 2>/dev/null || echo)"
fi

if [[ -z "$RANGE_BASE" ]]; then
    echo "ERROR: cannot find merge-base between HEAD and origin/main."
    exit 1
fi

# Collect commits oldest → newest
mapfile -t COMMITS < <(git log --reverse --format="%H" "$RANGE_BASE"..HEAD 2>/dev/null)

if [[ ${#COMMITS[@]} -eq 0 ]]; then
    echo "Nothing to cherry-pick — no commits between $(git rev-parse --short "$RANGE_BASE") and HEAD."
    exit 0
fi

echo ""
echo "═══ Cherry-pick-to-main ═══"
echo "  Source branch:    $CURRENT_BRANCH"
echo "  Staging branch:   $STAGING_BRANCH"
echo "  Base (fork point): $(git rev-parse --short "$RANGE_BASE")"
echo "  Commits to apply: ${#COMMITS[@]}"
echo ""
echo "  Commit list (oldest → newest):"
for sha in "${COMMITS[@]}"; do
    msg="$(git log --format="%s" -1 "$sha" 2>/dev/null)"
    echo "    $(git rev-parse --short "$sha" 2>/dev/null) $msg"
done
echo ""

if [[ "$DRY_RUN" -eq 1 ]]; then
    echo "[dry-run] Would create '$STAGING_BRANCH' from origin/main and cherry-pick ${#COMMITS[@]} commit(s)."
    echo "[dry-run] No files changed."
    exit 0
fi

# ── Cross-branch collision pre-check ──────────────────────────────────────
echo "Checking for cross-branch file collisions..."
MY_FILES="$(git diff --name-only "$RANGE_BASE" HEAD 2>/dev/null | sort -u || true)"
WARNED_BRANCHES=()
while IFS= read -r remote_branch; do
    remote_branch="${remote_branch// /}"
    remote_short="${remote_branch#origin/}"
    [[ "$remote_short" == "$CURRENT_BRANCH" ]] && continue
    other_ahead=$(git rev-list --count origin/main.."$remote_branch" 2>/dev/null || echo 0)
    [[ "$other_ahead" -eq 0 ]] && continue
    other_base="$(git merge-base "$remote_branch" origin/main 2>/dev/null || echo)"
    [[ -z "$other_base" ]] && continue
    other_files="$(git diff --name-only "$other_base" "$remote_branch" 2>/dev/null | sort -u || true)"
    [[ -z "$other_files" ]] && continue
    overlap_count=$(comm -12 \
        <(printf '%s\n' "$MY_FILES") \
        <(printf '%s\n' "$other_files") 2>/dev/null | wc -l | tr -d ' ')
    if [[ "$overlap_count" -gt 0 ]]; then
        WARNED_BRANCHES+=("$remote_short ($overlap_count overlapping files)")
    fi
done < <(git branch -r 2>/dev/null | grep 'origin/codex/' | tr -d ' ')

if [[ ${#WARNED_BRANCHES[@]} -gt 0 ]]; then
    echo ""
    echo "  ⚠ WARNING: file overlap with other active AI sessions:"
    for wb in "${WARNED_BRANCHES[@]}"; do
        echo "    - $wb"
    done
    echo "  Cherry-pick will proceed. Review the overlap files carefully after staging."
    echo ""
fi

# ── Create staging branch from origin/main ────────────────────────────────
echo "Creating staging branch '$STAGING_BRANCH' from origin/main..."
git checkout -b "$STAGING_BRANCH" origin/main

# ── Cherry-pick each commit ───────────────────────────────────────────────
echo ""
echo "Applying commits..."
FAILED_SHA=""
for sha in "${COMMITS[@]}"; do
    msg="$(git log --format="%s" -1 "$sha" 2>/dev/null)"
    short="$(git rev-parse --short "$sha" 2>/dev/null)"
    if git cherry-pick --no-edit "$sha" 2>/dev/null; then
        echo "  ✓ $short  $msg"
    else
        echo ""
        echo "  ✗ CONFLICT on $short: $msg"
        echo ""
        echo "  Resolve conflicts, then:"
        echo "    git cherry-pick --continue"
        echo "    # — or —"
        echo "    git cherry-pick --skip   # skip this commit"
        echo ""
        echo "  Staging branch left at: $STAGING_BRANCH"
        FAILED_SHA="$sha"
        break
    fi
done

if [[ -n "$FAILED_SHA" ]]; then
    echo "Cherry-pick stopped at $(git rev-parse --short "$FAILED_SHA"). Fix conflicts and re-run."
    exit 1
fi

echo ""
echo "✓ All ${#COMMITS[@]} commit(s) applied cleanly."

# ── Offline validation ─────────────────────────────────────────────────────
echo ""
echo "═══ Offline validation ═══"

# PHP syntax check
PHP_FILES=$(git diff --name-only origin/main HEAD 2>/dev/null | grep '\.php$' || true)
if [[ -n "$PHP_FILES" ]]; then
    SYNTAX_FAIL=0
    while IFS= read -r f; do
        if [[ -f "$REPO_ROOT/$f" ]] && ! php -l "$REPO_ROOT/$f" >/dev/null 2>&1; then
            echo "  SYNTAX FAIL: $f"
            SYNTAX_FAIL=1
        fi
    done <<< "$PHP_FILES"
    php_count=$(echo "$PHP_FILES" | wc -l | tr -d ' ')
    if [[ "$SYNTAX_FAIL" -eq 0 ]]; then
        echo "  ✓ PHP syntax OK ($php_count files)"
    fi
fi

# Migration drift
if [[ -f "$REPO_ROOT/mom/tools/release/check_migration_drift.php" ]]; then
    if php "$REPO_ROOT/mom/tools/release/check_migration_drift.php" --quiet >/dev/null 2>&1; then
        echo "  ✓ Migration drift: clean"
    else
        echo "  ⚠ Migration drift — run: php mom/tools/release/check_migration_drift.php"
    fi
fi

# ── Summary ──────────────────────────────────────────────────────────────
echo ""
echo "═══ Result ═══"
echo "  Staging branch ready: $STAGING_BRANCH"
echo "  Source branch intact: $CURRENT_BRANCH (not modified)"
echo ""

if [[ "$DO_PUSH" -eq 1 ]]; then
    echo "Pushing '$STAGING_BRANCH' to origin..."
    git push origin "$STAGING_BRANCH"
    echo ""
    echo "  To open a PR:"
    echo "    gh pr create --base main --head $STAGING_BRANCH --title '...' --body '...'"
else
    echo "  Next steps (pick one):"
    echo "    A) Push + PR (recommended for review):"
    echo "       git push origin $STAGING_BRANCH"
    echo "       gh pr create --base main --head $STAGING_BRANCH"
    echo ""
    echo "    B) Direct merge to main (if solo / no conflicts):"
    echo "       git checkout main && git pull"
    echo "       git merge --ff-only $STAGING_BRANCH"
    echo "       git push origin main"
    echo "       # then deploy:"
    echo "       ssh eqms 'sudo -n bash /var/www/eqms.hesemeng.com/tools/vps-setup/scripts/deploy.sh'"
fi
echo ""

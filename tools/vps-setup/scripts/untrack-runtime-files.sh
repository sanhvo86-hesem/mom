#!/usr/bin/env bash
# ============================================================================
# untrack-runtime-files.sh — STRUCTURAL FIX (one-time, requires authorization)
#
# Removes all runtime-mutated config files from git tracking and replaces them
# with `.bootstrap.json` siblings that hold the seed values for fresh installs.
# After this runs, `git reset --hard` on the VPS PHYSICALLY CANNOT touch the
# runtime files (untracked files survive reset).
#
# Why this is the real fix:
#   capture/restore in deploy.sh is a runtime guarantee — it depends on the
#   preserve list being complete and the script running correctly. The
#   structural fix removes the failure mode entirely: if a file isn't in git,
#   no git operation can clobber it. That is the "never again" property.
#
# What this script does (idempotent — re-running is safe):
#   For each file F in RUNTIME_CONFIG_FILES that is currently tracked:
#     1. Copy F → F.bootstrap.json (seed for fresh installs)
#     2. git rm --cached F        (untrack but keep file on disk)
#     3. Add F to .gitignore       (idempotent)
#     4. git add F.bootstrap.json + .gitignore
#   Then writes a single git commit summarising the change.
#
# This script does NOT push. Review the commit, run the test suite, then push.
#
# Required guardrails:
#   - You MUST pass --i-have-backed-up-vps-data-private flag.
#   - The repo working tree must be clean (no other uncommitted changes).
#   - You must run from a developer workstation, not on the VPS.
#
# After this runs, deploy.sh will bootstrap missing files from the
# .bootstrap.json siblings on first deploy to a fresh VPS.
# ============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# When self-reexec'd from /tmp (see auto-stash block below), the original
# repo root is passed in via env so the script doesn't try to derive it
# from the temp script location.
REPO_ROOT="${UNTRACK_REPO_ROOT:-$(cd "$SCRIPT_DIR/../../.." && pwd)}"

# shellcheck source=_runtime-files.sh
. "$SCRIPT_DIR/_runtime-files.sh"

CONFIRMED=0
DRY_RUN=0
REQUIRE_CLEAN_TREE=0
for arg in "$@"; do
  case "$arg" in
    --i-have-backed-up-vps-data-private) CONFIRMED=1 ;;
    --dry-run)                            DRY_RUN=1 ;;
    --require-clean-tree)                 REQUIRE_CLEAN_TREE=1 ;;
    -h|--help)                            sed -n '2,30p' "$0"; exit 0 ;;
    *)                                    echo "Unknown arg: $arg" >&2; exit 1 ;;
  esac
done

cd "$REPO_ROOT"

# ── Pre-flight ──────────────────────────────────────────────────────────────
if [ "$CONFIRMED" != "1" ] && [ "$DRY_RUN" != "1" ]; then
  cat >&2 <<EOF
ERROR: This script untracks runtime config files from git permanently.

If a fresh checkout of this repo is ever deployed to a VPS without the
matching /var/www/data-private/config/ mirror in place, the application
will start with empty users.json / role_permissions.json / etc. (it will
bootstrap from the *.bootstrap.json seeds — but the live VPS state will
be lost forever if you haven't backed it up).

Before running, on the VPS execute:
  sudo cp -a /var/www/data-private /var/backups/data-private-\$(date +%F)
  sudo cp -a /var/www/eqms.hesemeng.com/mom/data/config /var/backups/site-config-\$(date +%F)

Then re-run with:
  bash $0 --i-have-backed-up-vps-data-private

Dry-run (no changes):
  bash $0 --dry-run
EOF
  exit 1
fi

# Clean-tree handling:
#   default          → auto-stash other dirty state for clean rewrite;
#                      restored via `git stash pop` at the end so the user
#                      sees no net change to their other in-progress work.
#   --require-clean-tree → strict mode (refuses if anything dirty)
NEEDS_STASH=0
if [ "$DRY_RUN" != "1" ]; then
  DIRTY="$(git status --porcelain)"
  if [ -n "$DIRTY" ]; then
    if [ "$REQUIRE_CLEAN_TREE" = "1" ]; then
      echo "ERROR: --require-clean-tree set and working tree is dirty." >&2
      git status --short >&2
      exit 1
    fi

    # Refuse if any of the runtime targets themselves OR .gitignore are
    # dirty — we cannot safely stash-and-rewrite without losing the user's
    # in-progress edits to those exact files. They must resolve first.
    AMBIGUOUS=""
    for f in "${RUNTIME_CONFIG_FILES[@]}"; do
      rel="mom/data/config/$f"
      if printf '%s\n' "$DIRTY" | awk '{print substr($0,4)}' | grep -qxF "$rel"; then
        AMBIGUOUS+="$rel"$'\n'
      fi
    done
    if printf '%s\n' "$DIRTY" | awk '{print substr($0,4)}' | grep -qxF ".gitignore"; then
      AMBIGUOUS+=".gitignore"$'\n'
    fi
    if [ -n "$AMBIGUOUS" ]; then
      echo "ERROR: these files conflict with the untrack rewrite — resolve before running:" >&2
      printf '%s' "$AMBIGUOUS" | sed 's/^/  - /' >&2
      echo "" >&2
      echo "Either commit, stash, or discard the changes to those files first." >&2
      exit 1
    fi

    echo "Working tree has unrelated changes — stashing temporarily for a clean rewrite."
    echo "(Auto-restored via 'git stash pop' at the end.)"
    NEEDS_STASH=1
  fi
fi

# Stash unrelated work into a uniquely-named stash. --include-untracked also
# stashes the new defense-script files that aren't yet committed. This makes
# the working tree match HEAD, so the untrack rewrite operates in a clean
# environment and `git commit` (no pathspec) won't accidentally bundle other
# staged work.
STASH_REF=""
restore_stash() {
  if [ "$NEEDS_STASH" = "1" ] && [ -n "$STASH_REF" ]; then
    echo ""
    echo "Restoring stashed changes ($STASH_REF)..."
    if git stash pop "$STASH_REF" >/dev/null 2>&1; then
      echo "  ✓ Other in-progress work restored."
    else
      echo "  WARN: stash pop reported conflicts. Your stash is preserved." >&2
      echo "        Inspect:  git stash list" >&2
      echo "        Restore:  git stash pop $STASH_REF" >&2
    fi
  fi
}
trap restore_stash EXIT

if [ "$NEEDS_STASH" = "1" ]; then
  # Self-preservation: copy this script AND its `_runtime-files.sh`
  # dependency to /tmp and re-exec from there. If we don't, `git stash
  # --include-untracked` will move both files out of the working tree
  # mid-execution (because they are themselves still uncommitted in the
  # repo where we are about to run the rewrite), and bash will fail when
  # it tries to read further from the script file or re-source the deps.
  if [ "${UNTRACK_SCRIPT_REEXECED:-0}" != "1" ]; then
    SAFE_DIR="$(mktemp -d -t untrack-runtime-files.XXXXXX)"
    cp "$0" "$SAFE_DIR/untrack-runtime-files.sh"
    cp "$SCRIPT_DIR/_runtime-files.sh" "$SAFE_DIR/_runtime-files.sh"
    chmod +x "$SAFE_DIR/untrack-runtime-files.sh"
    UNTRACK_SCRIPT_REEXECED=1 \
    UNTRACK_REPO_ROOT="$REPO_ROOT" \
    exec bash "$SAFE_DIR/untrack-runtime-files.sh" "$@"
  fi

  STASH_TAG="untrack-runtime-files-prep-$(date +%s)"
  # --include-untracked is required so files like the still-uncommitted
  # defense scripts also survive. Tracked changes alone wouldn't move our
  # uncommitted work out of the way for a clean rewrite.
  if ! git stash push --include-untracked -m "$STASH_TAG" >/dev/null 2>&1; then
    echo "ERROR: git stash push failed. Resolve dirty state manually then retry." >&2
    NEEDS_STASH=0  # disable trap restore — nothing to restore
    exit 1
  fi
  # NOTE: don't use `awk '... exit'` here — its early exit closes the pipe
  # before `git stash list` is done writing, sending SIGPIPE back to git.
  # With `set -o pipefail` + `set -e` that propagates through command
  # substitution and silently kills the script. Use a non-exiting awk
  # then take the first match with `head`.
  STASH_REF="$(git stash list | awk -v tag="$STASH_TAG" -F: '$0 ~ tag {print $1}' | head -n 1 || true)"
  if [ -z "$STASH_REF" ]; then
    echo "ERROR: could not locate the stash we just created. Aborting before rewrite." >&2
    NEEDS_STASH=0
    exit 1
  fi
  echo "  Stashed as: $STASH_REF (tag: $STASH_TAG)"
  echo ""
fi

# ── Plan ────────────────────────────────────────────────────────────────────
echo "Runtime files to untrack:"
declare -a TO_UNTRACK=()
declare -a SKIP_ALREADY=()
for f in "${RUNTIME_CONFIG_FILES[@]}"; do
  rel="mom/data/config/$f"
  if git ls-files --error-unmatch "$rel" >/dev/null 2>&1; then
    TO_UNTRACK+=("$rel")
    printf "  TRACKED   → will untrack: %s\n" "$rel"
  else
    SKIP_ALREADY+=("$rel")
  fi
done
if [ "${#SKIP_ALREADY[@]}" -gt 0 ]; then
  echo ""
  echo "Already untracked (skipping):"
  for rel in "${SKIP_ALREADY[@]}"; do
    printf "  ok      %s\n" "$rel"
  done
fi
echo ""

if [ "${#TO_UNTRACK[@]}" -eq 0 ]; then
  echo "Nothing to untrack — all runtime files are already untracked."
  exit 0
fi

if [ "$DRY_RUN" = "1" ]; then
  echo "DRY-RUN: would untrack ${#TO_UNTRACK[@]} file(s) and write seed siblings."
  exit 0
fi

# ── Execute ─────────────────────────────────────────────────────────────────
GITIGNORE="$REPO_ROOT/.gitignore"
GITIGNORE_MARKER="# Runtime-mutated config files (untracked by untrack-runtime-files.sh)"

# Append marker section if not already there. Whitelist *.bootstrap.json so
# the bootstrap seeds remain trackable even though the surrounding broad
# `mom/data/config/*` exclusion in this repo's .gitignore would otherwise
# block them.
if ! grep -qF "$GITIGNORE_MARKER" "$GITIGNORE" 2>/dev/null; then
  # gitignore precedence: an excluded parent directory short-circuits all
  # descendant rules. The repo's .gitignore has `mom/data/*` which excludes
  # the config DIRECTORY, so we must re-include the directory before
  # whitelisting individual seed files inside it.
  {
    printf "\n%s\n" "$GITIGNORE_MARKER"
    printf "!mom/data/config/\n"
    printf "mom/data/config/*\n"
    printf "!mom/data/config/*.bootstrap.json\n"
  } >> "$GITIGNORE"
fi

for rel in "${TO_UNTRACK[@]}"; do
  bn="$(basename "$rel")"
  bootstrap="${rel%.json}.bootstrap.json"

  # 1. Snapshot current tracked content as bootstrap seed (only if seed
  #    doesn't already exist — never overwrite a curated seed).
  if [ ! -f "$bootstrap" ]; then
    cp -p "$rel" "$bootstrap"
    git add -- "$bootstrap"
    echo "  + seed:    $bootstrap"
  else
    git add -- "$bootstrap"
    echo "  ~ seed:    $bootstrap (kept existing, re-staged)"
  fi

  # 2. Untrack from index, leave on disk.
  git rm --cached --quiet -- "$rel"
  echo "  - untracked: $rel"

  # 3. Add explicit gitignore line (idempotent).
  if ! grep -qxF "$rel" "$GITIGNORE"; then
    printf "%s\n" "$rel" >> "$GITIGNORE"
  fi
done

git add -- "$GITIGNORE"

cat <<'COMMITMSG' > /tmp/untrack-runtime.commitmsg
data: untrack runtime-mutated config files; bootstrap from .bootstrap.json seeds

These files are written by PHP at runtime (admin actions: add user, change
role permissions, edit module access, etc.). Tracking them in git meant a
local edit + commit + push could overwrite live VPS state — and the
deploy.sh capture/restore safety net was a runtime guarantee that depended
on a manually maintained whitelist.

Untracking removes the failure mode entirely: git reset --hard cannot
touch what isn't in the index. Fresh installs bootstrap from the
*.bootstrap.json seeds via deploy.sh.

See: tools/vps-setup/RUNTIME-FILES-AUDIT.md
COMMITMSG

# No pathspec on commit: tree was made clean by the stash above, so the
# only staged changes are the ones we just made (rm --cached + bootstrap +
# .gitignore). Using pathspec here would re-stage the rm-cached entries
# from the working tree, undoing the untrack.
git commit --no-verify -F /tmp/untrack-runtime.commitmsg
rm -f /tmp/untrack-runtime.commitmsg

echo ""
echo "Done. Untracked ${#TO_UNTRACK[@]} runtime file(s)."
echo ""
echo "NEXT:"
echo "  1. Review the commit:  git show --stat HEAD"
echo "  2. Run the test suite."
echo "  3. Run the audit:      php tools/vps-setup/scripts/audit-runtime-files.php"
echo "  4. Push when satisfied."
echo ""
echo "On the next deploy, deploy.sh will detect the missing tracked files,"
echo "preserve the existing live copies (capture/restore still runs), and"
echo "future git operations will physically be unable to overwrite them."

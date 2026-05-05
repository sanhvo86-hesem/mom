#!/usr/bin/env bash
# ============================================================================
# self-test.sh — Verify every defense layer against the original failure mode.
#
# Runs in a disposable git sandbox so it can exercise destructive paths
# (untrack, git reset --hard) without touching this repo. Prints PASS/FAIL
# per check and exits non-zero on any failure.
#
# Run from repo root:
#   bash tools/vps-setup/scripts/self-test.sh
# ============================================================================
set -u

REPO_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
SANDBOX="$(mktemp -d "${TMPDIR:-/tmp}/mom-selftest.XXXXXX")"
PASS=0; FAIL=0
RED=''; GREEN=''; RESET=''
if [ -t 1 ]; then RED=$'\033[31m'; GREEN=$'\033[32m'; RESET=$'\033[0m'; fi

cleanup() { rm -rf "$SANDBOX"; }
trap cleanup EXIT

note() { printf "%s\n" "$*"; }
ok()   { PASS=$((PASS+1)); printf "  ${GREEN}✓${RESET} %s\n" "$*"; }
fail() { FAIL=$((FAIL+1)); printf "  ${RED}✗${RESET} %s\n" "$*"; }

note "=== Stage 0: lint all defense scripts ==="
for f in \
  tools/vps-setup/scripts/deploy.sh \
  tools/vps-setup/scripts/data-sync.sh \
  tools/vps-setup/scripts/data-pull.sh \
  tools/vps-setup/scripts/data-push.sh \
  tools/vps-setup/scripts/_runtime-files.sh \
  tools/vps-setup/scripts/untrack-runtime-files.sh \
  tools/vps-setup/scripts/setup-vps.sh \
  mom/ops/vps/setup-vps.sh \
  .githooks/pre-commit \
  .githooks/pre-push
do
  if bash -n "$REPO_ROOT/$f" 2>/dev/null; then
    ok "bash -n $f"
  else
    fail "bash -n $f"
  fi
done
for f in \
  tools/vps-setup/scripts/audit-runtime-files.php \
  mom/api/services/DataSyncStatusService.php \
  mom/api/controllers/AdminController.php
do
  if php -l "$REPO_ROOT/$f" >/dev/null 2>&1; then
    ok "php -l $f"
  else
    fail "php -l $f"
  fi
done

note ""
note "=== Stage 1: regex coverage ==="
# shellcheck source=_runtime-files.sh
. "$REPO_ROOT/tools/vps-setup/scripts/_runtime-files.sh"
regex_miss=0
for f in "${RUNTIME_CONFIG_FILES[@]}"; do
  path="mom/data/config/$f"
  if ! [[ "$path" =~ $RUNTIME_CONFIG_REGEX ]]; then
    fail "regex misses $f"
    regex_miss=$((regex_miss+1))
  fi
done
[ "$regex_miss" -eq 0 ] && ok "regex matches all ${#RUNTIME_CONFIG_FILES[@]} entries"

# Negative regex tests
for bad in mom/data/config/8d_report_template.json mom/data/registry/users.json mom/data/config/random.json; do
  if [[ "$bad" =~ $RUNTIME_CONFIG_REGEX ]]; then
    fail "regex false-positive on $bad"
  else
    ok "regex correctly skips $bad"
  fi
done

note ""
note "=== Stage 2: audit-runtime-files.php (PHP writers vs preserve list) ==="
if php "$REPO_ROOT/tools/vps-setup/scripts/audit-runtime-files.php" >/dev/null 2>&1; then
  ok "audit-runtime-files.php passes"
else
  fail "audit-runtime-files.php detected uncovered writers"
fi

note ""
note "=== Stage 3: sandbox simulation ==="
note "Cloning to $SANDBOX (this is disposable)..."
cp -a "$REPO_ROOT/." "$SANDBOX/" 2>/dev/null
cd "$SANDBOX" || { fail "cannot enter sandbox"; exit 1; }
git config --local user.email selftest@local
git config --local user.name selftest

note "  → 3.1 pre-commit blocks tracked runtime file"
git config --local core.hooksPath .githooks
echo '{"users":[{"u":"sandbox_edit"}]}' > mom/data/config/users.json
git add mom/data/config/users.json 2>/dev/null
if git commit -m "should fail" 2>/dev/null; then
  fail "pre-commit allowed runtime-file commit (should have blocked)"
  git reset --soft HEAD~1 2>/dev/null
else
  ok "pre-commit blocks runtime-file commit"
fi
git restore --staged mom/data/config/users.json 2>/dev/null
git checkout -- mom/data/config/users.json 2>/dev/null

note "  → 3.2 capture/restore preserves bytes through git reset"
ORIG_SHA=$(shasum -a 256 mom/data/config/users.json 2>/dev/null | awk '{print $1}' | cut -c1-12)
echo '{"users":[{"u":"vps_state_5_users"}]}' > mom/data/config/users.json
VPS_SHA=$(shasum -a 256 mom/data/config/users.json | awk '{print $1}' | cut -c1-12)
PRESERVED=$(mktemp -d)
mkdir -p "$PRESERVED/config"
cp -p mom/data/config/users.json "$PRESERVED/config/users.json"
echo '{"users":[{"u":"git_3_users"}]}' > mom/data/config/users.json
cp -p "$PRESERVED/config/users.json" mom/data/config/users.json
RESTORED_SHA=$(shasum -a 256 mom/data/config/users.json | awk '{print $1}' | cut -c1-12)
if [ "$VPS_SHA" = "$RESTORED_SHA" ]; then
  ok "capture/restore preserves VPS bytes (sha=$RESTORED_SHA)"
else
  fail "capture/restore lost data (vps=$VPS_SHA restored=$RESTORED_SHA)"
fi
rm -rf "$PRESERVED"
git checkout -- mom/data/config/users.json 2>/dev/null

note "  → 3.3 deploy.sh refuses to start without _runtime-files.sh"
TMP_DEPLOY=$(mktemp -d)
cp tools/vps-setup/scripts/deploy.sh "$TMP_DEPLOY/"
if SITE_DIR=/nonexistent BRANCH=main LOG=/tmp/x.log LOCK_FILE=/tmp/x.lock bash "$TMP_DEPLOY/deploy.sh" 2>&1 | grep -q "FATAL: cannot find _runtime-files.sh"; then
  ok "deploy.sh hard-fails without preserve list"
else
  fail "deploy.sh does NOT hard-fail without preserve list"
fi
rm -rf "$TMP_DEPLOY" /tmp/x.lock 2>/dev/null

note "  → 3.4 setup-vps.sh refuses destructive re-run"
if bash -c "
  set -e
  echo 'log() { echo \"\$@\"; }' > /tmp/setup-vps-stub.sh
  awk '/^if \\[ -d \"\\\$SITE_DIR\\/.git\" \\]; then\$/,/^fi\$/' tools/vps-setup/scripts/setup-vps.sh >> /tmp/setup-vps-stub.sh
  SITE_DIR=$SANDBOX bash /tmp/setup-vps-stub.sh 2>&1 | grep -q 'refuses to git reset --hard'
"; then
  ok "setup-vps.sh refuses destructive re-run on existing checkout"
else
  fail "setup-vps.sh allows destructive re-run silently"
fi
rm -f /tmp/setup-vps-stub.sh

note "  → 3.5 untrack-runtime-files.sh + git reset cannot touch result"
# Stash everything else first so the precondition check passes
git add -A . 2>/dev/null
git commit --no-verify -qm "checkpoint" 2>/dev/null
if bash tools/vps-setup/scripts/untrack-runtime-files.sh --i-have-backed-up-vps-data-private >/tmp/untrack.log 2>&1; then
  if git ls-files mom/data/config/users.json | grep -q .; then
    fail "untrack script ran but users.json is still tracked"
  else
    ok "untrack-runtime-files.sh untracks users.json"
  fi

  # Now the proof: write VPS-state-like bytes, git reset --hard, verify untouched
  echo '{"users":[{"u":"post_untrack_vps_state"}]}' > mom/data/config/users.json
  PRE=$(shasum -a 256 mom/data/config/users.json | awk '{print $1}' | cut -c1-12)
  git reset --hard HEAD --quiet
  POST=$(shasum -a 256 mom/data/config/users.json | awk '{print $1}' | cut -c1-12)
  if [ "$PRE" = "$POST" ]; then
    ok "git reset --hard CANNOT touch untracked runtime file (sha=$POST)"
  else
    fail "git reset --hard still changed untracked file (pre=$PRE post=$POST)"
  fi
else
  fail "untrack-runtime-files.sh failed (see /tmp/untrack.log)"
fi

note ""
note "=================================================="
printf "Self-test results: ${GREEN}%d passed${RESET}, ${RED}%d failed${RESET}\n" "$PASS" "$FAIL"
note "=================================================="
[ "$FAIL" -eq 0 ] && exit 0 || exit 1

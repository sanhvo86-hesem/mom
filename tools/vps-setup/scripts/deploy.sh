#!/bin/bash
# =============================================================================
# HESEM MOM Portal — Production Deploy Script (single source of truth)
#
# Replaces the legacy .cpanel.yml pipeline. The portal does not write to the
# repo working tree; deployments come either from GitHub Actions
# (.github/workflows/deploy.yml) calling this script over SSH, or from an
# operator running it manually as the deploy user.
#
# Usage:
#   sudo bash /var/www/eqms.hesemeng.com/tools/vps-setup/scripts/deploy.sh
#
# Environment overrides:
#   SITE_DIR, BRANCH, DEPLOY_USER, WEB_USER, WEB_GROUP, RUN_DB_MIGRATIONS,
#   RUN_DB_SCHEMA_SMOKE, SKIP_HEALTHCHECK, SKIP_ROLLBACK
# =============================================================================
set -euo pipefail

# ── Configuration ─────────────────────────────────────────────────────────
SITE_DIR="${SITE_DIR:-/var/www/eqms.hesemeng.com}"
PRIVATE_DATA="${PRIVATE_DATA:-/var/www/data-private}"
BRANCH="${BRANCH:-main}"
LOG="${LOG:-/var/log/qms-deploy.log}"
DEPLOY_USER="${DEPLOY_USER:-deploy}"
WEB_USER="${WEB_USER:-}"
WEB_GROUP="${WEB_GROUP:-}"
RUN_DB_MIGRATIONS="${RUN_DB_MIGRATIONS:-1}"
RUN_DB_SCHEMA_SMOKE="${RUN_DB_SCHEMA_SMOKE:-1}"
SKIP_HEALTHCHECK="${SKIP_HEALTHCHECK:-0}"
SKIP_ROLLBACK="${SKIP_ROLLBACK:-0}"
LOCK_FILE="${LOCK_FILE:-/var/run/qms-deploy.lock}"
ROLLBACK_TAG_PREFIX="deploy-rollback"
DB_SCHEMA_MAY_HAVE_CHANGED="0"

# ── Helpers ───────────────────────────────────────────────────────────────
log() { echo "$(date '+%Y-%m-%d %H:%M:%S') [$1] $2" | tee -a "$LOG"; }
die() { log "ERROR" "$1"; exit 1; }

# Acquire a non-blocking advisory lock so two deploys cannot interleave
# (GitHub Actions concurrency + manual deploy is a real failure mode).
acquire_lock() {
    exec 9>"$LOCK_FILE" || die "Cannot open lock file $LOCK_FILE"
    if ! flock -n 9; then
        die "Another deploy is already running (lock $LOCK_FILE held). Aborting."
    fi
    log "INFO" "Deploy lock acquired ($LOCK_FILE)"
}

detect_php_fpm_identity() {
    local conf user group
    for conf in /etc/php/*/fpm/pool.d/mom.conf /etc/php/*/fpm/pool.d/*.conf; do
        [ -f "$conf" ] || continue
        user="$(sed -n 's/^[[:space:]]*user[[:space:]]*=[[:space:]]*//p' "$conf" | head -n 1 || true)"
        group="$(sed -n 's/^[[:space:]]*group[[:space:]]*=[[:space:]]*//p' "$conf" | head -n 1 || true)"
        if [ -n "$user" ] && [ -n "$group" ]; then
            WEB_USER="${WEB_USER:-$user}"
            WEB_GROUP="${WEB_GROUP:-$group}"
            return
        fi
    done

    WEB_USER="${WEB_USER:-www-data}"
    WEB_GROUP="${WEB_GROUP:-www-data}"
}

restore_git_executable_bits() {
    if [ ! -d "$SITE_DIR/.git" ]; then
        return
    fi

    git -C "$SITE_DIR" ls-files -s \
        | awk '$1 == "100755" {print $4}' \
        | while IFS= read -r tracked; do
            [ -f "$SITE_DIR/$tracked" ] && chmod 755 "$SITE_DIR/$tracked"
        done
}

sanitize_php_fpm_pool_runtime_settings() {
    local conf
    for conf in /etc/php/*/fpm/pool.d/mom.conf; do
        [ -f "$conf" ] || continue
        if grep -Eq '^[[:space:]]*php_(admin_)?value\[opcache\.enable\][[:space:]]*=' "$conf"; then
            sed -i.bak -E '/^[[:space:]]*php_(admin_)?value\[opcache\.enable\][[:space:]]*=/d' "$conf"
            log "INFO" "Removed pool-level opcache.enable from $conf"
        fi
    done
}

# Tag the current HEAD before we change anything so a healthcheck failure can
# roll back to a known-good revision. Tags are local-only (not pushed).
ROLLBACK_TAG=""
create_rollback_tag() {
    local current_head
    current_head="$(git -C "$SITE_DIR" rev-parse HEAD 2>/dev/null || echo '')"
    [ -n "$current_head" ] || return 0
    ROLLBACK_TAG="${ROLLBACK_TAG_PREFIX}-$(date +%Y%m%d-%H%M%S)"
    if git -C "$SITE_DIR" tag "$ROLLBACK_TAG" "$current_head" 2>>"$LOG"; then
        log "INFO" "Rollback tag created: $ROLLBACK_TAG -> $(echo "$current_head" | head -c 8)"
    else
        log "WARN" "Could not create rollback tag (continuing without it)"
        ROLLBACK_TAG=""
    fi
}

# Prune old rollback tags so we keep only the last 10.
prune_rollback_tags() {
    git -C "$SITE_DIR" tag --list "${ROLLBACK_TAG_PREFIX}-*" \
        | sort \
        | head -n -10 \
        | while IFS= read -r old_tag; do
            [ -n "$old_tag" ] || continue
            git -C "$SITE_DIR" tag -d "$old_tag" >/dev/null 2>&1 \
                && log "INFO" "Pruned old rollback tag: $old_tag" || true
        done
}

# Roll back to the pre-deploy tag if the healthcheck fails.
rollback_to_tag() {
    if [ "$DB_SCHEMA_MAY_HAVE_CHANGED" = "1" ]; then
        log "ERROR" "Auto code rollback suppressed because DB migrations already ran; schema rollback is not automatic."
        log "WARN" "Leave the current code in place, inspect the migration/healthcheck failure, and only redeploy after fixing origin/$BRANCH."
        return
    fi
    if [ "$SKIP_ROLLBACK" = "1" ]; then
        log "WARN" "SKIP_ROLLBACK=1 — leaving the failed deploy in place"
        return
    fi
    if [ -z "$ROLLBACK_TAG" ]; then
        log "ERROR" "No rollback tag available — cannot auto-recover"
        return
    fi
    log "WARN" "Rolling back to $ROLLBACK_TAG"
    git -C "$SITE_DIR" reset --hard "$ROLLBACK_TAG" --quiet || {
        log "ERROR" "Rollback git reset failed"
        return
    }
    systemctl reload php8.5-fpm 2>/dev/null && log "INFO" "PHP-FPM reloaded after rollback" || true
    log "WARN" "Rollback complete. Investigate the failed deploy before retrying."
}

run_composer_install() {
    log "INFO" "Refreshing production Composer dependencies..."
    if COMPOSER_ALLOW_SUPERUSER=1 composer install \
        --working-dir="$SITE_DIR/mom" \
        --no-dev \
        --optimize-autoloader \
        --no-interaction \
        --prefer-dist >>"$LOG" 2>&1; then
        log "INFO" "Composer dependencies refreshed"
        return
    fi

    log "ERROR" "Composer install failed — attempting rollback"
    rollback_to_tag
    die "Deploy aborted: composer install failed (see $LOG for details)"
}

acquire_lock

log "INFO" "═══ Deploy started (branch=$BRANCH, site=$SITE_DIR) ═══"

# ── Pre-flight checks ────────────────────────────────────────────────────
[ -d "$SITE_DIR/.git" ] || die "$SITE_DIR is not a git repository"
command -v php8.5 >/dev/null 2>&1 || die "php8.5 not found"
command -v composer >/dev/null 2>&1 || die "composer not found (required to refresh vendor on deploy)"
command -v flock >/dev/null 2>&1 || die "flock not found (required for safe concurrent deploys)"
detect_php_fpm_identity
if [ "$RUN_DB_MIGRATIONS" = "1" ] && [ "$SKIP_ROLLBACK" != "1" ]; then
    log "WARN" "DB migrations are enabled. If healthcheck fails after migrations, auto code rollback will be suppressed because schema rollback is not automatic."
fi

# ── Capture rollback point BEFORE any change ─────────────────────────────
cd "$SITE_DIR"
create_rollback_tag

# ── Pull latest code ─────────────────────────────────────────────────────
log "INFO" "Fetching origin/$BRANCH..."
git fetch origin "$BRANCH" --quiet
BEFORE=$(git rev-parse HEAD)
git reset --hard "origin/$BRANCH" --quiet
AFTER=$(git rev-parse HEAD)

if [ "$BEFORE" = "$AFTER" ]; then
    log "INFO" "Already up-to-date at $(echo "$AFTER" | head -c 8)"
else
    log "INFO" "Updated: $(echo "$BEFORE" | head -c 8) → $(echo "$AFTER" | head -c 8)"
fi

run_composer_install

# ── Copy private config that lives outside the repo ──────────────────────
if [ -d "$PRIVATE_DATA/config" ]; then
    log "INFO" "Copying private config..."
    cp -n "$PRIVATE_DATA/config/"*.json \
        "$SITE_DIR/mom/data/config/" 2>/dev/null || true
fi

# ── Fix permissions ──────────────────────────────────────────────────────
log "INFO" "Setting permissions..."
chown -R "$DEPLOY_USER:$WEB_GROUP" "$SITE_DIR"
find "$SITE_DIR" -type d -exec chmod 755 {} +
find "$SITE_DIR" -type f -exec chmod 644 {} +
restore_git_executable_bits

# .git/ stays owned by $DEPLOY_USER:$WEB_GROUP with default 755/644 — the
# portal status panel only runs `git ls-remote` (network read-only, never
# touches .git/) so PHP-FPM does not need write access to the repo metadata.
# Anyone widening these bits to g+w opens an RCE-to-persistence primitive
# via .git/hooks/, so resist that even if a future feature seems to require
# it. Use a separate read-only working copy if you ever need it.

# Writable directories (PHP-FPM writes here through the configured pool user/group)
for dir in uploads online-forms allocations form-workflow/state; do
    target="$SITE_DIR/mom/data/$dir"
    if [ -d "$target" ]; then
        find "$target" -type d -exec chmod 775 {} +
        find "$target" -type f -exec chmod 664 {} +
        chown -R "$DEPLOY_USER:$WEB_GROUP" "$target"
    fi
done

# PHP-owned runtime state must stay owned by the PHP-FPM pool user. Session
# files fail hard when created by another UID, and login rate-limit counters
# are written during authentication.
# File cache is also PHP-owned runtime state. Redis is optional in the current
# deployment, so file fallback must be writable after every release reset.
for runtime_dir in sessions ratelimit cache; do
    runtime_path="$SITE_DIR/mom/data/$runtime_dir"
    mkdir -p "$runtime_path"
    chown -R "$WEB_USER:$WEB_GROUP" "$runtime_path"
    find "$runtime_path" -type d -exec chmod 2770 {} +
    find "$runtime_path" -type f -exec chmod 660 {} +
done

# Ensure log files are writable
for logfile in php_error.log audit.log db_queries.log; do
    target="$SITE_DIR/mom/data/$logfile"
    touch "$target"
    chown "$WEB_USER:$WEB_GROUP" "$target"
    chmod 664 "$target"
done

# Portal scan cache is rewritten by authenticated admin reads. Keep it as a
# pre-created PHP-writable runtime file so the repository root stays locked
# down without breaking the admin file explorer.
scan_cache="$SITE_DIR/mom/data/scan_cache.json"
touch "$scan_cache"
chown "$WEB_USER:$WEB_GROUP" "$scan_cache"
chmod 664 "$scan_cache"
restore_git_executable_bits

# ── Run governed database migrations before PHP-FPM serves the new release ──
if [ "$RUN_DB_MIGRATIONS" = "1" ]; then
    DB_SCHEMA_MAY_HAVE_CHANGED="1"
    log "INFO" "Running governed DB migrations and schema smoke..."
    RUN_DB_MIGRATIONS="$RUN_DB_MIGRATIONS" \
    RUN_DB_SCHEMA_SMOKE="$RUN_DB_SCHEMA_SMOKE" \
        bash "$SITE_DIR/mom/ops/vps/run-db-migrations.sh"
else
    log "WARN" "Skipping DB migrations because RUN_DB_MIGRATIONS=$RUN_DB_MIGRATIONS"
fi

# ── Clear OPcache ────────────────────────────────────────────────────────
log "INFO" "Clearing OPcache..."
sanitize_php_fpm_pool_runtime_settings
if systemctl reload php8.5-fpm 2>/dev/null; then
    log "INFO" "PHP-FPM reloaded"
else
    die "PHP-FPM reload failed; aborting before healthcheck because runtime env may be stale"
fi

# ── Post-deploy healthcheck (rolls back on failure) ──────────────────────
HEALTHCHECK_SCRIPT="$SITE_DIR/mom/scripts/postdeploy_healthcheck.php"
if [ "$SKIP_HEALTHCHECK" = "1" ]; then
    log "WARN" "SKIP_HEALTHCHECK=1 — skipping post-deploy verification"
elif [ -f "$HEALTHCHECK_SCRIPT" ]; then
    log "INFO" "Running post-deploy healthcheck..."
    if php8.5 "$HEALTHCHECK_SCRIPT" >>"$LOG" 2>&1; then
        log "INFO" "Healthcheck passed"
    else
        log "ERROR" "Healthcheck FAILED — initiating rollback"
        rollback_to_tag
        die "Deploy aborted: healthcheck failed (see $LOG for details)"
    fi
else
    log "WARN" "No healthcheck script at $HEALTHCHECK_SCRIPT — skipping"
fi

prune_rollback_tags

# ── Publish deploy metadata for portal auto hard-reload ───────────────────
# sw-build-tag.js is imported by mom/sw.js. It must land BEFORE build-info.json
# so the frontend only sees the new sha after the SW update signal is already
# available. build-info.json is therefore the publish barrier.
BUILD_INFO="$SITE_DIR/mom/build-info.json"
SHORT_SHA="$(git -C "$SITE_DIR" rev-parse --short HEAD)"
FULL_SHA="$(git -C "$SITE_DIR" rev-parse HEAD)"
DEPLOYED_AT_ISO="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
BUILD_INFO_TMP="${BUILD_INFO}.tmp.$$"
SW_BUILD_TAG_FILE="$SITE_DIR/mom/sw-build-tag.js"
SW_BUILD_TAG_TMP="${SW_BUILD_TAG_FILE}.tmp.$$"
# Belt-and-suspenders cleanup if the script dies between cat and mv.
trap 'rm -f "$BUILD_INFO_TMP" "$SW_BUILD_TAG_TMP" 2>/dev/null || true' EXIT

log "INFO" "Publishing sw-build-tag.js (sha=$SHORT_SHA)..."
cat > "$SW_BUILD_TAG_TMP" <<JS
self.__SW_BUILD_TAG = '$FULL_SHA';
JS
chown "$DEPLOY_USER:$WEB_GROUP" "$SW_BUILD_TAG_TMP"
chmod 644 "$SW_BUILD_TAG_TMP"
mv -f "$SW_BUILD_TAG_TMP" "$SW_BUILD_TAG_FILE"

log "INFO" "Publishing build-info.json (sha=$SHORT_SHA)..."
# Write to a tempfile then mv into place: same-fs rename is atomic on POSIX,
# so a concurrent fetch from 00-version-check.js never observes a partial
# write (otherwise it would JSON.parse-fail and silently retry on next poll).
cat > "$BUILD_INFO_TMP" <<JSON
{
  "version":     "$SHORT_SHA",
  "sha":         "$FULL_SHA",
  "branch":      "$BRANCH",
  "deployed_at": "$DEPLOYED_AT_ISO",
  "deployed_by": "deploy.sh"
}
JSON
chown "$DEPLOY_USER:$WEB_GROUP" "$BUILD_INFO_TMP"
chmod 644 "$BUILD_INFO_TMP"
mv -f "$BUILD_INFO_TMP" "$BUILD_INFO"

log "INFO" "═══ Deploy completed ═══"
echo ""
echo "Current revision: $SHORT_SHA"
[ -n "$ROLLBACK_TAG" ] && echo "Rollback tag:     $ROLLBACK_TAG"
echo "Deploy log:       $LOG"
echo "Build info:       $BUILD_INFO"

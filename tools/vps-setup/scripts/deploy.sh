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
DCC_LOCALE_PREWARM_ON_DEPLOY="${DCC_LOCALE_PREWARM_ON_DEPLOY:-1}"
DCC_LOCALE_PREWARM_WORKERS="${DCC_LOCALE_PREWARM_WORKERS:-4}"
DCC_LOCALE_PREWARM_MAX_QUEUE="${DCC_LOCALE_PREWARM_MAX_QUEUE:-1000}"
PRESERVE_RUNTIME_MUTATIONS="${PRESERVE_RUNTIME_MUTATIONS:-1}"
PRESERVE_RUNTIME_DOCS="${PRESERVE_RUNTIME_DOCS:-1}"
LOCK_FILE="${LOCK_FILE:-/var/run/qms-deploy.lock}"
ROLLBACK_TAG_PREFIX="deploy-rollback"
DB_SCHEMA_MAY_HAVE_CHANGED="0"
PRESERVED_RUNTIME_DIR=""

# Single source of truth for runtime-mutated config file basenames.
# Sourced from the same file data-sync.sh + audit-runtime-files.php read, so
# the three callers can never drift. If the file is missing, REFUSE to deploy
# rather than silently fall back to a stale list (that's the failure mode
# this whole subsystem exists to prevent).
RUNTIME_FILES_LIST="${SITE_DIR}/tools/vps-setup/scripts/_runtime-files.sh"
if [ ! -f "$RUNTIME_FILES_LIST" ]; then
    # Pre-rollback safety: SITE_DIR may not yet contain the new tree if the
    # very first deploy hasn't completed. Fall back to the script-relative
    # path so the bootstrap deploy can still run.
    RUNTIME_FILES_LIST="$(cd "$(dirname "$0")" && pwd)/_runtime-files.sh"
fi
if [ ! -f "$RUNTIME_FILES_LIST" ]; then
    echo "FATAL: cannot find _runtime-files.sh — refusing to deploy without preserve list" >&2
    exit 1
fi
# shellcheck source=_runtime-files.sh
. "$RUNTIME_FILES_LIST"
if [ "${#RUNTIME_CONFIG_FILES[@]}" -eq 0 ]; then
    echo "FATAL: RUNTIME_CONFIG_FILES is empty after sourcing $RUNTIME_FILES_LIST" >&2
    exit 1
fi

RUNTIME_DOC_DIRS=(
    mom/docs/system
    mom/docs/operations
    mom/docs/forms
    mom/docs/training
    mom/docs/glossary
    archive
)

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

capture_runtime_mutations() {
    if [ "$PRESERVE_RUNTIME_MUTATIONS" != "1" ]; then
        log "INFO" "Runtime mutation preservation disabled (PRESERVE_RUNTIME_MUTATIONS=$PRESERVE_RUNTIME_MUTATIONS)"
        return
    fi

    PRESERVED_RUNTIME_DIR="$(mktemp -d "${TMPDIR:-/tmp}/qms-runtime-preserve.XXXXXX")" \
        || die "Cannot create runtime preservation directory"
    log "INFO" "Capturing runtime-managed config/docs before git reset ($PRESERVED_RUNTIME_DIR)"

    mkdir -p "$PRESERVED_RUNTIME_DIR/config"
    mkdir -p "$PRIVATE_DATA/config" 2>/dev/null || true

    local name site_file private_file rel_dir
    for name in "${RUNTIME_CONFIG_FILES[@]}"; do
        site_file="$SITE_DIR/mom/data/config/$name"
        private_file="$PRIVATE_DATA/config/$name"
        # Ensure target subdirectories exist for names that contain a slash
        # (e.g. "deploy/program.json"). Without this, cp fails because the
        # intermediate dirs under both the preservation tmp dir and the
        # private mirror were never created.
        rel_dir="$(dirname "$name")"
        if [ "$rel_dir" != "." ]; then
            mkdir -p "$PRESERVED_RUNTIME_DIR/config/$rel_dir"
            mkdir -p "$PRIVATE_DATA/config/$rel_dir" 2>/dev/null || true
        fi
        if [ -f "$site_file" ]; then
            cp -p "$site_file" "$PRESERVED_RUNTIME_DIR/config/$name" \
                || die "Cannot preserve runtime config $site_file"
            cp -p "$site_file" "$private_file" 2>/dev/null \
                || log "WARN" "Could not mirror $name to $PRIVATE_DATA/config"
        elif [ -f "$private_file" ]; then
            cp -p "$private_file" "$PRESERVED_RUNTIME_DIR/config/$name" \
                || die "Cannot preserve private runtime config $private_file"
        fi
    done

    if [ "$PRESERVE_RUNTIME_DOCS" != "1" ]; then
        log "INFO" "Runtime document preservation disabled (PRESERVE_RUNTIME_DOCS=$PRESERVE_RUNTIME_DOCS)"
        return
    fi

    command -v rsync >/dev/null 2>&1 || die "rsync not found (required for preserving runtime document trees)"
    local rel src dest
    for rel in "${RUNTIME_DOC_DIRS[@]}"; do
        src="$SITE_DIR/$rel"
        [ -d "$src" ] || continue
        dest="$PRESERVED_RUNTIME_DIR/$rel"
        mkdir -p "$dest"
        rsync -a --delete "$src/" "$dest/" \
            || die "Cannot preserve runtime document tree $src"
    done
}

restore_runtime_mutations() {
    if [ "$PRESERVE_RUNTIME_MUTATIONS" != "1" ] || [ -z "$PRESERVED_RUNTIME_DIR" ] || [ ! -d "$PRESERVED_RUNTIME_DIR" ]; then
        return
    fi

    log "INFO" "Restoring runtime-managed config/docs after git reset"
    local restored_count=0
    if [ -d "$PRESERVED_RUNTIME_DIR/config" ]; then
        mkdir -p "$SITE_DIR/mom/data/config"
        local name preserved live preserved_hash live_hash live_dir
        for name in "${RUNTIME_CONFIG_FILES[@]}"; do
            preserved="$PRESERVED_RUNTIME_DIR/config/$name"
            live="$SITE_DIR/mom/data/config/$name"
            [ -f "$preserved" ] || continue
            # Ensure live destination subdir exists for nested names
            # (e.g. "deploy/program.json"). Without this, cp fails on a
            # fresh checkout where the subdir was never created.
            live_dir="$(dirname "$live")"
            mkdir -p "$live_dir"
            # Subdir needs to be group-writable so PHP-FPM (www-data) can
            # create new files alongside preserved ones. Set every pass —
            # idempotent and corrects perms if a previous deploy left 755.
            chmod 775 "$live_dir" 2>/dev/null || true
            cp -p "$preserved" "$live" \
                || die "FATAL: cannot restore $name to $live — runtime data may be lost. Snapshot at $PRESERVED_RUNTIME_DIR is preserved (do NOT clean it up)."
            # Restored file must remain group-writable. cp -p preserves the
            # source perms, but if the captured file ever had 644 (e.g. via
            # bootstrap-from-seed on a previous deploy), we'd carry that
            # forever and PHP-FPM saves would fail with "Permission denied".
            chmod 664 "$live" 2>/dev/null || true
            # Verify byte-for-byte that the restore took. A silent cp success
            # with a wrong destination (e.g. selinux relabel) would otherwise
            # leave VPS state corrupted with no signal.
            preserved_hash="$(sha256sum "$preserved" | awk '{print $1}')"
            live_hash="$(sha256sum "$live" | awk '{print $1}')"
            if [ "$preserved_hash" != "$live_hash" ]; then
                die "FATAL: post-restore checksum mismatch for $name (preserved=$preserved_hash live=$live_hash). $PRESERVED_RUNTIME_DIR is preserved for forensic recovery."
            fi
            restored_count=$((restored_count + 1))
        done
        log "INFO" "Restored $restored_count runtime config file(s) with sha256 verification"
    fi

    if [ "$PRESERVE_RUNTIME_DOCS" = "1" ]; then
        local rel src dest
        for rel in "${RUNTIME_DOC_DIRS[@]}"; do
            src="$PRESERVED_RUNTIME_DIR/$rel"
            [ -d "$src" ] || continue
            dest="$SITE_DIR/$rel"
            mkdir -p "$dest"
            rsync -a --delete "$src/" "$dest/" \
                || die "Cannot restore runtime document tree $dest"
        done
    fi

    # Snapshot evidence to /var/www/data-private/.deploy-snapshots/ BEFORE
    # cleaning the temp dir. 30-deep retention. If a future user complains
    # "I lost X after deploy", an operator can grep these for the missing
    # bytes even after the temp dir is gone.
    local evidence_root="$PRIVATE_DATA/.deploy-snapshots"
    if mkdir -p "$evidence_root" 2>/dev/null; then
        local snap_id
        snap_id="$(date -u +%Y%m%dT%H%M%SZ)"
        if cp -a "$PRESERVED_RUNTIME_DIR" "$evidence_root/$snap_id" 2>/dev/null; then
            log "INFO" "Deploy preservation snapshot kept at $evidence_root/$snap_id"
            # Keep last 30 (portable: BSD head doesn't accept -n -N).
            ls -1d "$evidence_root"/* 2>/dev/null | sort | \
                awk 'BEGIN{keep=30}{a[NR]=$0}END{for(i=1;i<=NR-keep;i++)print a[i]}' \
                | while IFS= read -r old; do rm -rf "$old"; done
        fi
    fi

    rm -rf "$PRESERVED_RUNTIME_DIR"
    PRESERVED_RUNTIME_DIR=""
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
        | awk 'BEGIN{keep=10}{a[NR]=$0}END{for(i=1;i<=NR-keep;i++)print a[i]}' \
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
    capture_runtime_mutations
    git -C "$SITE_DIR" reset --hard "$ROLLBACK_TAG" --quiet || {
        log "ERROR" "Rollback git reset failed"
        return
    }
    restore_runtime_mutations
    systemctl reload php8.5-fpm 2>/dev/null && log "INFO" "PHP-FPM reloaded after rollback" || true
    log "WARN" "Rollback complete. Investigate the failed deploy before retrying."
}

run_composer_install() {
    local lock_file="$SITE_DIR/mom/composer.lock"
    local hash_cache="$SITE_DIR/mom/vendor/.composer-lock-hash"
    local current_hash=""

    if [ -f "$lock_file" ]; then
        current_hash="$(sha256sum "$lock_file" | awk '{print $1}')"
    fi

    if [ -n "$current_hash" ] \
        && [ -f "$hash_cache" ] \
        && [ "$(cat "$hash_cache" 2>/dev/null)" = "$current_hash" ] \
        && [ -d "$SITE_DIR/mom/vendor" ]; then
        log "INFO" "composer.lock unchanged — skipping composer install"
        # Still regenerate the optimised classmap so NEW PHP files added to
        # existing PSR-4 namespaces become resolvable. Without this, classes
        # added in feature branches that don't touch composer.lock are missing
        # from autoload_classmap and PHP-FPM emits "Class not found" errors
        # until composer dump-autoload runs.
        log "INFO" "Refreshing autoload classmap (composer dump-autoload -o)..."
        COMPOSER_ALLOW_SUPERUSER=1 composer dump-autoload \
            --working-dir="$SITE_DIR/mom" \
            --no-dev \
            --optimize \
            --no-interaction >>"$LOG" 2>&1 \
            || log "WARN" "composer dump-autoload returned non-zero (continuing)"
        return
    fi

    log "INFO" "Refreshing production Composer dependencies..."
    if COMPOSER_ALLOW_SUPERUSER=1 composer install \
        --working-dir="$SITE_DIR/mom" \
        --no-dev \
        --optimize-autoloader \
        --no-interaction \
        --prefer-dist >>"$LOG" 2>&1; then
        log "INFO" "Composer dependencies refreshed"
        [ -n "$current_hash" ] && echo "$current_hash" > "$hash_cache" || true
        return
    fi

    log "ERROR" "Composer install failed — attempting rollback"
    rollback_to_tag
    die "Deploy aborted: composer install failed (see $LOG for details)"
}

stop_dcc_locale_prewarm_for_deploy() {
    if command -v systemctl >/dev/null 2>&1 && systemctl is-active --quiet dcc-locale-prewarm.service; then
        log "INFO" "Stopping active DCC locale prewarm before code reset..."
        systemctl stop dcc-locale-prewarm.service \
            && log "INFO" "DCC locale prewarm stopped for deploy" \
            || log "WARN" "Could not stop active dcc-locale-prewarm.service before deploy"
    fi
}

run_dcc_locale_prewarm_kick() {
    if [ "$DCC_LOCALE_PREWARM_ON_DEPLOY" != "1" ]; then
        log "INFO" "DCC English locale prewarm skipped (DCC_LOCALE_PREWARM_ON_DEPLOY=$DCC_LOCALE_PREWARM_ON_DEPLOY)"
        return
    fi

    local script="$SITE_DIR/tools/scripts/translation/dcc_locale_backfill.php"
    local fpm_conf="/etc/php/8.5/fpm/pool.d/mom.conf"
    local service_src="$SITE_DIR/tools/vps-setup/systemd/dcc-locale-prewarm.service"
    local timer_src="$SITE_DIR/tools/vps-setup/systemd/dcc-locale-prewarm.timer"
    local workers="$DCC_LOCALE_PREWARM_WORKERS"
    local max_queue="$DCC_LOCALE_PREWARM_MAX_QUEUE"

    [[ "$workers" =~ ^[0-9]+$ ]] || workers="4"
    [[ "$max_queue" =~ ^[0-9]+$ ]] || max_queue="1000"
    [ "$workers" -ge 1 ] || workers="1"
    [ "$workers" -le 4 ] || workers="4"
    [ "$max_queue" -ge 1 ] || max_queue="1000"

    if [ ! -f "$script" ]; then
        log "WARN" "DCC locale prewarm script not found: $script"
        return
    fi
    if [ ! -f "$fpm_conf" ]; then
        log "WARN" "DCC locale prewarm skipped; FPM env file not found: $fpm_conf"
        return
    fi
    if ! grep -Eq '^[[:space:]]*env\[DCC_TRANSLATION_DRIVER\][[:space:]]*=[[:space:]]*command[[:space:]]*$' "$fpm_conf" \
        || ! grep -Eq '^[[:space:]]*env\[DCC_TRANSLATION_COMMAND\][[:space:]]*=' "$fpm_conf"; then
        log "WARN" "DCC locale prewarm skipped; internal command provider is not configured in $fpm_conf"
        return
    fi

    if command -v systemctl >/dev/null 2>&1 && [ -f "$service_src" ]; then
        log "INFO" "Installing DCC locale prewarm systemd unit from deployed source..."
        if sed "s#/var/www/eqms.hesemeng.com#$SITE_DIR#g; s#/etc/php/8.5/fpm/pool.d/mom.conf#$fpm_conf#g" \
            "$service_src" > /etc/systemd/system/dcc-locale-prewarm.service; then
            chmod 0644 /etc/systemd/system/dcc-locale-prewarm.service
            if [ -f "$timer_src" ]; then
                install -m 0644 "$timer_src" /etc/systemd/system/dcc-locale-prewarm.timer
            fi
            systemctl daemon-reload || true
            if [ -f "$timer_src" ]; then
                systemctl enable --now dcc-locale-prewarm.timer >/dev/null 2>&1 || true
            fi
        else
            log "WARN" "Could not install dcc-locale-prewarm.service from $service_src"
        fi
    fi

    # NOTE: dcc_locale_backfill.php reads translation_runtime_setting
    # auto_translate_enabled and exits immediately (status 0) when OFF. So
    # starting the service here is a cheap no-op when the admin toggle is OFF;
    # we still kick it so the service unit gets exercised and the timer stays
    # in a healthy state.
    log "INFO" "Starting DCC English locale prewarm (workers=$workers, max_queue=$max_queue) — script self-skips if admin toggle is OFF"
    if command -v systemctl >/dev/null 2>&1 && [ -f "/etc/systemd/system/dcc-locale-prewarm.service" ]; then
        systemctl start --no-block dcc-locale-prewarm.service \
            && log "INFO" "DCC locale prewarm service started asynchronously" \
            || log "WARN" "Could not start dcc-locale-prewarm.service"
        return
    fi

    if command -v runuser >/dev/null 2>&1; then
        runuser -u "$WEB_USER" -- env \
            DCC_TRANSLATION_WORKER_SLOTS="$workers" \
            DCC_TRANSLATION_COMMAND_TIMEOUT_SECONDS=1800 \
            DCC_TRANSLATION_JOB_MAX_ATTEMPTS=3 \
            php8.5 "$script" \
                --fpm-env="$fpm_conf" \
                --only-missing-job \
                --no-spawn-per-job \
                --start-workers="$workers" \
                --wait-for-workers \
                --worker-slots="$workers" \
                --max-queue="$max_queue" \
                --actor=system.locale-prewarm >>"$LOG" 2>&1 \
            && log "INFO" "DCC locale prewarm workers started" \
            || log "WARN" "DCC locale prewarm kick failed (see $LOG)"
        return
    fi

    log "WARN" "DCC locale prewarm could not start because neither systemd nor runuser is available"
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
stop_dcc_locale_prewarm_for_deploy

# ── Pull latest code ─────────────────────────────────────────────────────
capture_runtime_mutations
log "INFO" "Fetching origin/$BRANCH..."
git fetch origin "$BRANCH" --quiet
BEFORE=$(git rev-parse HEAD)
git reset --hard "origin/$BRANCH" --quiet
AFTER=$(git rev-parse HEAD)
restore_runtime_mutations

if [ "$BEFORE" = "$AFTER" ]; then
    log "INFO" "Already up-to-date at $(echo "$AFTER" | head -c 8)"
else
    log "INFO" "Updated: $(echo "$BEFORE" | head -c 8) → $(echo "$AFTER" | head -c 8)"
fi

# ── Stamp portal HTML with deploy SHA to bust browser cache ──────────────
# nginx serves /mom/scripts/**/*.js and /mom/styles/**/*.css with
# Cache-Control: public, immutable, max-age=2592000 (30 days). Without a
# version query, users keep an old asset in their browser for up to a month
# after a deploy. Inject ?v=<short-sha> at deploy time so every commit
# produces unique URLs and stale caches flush automatically the next time
# the user loads portal.html. Strips any pre-existing ?v=... so multiple
# deploys do not stack query params. Targets only ./ and /mom/ asset URLs
# so external CDN references (Tailwind, fonts) are not touched.
SHORT_SHA="$(echo "$AFTER" | head -c 8)"
export SHORT_SHA
for html in "$SITE_DIR/mom/portal.html" "$SITE_DIR/mom/index.html"; do
    [ -f "$html" ] || continue
    perl -i -pe 's{(src|href)="((?!https?://)[^"?]+\.(?:js|css))(?:\?v=[A-Za-z0-9._-]+)?"}{$1."=\"".$2."?v=$ENV{SHORT_SHA}\""}ge' \
        "$html" \
        || die "Cannot stamp $html with cache-bust version"
done
unset SHORT_SHA
log "INFO" "Stamped portal/index HTML asset URLs with ?v=$(echo "$AFTER" | head -c 8)"

run_composer_install

# ── Copy private config that lives outside the repo ──────────────────────
if [ -d "$PRIVATE_DATA/config" ]; then
    log "INFO" "Copying private config..."
    cp -n "$PRIVATE_DATA/config/"*.json \
        "$SITE_DIR/mom/data/config/" 2>/dev/null || true
fi

# ── Bootstrap missing runtime files from .bootstrap.json seeds ───────────
# After untrack-runtime-files.sh runs, the runtime files (users.json etc.)
# are no longer tracked. Fresh installs need a starting point — that comes
# from the .bootstrap.json sibling seeds shipped in the repo. Existing
# installs already have the live files (preserved by capture/restore above)
# so the `cp -n` is a no-op for them.
log "INFO" "Bootstrapping missing runtime files from .bootstrap.json seeds..."
seeded_count=0
for name in "${RUNTIME_CONFIG_FILES[@]}"; do
    live="$SITE_DIR/mom/data/config/$name"
    seed="$SITE_DIR/mom/data/config/${name%.json}.bootstrap.json"
    if [ ! -f "$live" ] && [ -f "$seed" ]; then
        # Ensure subdir exists for nested names like "deploy/program.json"
        live_dir="$(dirname "$live")"
        mkdir -p "$live_dir"
        chmod 775 "$live_dir" 2>/dev/null || true
        cp -p "$seed" "$live" || die "Cannot bootstrap $name from $seed"
        # Seeds are 644 in git; widen to 664 so www-data can mutate the
        # runtime file once the app starts writing to it.
        chmod 664 "$live" 2>/dev/null || true
        seeded_count=$((seeded_count + 1))
        log "INFO" "  bootstrapped $name from .bootstrap.json"
    fi
done
[ "$seeded_count" -gt 0 ] && log "INFO" "Bootstrapped $seeded_count runtime file(s) from seeds"

# ── Verify preserve list still covers every PHP writer ────────────────────
# Belt-and-suspenders: the canonical list lives in _runtime-files.sh, but
# someone may have added a new save_*() callsite without updating it. Run
# the audit script and abort if a new writer is unprotected.
if [ -f "$SITE_DIR/tools/vps-setup/scripts/audit-runtime-files.php" ]; then
    if ! php8.5 "$SITE_DIR/tools/vps-setup/scripts/audit-runtime-files.php" >>"$LOG" 2>&1; then
        die "Runtime-files audit FAILED — see $LOG. A new PHP writer touches mom/data/config/ without being in the preserve list. Fix _runtime-files.sh and re-deploy."
    fi
fi

# ── Fix permissions ──────────────────────────────────────────────────────
log "INFO" "Setting permissions..."
chown -R "$DEPLOY_USER:$WEB_GROUP" "$SITE_DIR"
# Exclude vendor/ and .git/ — vendor is owned by composer (correct perms after
# composer install), .git/ objects/packfiles do not need to be chmod'd on every
# deploy and scanning them adds seconds for zero benefit.
find "$SITE_DIR" \
    \( -path "$SITE_DIR/mom/vendor" -o -path "$SITE_DIR/.git" \) -prune \
    -o -type d -print0 | xargs -0 chmod 755
find "$SITE_DIR" \
    \( -path "$SITE_DIR/mom/vendor" -o -path "$SITE_DIR/.git" \) -prune \
    -o -type f -print0 | xargs -0 chmod 644
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

# Runtime config files (PHP-FPM mutates these — users.json, deploy/*.json, …).
# The global `find -type f -exec chmod 644` above resets every file under
# $SITE_DIR back to read-only-for-group, including the live runtime JSON we
# just restored or bootstrapped. Without this loop, every PHP write returns
# `api_error:server_error` on the next request. Walk RUNTIME_CONFIG_FILES (the
# single-source-of-truth array sourced earlier) and widen each back to 664,
# plus make sure their parent dirs are 775 (setgid by mom-vps-data/ ACL) so
# the app can also CREATE new sidecar files (locks, .tmp, …) at write time.
for name in "${RUNTIME_CONFIG_FILES[@]}"; do
    live="$SITE_DIR/mom/data/config/$name"
    live_dir="$(dirname "$live")"
    [ -d "$live_dir" ] && chmod 775 "$live_dir" 2>/dev/null || true
    [ -f "$live"     ] && chmod 664 "$live"     2>/dev/null || true
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

# Mixed-owner runtime stores: the JSON file lives in git as an empty .gitkeep
# sentinel, but PHP-FPM creates and rewrites the canonical *.json beside it
# (OrderService, CustomerPurchaseOrderService, EmailIntakeImapService all do
# atomic write-then-rename). Keep deploy as owner so the .gitkeep stays
# trackable, but mark the directory g+ws so www-data can create new files
# and inherit the group. Without this every fresh deploy throws
# "Failed to write orders.json" / "Failed to write customer_purchase_orders.json"
# (incident 2026-05-28: Customer POs tab returned 500 after deploy wiped
# previous chmod). Add a new runtime dir here whenever a service starts
# writing under mom/data/<dir>.
for runtime_dir in orders commercial private private/email-intake private/email-intake/attachments; do
    runtime_path="$SITE_DIR/mom/data/$runtime_dir"
    [ -d "$runtime_path" ] || mkdir -p "$runtime_path"
    chown "$DEPLOY_USER:$WEB_GROUP" "$runtime_path"
    chmod 2775 "$runtime_path"
done

# Controlled-document content is an application-managed surface, not immutable
# code. The editor, archive, and derived locale artifacts all write beside the
# source documents, so only these content trees stay group-writable for the
# PHP-FPM pool while the rest of the repository remains locked down.
for content_dir in \
    "$SITE_DIR/mom/docs/system" \
    "$SITE_DIR/mom/docs/operations" \
    "$SITE_DIR/mom/docs/forms" \
    "$SITE_DIR/mom/docs/training" \
    "$SITE_DIR/mom/docs/glossary" \
    "$SITE_DIR/archive"; do
    [ -d "$content_dir" ] || continue
    chown -R "$DEPLOY_USER:$WEB_GROUP" "$content_dir"
    find "$content_dir" -type d -exec chmod 2775 {} +
    find "$content_dir" -type f -exec chmod 664 {} +
done

# Keep only governed runtime config files writable. The config directory itself
# must allow PHP-FPM to create same-directory *.tmp files because the legacy
# JSON helpers use write-then-rename for users, role permissions, module access,
# and document visibility. Sticky + setgid keeps non-runtime deploy-owned files
# protected while allowing the listed PHP-owned stores to be replaced atomically.
config_dir="$SITE_DIR/mom/data/config"
mkdir -p "$config_dir"
chown "$DEPLOY_USER:$WEB_GROUP" "$config_dir"
chmod 3775 "$config_dir"

for config_file in \
    "$SITE_DIR/mom/data/config/users.json" \
    "$SITE_DIR/mom/data/config/role_permissions.json" \
    "$SITE_DIR/mom/data/config/portal_role_docs.json" \
    "$SITE_DIR/mom/data/config/module_access_config.json" \
    "$SITE_DIR/mom/data/config/user_doc_overrides.json" \
    "$SITE_DIR/mom/data/config/docs_custom.json" \
    "$SITE_DIR/mom/data/config/docs_visibility.json" \
    "$SITE_DIR/mom/data/config/form_control_registry.json" \
    "$SITE_DIR/mom/data/config/portal_display_config.json" \
    "$SITE_DIR/mom/data/config/design-system-config.json" \
    "$SITE_DIR/mom/data/config/decision_thresholds.json"; do
    [ -e "$config_file" ] || continue
    chown "$WEB_USER:$WEB_GROUP" "$config_file"
    chmod 664 "$config_file"
done

# Graphics governance runtime directories: PHP-FPM writes registry snapshots and
# governance state here. No sticky bit on these dirs so atomic tmp→rename works
# as long as www-data has directory write permission.
for gfx_dir in \
    "$SITE_DIR/mom/data/registry" \
    "$SITE_DIR/mom/data/graphics-governance"; do
    [ -d "$gfx_dir" ] || continue
    chown "$DEPLOY_USER:$WEB_GROUP" "$gfx_dir"
    find "$gfx_dir" -type d -exec chmod 775 {} +
    find "$gfx_dir" -type f -exec chmod 664 {} +
done

# mom/design is the canonical template registry source; publishTemplate() writes
# template-registry.json there via atomic tmp→rename (no sticky bit on this dir).
design_dir="$SITE_DIR/mom/design"
if [ -d "$design_dir" ]; then
    chmod 775 "$design_dir"
    [ -f "$design_dir/template-registry.json" ] && chmod 664 "$design_dir/template-registry.json"
fi

# Stale *.lock and *.tmp files left by admin CLI tests or crashed PHP workers
# can be owned by root (when run via sudo) and block fopen('c') from PHP-FPM.
# Reset ownership on all such files in every PHP-writable area so the next
# legitimate write always succeeds regardless of what created the lock file.
for _lock_dir in \
    "$SITE_DIR/mom/data/config" \
    "$SITE_DIR/mom/data/registry" \
    "$SITE_DIR/mom/data/graphics-governance" \
    "$SITE_DIR/mom/design"; do
    [ -d "$_lock_dir" ] || continue
    find "$_lock_dir" -name "*.lock" -exec chown "$WEB_USER:$WEB_GROUP" {} + -exec chmod 664 {} + 2>/dev/null || true
    find "$_lock_dir" -name "*.tmp"  -delete 2>/dev/null || true
done

# data-private root: www-data must be able to create dot-files
# (.sync-schedule.json, .local-sync-report.json) via atomic tmp+rename.
chgrp "$WEB_GROUP" "$PRIVATE_DATA" 2>/dev/null || true
chmod g+w  "$PRIVATE_DATA" 2>/dev/null || true
for _dpfile in .sync-schedule.json .local-sync-report.json; do
    _fp="$PRIVATE_DATA/$_dpfile"
    [ -e "$_fp" ] || touch "$_fp"
    chown "$WEB_USER:$WEB_GROUP" "$_fp"
    chmod 664 "$_fp"
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

run_dcc_locale_prewarm_kick

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

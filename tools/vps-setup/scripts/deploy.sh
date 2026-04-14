#!/bin/bash
# =============================================================================
# HESEM MOM Portal - Deploy Script
# Replaces .cpanel.yml deployment pipeline.
# Usage: sudo bash /var/www/deploy.sh
# =============================================================================
set -euo pipefail

# ── Configuration ─────────────────────────────────────────────────────────
SITE_DIR="/var/www/eqms.hesemeng.com"
PRIVATE_DATA="/var/www/data-private"
BRANCH="main"
LOG="/var/log/qms-deploy.log"
DEPLOY_USER="deploy"
WEB_USER="${WEB_USER:-}"
WEB_GROUP="${WEB_GROUP:-}"
RUN_DB_MIGRATIONS="${RUN_DB_MIGRATIONS:-1}"
RUN_DB_SCHEMA_SMOKE="${RUN_DB_SCHEMA_SMOKE:-1}"

# ── Helpers ───────────────────────────────────────────────────────────────
log() { echo "$(date '+%Y-%m-%d %H:%M:%S') [$1] $2" | tee -a "$LOG"; }
die() { log "ERROR" "$1"; exit 1; }

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

log "INFO" "═══ Deploy started ═══"

# ── Pre-flight checks ────────────────────────────────────────────────────
[ -d "$SITE_DIR/.git" ] || die "$SITE_DIR is not a git repository"
command -v php8.2 >/dev/null 2>&1 || die "php8.2 not found"
detect_php_fpm_identity

# ── Pull latest code ─────────────────────────────────────────────────────
cd "$SITE_DIR"
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

# ── Copy private config (mirrors .cpanel.yml logic) ──────────────────────
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

# Writable directories (PHP-FPM writes here through the configured pool user/group)
for dir in uploads online-forms allocations form-workflow/state; do
    target="$SITE_DIR/mom/data/$dir"
    if [ -d "$target" ]; then
        find "$target" -type d -exec chmod 775 {} +
        find "$target" -type f -exec chmod 664 {} +
        chown -R "$DEPLOY_USER:$WEB_GROUP" "$target"
    fi
done

# PHP refuses to open session files created by a different UID. Keep the
# whole session tree owned by the PHP-FPM pool user, not the deploy user.
session_dir="$SITE_DIR/mom/data/sessions"
mkdir -p "$session_dir"
chown -R "$WEB_USER:$WEB_GROUP" "$session_dir"
find "$session_dir" -type d -exec chmod 2770 {} +
find "$session_dir" -type f -exec chmod 660 {} +

# Ensure log files are writable
for logfile in php_error.log audit.log db_queries.log; do
    target="$SITE_DIR/mom/data/$logfile"
    touch "$target"
    chown "$WEB_USER:$WEB_GROUP" "$target"
    chmod 664 "$target"
done
restore_git_executable_bits

# ── Run governed database migrations before PHP-FPM serves the new release ──
if [ "$RUN_DB_MIGRATIONS" = "1" ]; then
    log "INFO" "Running governed DB migrations and schema smoke..."
    RUN_DB_MIGRATIONS="$RUN_DB_MIGRATIONS" \
    RUN_DB_SCHEMA_SMOKE="$RUN_DB_SCHEMA_SMOKE" \
        bash "$SITE_DIR/mom/ops/vps/run-db-migrations.sh"
else
    log "WARN" "Skipping DB migrations because RUN_DB_MIGRATIONS=$RUN_DB_MIGRATIONS"
fi

# ── Clear OPcache ────────────────────────────────────────────────────────
log "INFO" "Clearing OPcache..."
# Method 1: via PHP-FPM reload (recommended)
systemctl reload php8.2-fpm 2>/dev/null && log "INFO" "PHP-FPM reloaded" || true

log "INFO" "═══ Deploy completed ═══"
echo ""
echo "Current revision: $(git rev-parse --short HEAD)"
echo "Deploy log: $LOG"

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
WEB_GROUP="www-data"
RUN_DB_MIGRATIONS="${RUN_DB_MIGRATIONS:-1}"
RUN_DB_SCHEMA_SMOKE="${RUN_DB_SCHEMA_SMOKE:-1}"

# ── Helpers ───────────────────────────────────────────────────────────────
log() { echo "$(date '+%Y-%m-%d %H:%M:%S') [$1] $2" | tee -a "$LOG"; }
die() { log "ERROR" "$1"; exit 1; }

log "INFO" "═══ Deploy started ═══"

# ── Pre-flight checks ────────────────────────────────────────────────────
[ -d "$SITE_DIR/.git" ] || die "$SITE_DIR is not a git repository"
command -v php8.2 >/dev/null 2>&1 || die "php8.2 not found"

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

# Writable directories (PHP-FPM writes here as www-data)
for dir in sessions uploads online-forms allocations form-workflow/state; do
    target="$SITE_DIR/mom/data/$dir"
    if [ -d "$target" ]; then
        chmod -R 775 "$target"
        chown -R "$DEPLOY_USER:$WEB_GROUP" "$target"
    fi
done

# Ensure session dir exists
mkdir -p "$SITE_DIR/mom/data/sessions"
chown "$WEB_GROUP:$WEB_GROUP" "$SITE_DIR/mom/data/sessions"

# Ensure log files are writable
for logfile in php_error.log audit.log db_queries.log; do
    target="$SITE_DIR/mom/data/$logfile"
    touch "$target"
    chown "$WEB_GROUP:$WEB_GROUP" "$target"
    chmod 664 "$target"
done

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

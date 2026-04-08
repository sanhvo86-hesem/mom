#!/bin/bash
# =============================================================================
# HESEM MOM Portal - Data Migration from cPanel to VPS
# Run this ON THE VPS after setup-vps.sh has completed.
#
# Prerequisites:
#   - setup-vps.sh has been run successfully
#   - Data archives have been transferred from cPanel to /tmp/ on VPS:
#       /tmp/data-backup.tar.gz
#       /tmp/data-private.tar.gz (optional)
#
# To create these archives on cPanel server:
#   cd /home/pqobnire/eqms.hesemeng.com
#   tar czf /tmp/data-backup.tar.gz mom/data/
#   tar czf /tmp/data-private.tar.gz /home/pqobnire/data-private/
#
# Transfer to VPS:
#   scp /tmp/data-*.tar.gz deploy@VPS_IP:/tmp/
# =============================================================================
set -euo pipefail

SITE_DIR="/var/www/eqms.hesemeng.com"
PRIVATE_DIR="/var/www/data-private"
DEPLOY_USER="deploy"
WEB_GROUP="www-data"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'
log()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1"; exit 1; }

echo ""
echo "══════════════════════════════════════════════════════════════"
echo "  HESEM MOM Portal — Data Migration"
echo "══════════════════════════════════════════════════════════════"
echo ""

# ── Step 1: Restore data ─────────────────────────────────────────────
if [ -f /tmp/data-backup.tar.gz ]; then
    log "Restoring data from backup..."

    # Backup existing data first
    if [ -d "$SITE_DIR/mom/data" ]; then
        warn "Existing data found — backing up to /tmp/data-existing.tar.gz"
        cd "$SITE_DIR"
        tar czf /tmp/data-existing.tar.gz mom/data/ 2>/dev/null || true
    fi

    # Extract archive
    cd "$SITE_DIR"
    tar xzf /tmp/data-backup.tar.gz
    log "data restored"
else
    warn "No /tmp/data-backup.tar.gz found — skipping data restore"
fi

# ── Step 2: Restore private config ───────────────────────────────────────
if [ -f /tmp/data-private.tar.gz ]; then
    log "Restoring private config..."
    mkdir -p "$PRIVATE_DIR"
    tar xzf /tmp/data-private.tar.gz -C "$PRIVATE_DIR" --strip-components=3 2>/dev/null || \
    tar xzf /tmp/data-private.tar.gz -C "$PRIVATE_DIR" 2>/dev/null || true

    # Copy private config into site
    if [ -d "$PRIVATE_DIR/config" ]; then
        cp -n "$PRIVATE_DIR/config/"*.json \
            "$SITE_DIR/mom/data/config/" 2>/dev/null || true
        log "Private config files merged into data/config/"
    fi
else
    warn "No /tmp/data-private.tar.gz found — skipping private config restore"
fi

# ── Step 3: Fix permissions ──────────────────────────────────────────────
log "Fixing permissions..."
chown -R "$DEPLOY_USER:$WEB_GROUP" "$SITE_DIR"
find "$SITE_DIR" -type d -exec chmod 755 {} +
find "$SITE_DIR" -type f -exec chmod 644 {} +

for dir in sessions uploads online-forms allocations form-workflow/state; do
    target="$SITE_DIR/mom/data/$dir"
    if [ -d "$target" ]; then
        chmod -R 775 "$target"
    fi
done

mkdir -p "$SITE_DIR/mom/data/sessions"
chown www-data:www-data "$SITE_DIR/mom/data/sessions"

for logfile in php_error.log audit.log db_queries.log; do
    touch "$SITE_DIR/mom/data/$logfile"
    chown www-data:www-data "$SITE_DIR/mom/data/$logfile"
    chmod 664 "$SITE_DIR/mom/data/$logfile"
done

# ── Step 4: Import PostgreSQL schema (optional) ─────────────────────────
read -rp "Import PostgreSQL schema? (y/N): " import_pg
if [[ "$import_pg" =~ ^[Yy]$ ]]; then
    SCHEMA="$SITE_DIR/mom/database/schema.sql"
    if [ -f "$SCHEMA" ]; then
        log "Importing schema..."
        sudo -u postgres psql -d mom -f "$SCHEMA" 2>&1 | tail -5
        log "Schema imported"

        # Run migrations
        MIGRATIONS_DIR="$SITE_DIR/mom/database/migrations"
        if [ -d "$MIGRATIONS_DIR" ] && [ "$(ls -A "$MIGRATIONS_DIR"/*.sql 2>/dev/null)" ]; then
            log "Running migrations..."
            for f in "$MIGRATIONS_DIR"/*.sql; do
                echo "  → $(basename "$f")"
                sudo -u postgres psql -d mom -f "$f" -q 2>/dev/null || true
            done
            log "Migrations completed"
        fi
    else
        warn "Schema file not found: $SCHEMA"
    fi
fi

# ── Step 5: Reload services ─────────────────────────────────────────────
log "Reloading services..."
systemctl reload php8.2-fpm
systemctl reload nginx

# ── Step 6: Verify ──────────────────────────────────────────────────────
echo ""
echo "══════════════════════════════════════════════════════════════"
echo -e "  ${GREEN}DATA MIGRATION COMPLETE!${NC}"
echo "══════════════════════════════════════════════════════════════"
echo ""
echo "  Verify the following:"
echo "  ─────────────────────────────────────────────────"
echo "  - Config files: ls $SITE_DIR/mom/data/config/"
echo "  - Users exist:  cat $SITE_DIR/mom/data/config/users.json | head -20"
echo "  - Sessions dir: ls -la $SITE_DIR/mom/data/sessions/"
echo "  - Test locally: curl -I http://localhost/mom/api.php?action=status"
echo ""
echo "  Clean up transfer files:"
echo "  rm /tmp/data-backup.tar.gz /tmp/data-private.tar.gz"
echo "══════════════════════════════════════════════════════════════"

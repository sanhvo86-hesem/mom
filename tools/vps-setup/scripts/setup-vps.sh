#!/bin/bash
# =============================================================================
# HESEM MOM Portal - VPS Ubuntu 24.04 Full Setup Script
# Run as root on a fresh Ubuntu 24.04 LTS VPS.
#
# Usage:
#   wget -O setup.sh https://raw.githubusercontent.com/.../tools/vps-setup/scripts/setup-vps.sh
#   chmod +x setup.sh
#   sudo bash setup.sh
#
# What this script does:
#   1. Creates deploy user
#   2. Installs Nginx, PHP 8.5-FPM, PostgreSQL 16
#   3. Clones the QMS repository
#   4. Configures Nginx server block
#   5. Configures PHP-FPM pool
#   6. Sets up PostgreSQL database
#   7. Configures firewall (UFW)
#   8. Installs Certbot for SSL
#   9. Sets up log rotation & daily backups
# =============================================================================
set -euo pipefail

# ── Configuration ─────────────────────────────────────────────────────────
DOMAIN="eqms.hesemeng.com"
SITE_DIR="/var/www/$DOMAIN"
DEPLOY_USER="deploy"
DB_NAME="mom"
DB_USER="mom_app"
DB_PASS=""  # Will be generated
GIT_REPO="https://github.com/sanhvo86-hesem/MOM.git"
GIT_BRANCH="main"
ADMIN_EMAIL="sanhvo86@gmail.com"

# ── Helpers ───────────────────────────────────────────────────────────────
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1"; exit 1; }

# ── Pre-flight ────────────────────────────────────────────────────────────
[ "$(id -u)" -eq 0 ] || err "This script must be run as root"
. /etc/os-release
[[ "$VERSION_ID" == "24.04" ]] || warn "Expected Ubuntu 24.04, got $VERSION_ID"

echo ""
echo "══════════════════════════════════════════════════════════════"
echo "  HESEM MOM Portal — VPS Setup for Ubuntu 24.04"
echo "  Domain: $DOMAIN"
echo "══════════════════════════════════════════════════════════════"
echo ""

# ── Generate secure DB password ──────────────────────────────────────────
DB_PASS=$(openssl rand -base64 24 | tr -d '/+=' | head -c 32)
log "Generated database password (saved to /root/.mom-db-credentials)"

# ══════════════════════════════════════════════════════════════════════════
# STEP 1: System Updates & Timezone
# ══════════════════════════════════════════════════════════════════════════
log "Updating system packages..."
export DEBIAN_FRONTEND=noninteractive
apt update -qq
apt upgrade -y -qq

log "Setting timezone to Asia/Ho_Chi_Minh..."
timedatectl set-timezone Asia/Ho_Chi_Minh

# ══════════════════════════════════════════════════════════════════════════
# STEP 2: Create deploy user
# ══════════════════════════════════════════════════════════════════════════
if id "$DEPLOY_USER" &>/dev/null; then
    log "User $DEPLOY_USER already exists"
else
    log "Creating user $DEPLOY_USER..."
    adduser --disabled-password --gecos "Deploy" "$DEPLOY_USER"
    usermod -aG sudo "$DEPLOY_USER"
    # Copy root's SSH keys to deploy user
    if [ -d /root/.ssh ]; then
        mkdir -p "/home/$DEPLOY_USER/.ssh"
        cp /root/.ssh/authorized_keys "/home/$DEPLOY_USER/.ssh/" 2>/dev/null || true
        chown -R "$DEPLOY_USER:$DEPLOY_USER" "/home/$DEPLOY_USER/.ssh"
        chmod 700 "/home/$DEPLOY_USER/.ssh"
        chmod 600 "/home/$DEPLOY_USER/.ssh/authorized_keys" 2>/dev/null || true
    fi
    log "User $DEPLOY_USER created"
fi

# ══════════════════════════════════════════════════════════════════════════
# STEP 3: Install Nginx
# ══════════════════════════════════════════════════════════════════════════
log "Installing Nginx..."
apt install -y -qq nginx
systemctl enable nginx

# ══════════════════════════════════════════════════════════════════════════
# STEP 4: Install PHP 8.5-FPM + Composer
# ══════════════════════════════════════════════════════════════════════════
log "Installing PHP 8.5-FPM, Composer, and extensions..."
apt install -y -qq software-properties-common
add-apt-repository -y ppa:ondrej/php 2>/dev/null
apt update -qq
apt install -y -qq \
    composer \
    php8.5-fpm \
    php8.5-cli \
    php8.5-common \
    php8.5-pgsql \
    php8.5-mbstring \
    php8.5-xml \
    php8.5-curl \
    php8.5-zip \
    php8.5-gd \
    php8.5-intl \
    php8.5-readline

systemctl enable php8.5-fpm

# Create slow log directory
mkdir -p /var/log/php-fpm
chown www-data:www-data /var/log/php-fpm

log "PHP 8.5-FPM and Composer installed"

# ══════════════════════════════════════════════════════════════════════════
# STEP 5: Install PostgreSQL 16
# ══════════════════════════════════════════════════════════════════════════
log "Installing PostgreSQL 16..."
apt install -y -qq postgresql-16 postgresql-contrib-16
systemctl enable postgresql

log "Creating database and user..."
sudo -u postgres psql -v ON_ERROR_STOP=1 <<SQL
DO \$\$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '$DB_USER') THEN
        CREATE ROLE $DB_USER WITH LOGIN PASSWORD '$DB_PASS';
    END IF;
END
\$\$;
SELECT 'CREATE DATABASE $DB_NAME OWNER $DB_USER'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$DB_NAME')\gexec
\c $DB_NAME
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gist";
SQL
log "PostgreSQL configured: database=$DB_NAME, user=$DB_USER"

# ══════════════════════════════════════════════════════════════════════════
# STEP 6: Clone Repository
# ══════════════════════════════════════════════════════════════════════════
if [ -d "$SITE_DIR/.git" ]; then
    log "Repository already exists at $SITE_DIR"
    cd "$SITE_DIR"
    git fetch origin "$GIT_BRANCH" --quiet
    git reset --hard "origin/$GIT_BRANCH" --quiet
else
    log "Cloning repository..."
    mkdir -p /var/www
    git clone --branch "$GIT_BRANCH" "$GIT_REPO" "$SITE_DIR"
fi

# ══════════════════════════════════════════════════════════════════════════
# STEP 7: Configure Nginx
# ══════════════════════════════════════════════════════════════════════════
log "Configuring Nginx server block..."

# Copy the Nginx config from the repo
cp "$SITE_DIR/tools/vps-setup/nginx/eqms.hesemeng.com.conf" \
   "/etc/nginx/sites-available/$DOMAIN"

# Enable site, disable default
ln -sf "/etc/nginx/sites-available/$DOMAIN" "/etc/nginx/sites-enabled/$DOMAIN"
rm -f /etc/nginx/sites-enabled/default

# Temporarily comment out SSL lines (Certbot will add them)
sed -i 's/^\(\s*ssl_certificate\)/#\1/' "/etc/nginx/sites-available/$DOMAIN"
sed -i 's/^\(\s*include.*letsencrypt\)/#\1/' "/etc/nginx/sites-available/$DOMAIN"
sed -i 's/^\(\s*ssl_dhparam\)/#\1/' "/etc/nginx/sites-available/$DOMAIN"
# Change listen 443 ssl to listen 80 temporarily
sed -i 's/listen 443 ssl http2/listen 80/' "/etc/nginx/sites-available/$DOMAIN"
sed -i 's/listen \[::\]:443 ssl http2/listen [::]:80/' "/etc/nginx/sites-available/$DOMAIN"

nginx -t && systemctl reload nginx
log "Nginx configured (HTTP-only until SSL is set up)"

# ══════════════════════════════════════════════════════════════════════════
# STEP 8: Configure PHP-FPM Pool
# ══════════════════════════════════════════════════════════════════════════
log "Configuring PHP-FPM pool..."

# Copy pool config
cp "$SITE_DIR/tools/vps-setup/php-fpm/mom.conf" /etc/php/8.5/fpm/pool.d/mom.conf

# Inject the generated DB password into both DB_PASSWORD (read by database/config.php)
# and DB_PASS (legacy alias used by CLI migration tools).
# Using | as sed delimiter to avoid issues if password contains slashes.
sed -i "s|CHANGE_ME_STRONG_PASSWORD|$DB_PASS|g" /etc/php/8.5/fpm/pool.d/mom.conf

# Remove default pool to avoid socket conflicts
rm -f /etc/php/8.5/fpm/pool.d/www.conf

systemctl restart php8.5-fpm
log "PHP-FPM pool configured"

# ══════════════════════════════════════════════════════════════════════════
# STEP 9: Set Permissions
# ══════════════════════════════════════════════════════════════════════════
log "Setting file permissions..."

chown -R "$DEPLOY_USER:www-data" "$SITE_DIR"
find "$SITE_DIR" -type d -exec chmod 755 {} +
find "$SITE_DIR" -type f -exec chmod 644 {} +

# Writable directories
for dir in uploads online-forms allocations form-workflow/state; do
    target="$SITE_DIR/mom/data/$dir"
    mkdir -p "$target"
    chmod -R 775 "$target"
    chown -R "$DEPLOY_USER:www-data" "$target"
done

# PHP-owned runtime state must stay owned by PHP-FPM, not the deploy user.
for runtime_dir in sessions ratelimit; do
    runtime_path="$SITE_DIR/mom/data/$runtime_dir"
    mkdir -p "$runtime_path"
    chown -R www-data:www-data "$runtime_path"
    find "$runtime_path" -type d -exec chmod 2770 {} +
    find "$runtime_path" -type f -exec chmod 660 {} +
done

# Log files
for logfile in php_error.log audit.log db_queries.log; do
    touch "$SITE_DIR/mom/data/$logfile"
    chown www-data:www-data "$SITE_DIR/mom/data/$logfile"
    chmod 664 "$SITE_DIR/mom/data/$logfile"
done

# ══════════════════════════════════════════════════════════════════════════
# STEP 10: Private data directory
# ══════════════════════════════════════════════════════════════════════════
mkdir -p /var/www/data-private/config
chown -R "$DEPLOY_USER:www-data" /var/www/data-private
chmod 750 /var/www/data-private
log "Private data directory created at /var/www/data-private"

# ══════════════════════════════════════════════════════════════════════════
# STEP 11: Firewall (UFW)
# ══════════════════════════════════════════════════════════════════════════
log "Configuring firewall..."
apt install -y -qq ufw
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp   comment 'SSH'
ufw allow 80/tcp   comment 'HTTP'
ufw allow 443/tcp  comment 'HTTPS'
echo "y" | ufw enable
log "Firewall enabled (SSH + HTTP + HTTPS)"

# ══════════════════════════════════════════════════════════════════════════
# STEP 12: Fail2Ban
# ══════════════════════════════════════════════════════════════════════════
log "Installing Fail2Ban..."
apt install -y -qq fail2ban

cat > /etc/fail2ban/jail.local <<'JAIL'
[DEFAULT]
bantime  = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port    = ssh
filter  = sshd
logpath = /var/log/auth.log

[nginx-http-auth]
enabled  = true
port     = http,https
filter   = nginx-http-auth
logpath  = /var/log/nginx/eqms.hesemeng.com.error.log
JAIL

systemctl enable fail2ban
systemctl restart fail2ban
log "Fail2Ban configured"

# ══════════════════════════════════════════════════════════════════════════
# STEP 13: Deploy Pipeline
# ══════════════════════════════════════════════════════════════════════════
log "Registering deploy pipeline entrypoint..."
chmod +x "$SITE_DIR/tools/vps-setup/scripts/deploy.sh"
rm -f /var/www/deploy.sh
cat > /etc/sudoers.d/qms-deploy <<SUDOERS
$DEPLOY_USER ALL=(root) NOPASSWD: /usr/bin/bash $SITE_DIR/tools/vps-setup/scripts/deploy.sh
SUDOERS
chmod 440 /etc/sudoers.d/qms-deploy
visudo -cf /etc/sudoers.d/qms-deploy >/dev/null
log "Deploy script registered at $SITE_DIR/tools/vps-setup/scripts/deploy.sh"
log "NOPASSWD sudo rule installed at /etc/sudoers.d/qms-deploy"

# ══════════════════════════════════════════════════════════════════════════
# STEP 14: Log Rotation
# ══════════════════════════════════════════════════════════════════════════
log "Configuring log rotation..."
cat > /etc/logrotate.d/qms <<LOGROTATE
$SITE_DIR/mom/data/*.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    create 664 www-data www-data
    sharedscripts
    postrotate
        systemctl reload php8.5-fpm > /dev/null 2>&1 || true
    endscript
}
LOGROTATE
log "Log rotation configured"

# ══════════════════════════════════════════════════════════════════════════
# STEP 15: Daily Backup
# ══════════════════════════════════════════════════════════════════════════
log "Setting up daily backups..."
mkdir -p /var/backups/qms

cat > /etc/cron.daily/qms-backup <<'BACKUP'
#!/bin/bash
set -euo pipefail
BACKUP_DIR="/var/backups/qms"
SITE_DIR="/var/www/eqms.hesemeng.com"
DATE=$(date +%Y%m%d_%H%M)

mkdir -p "$BACKUP_DIR"

# Backup JSON data
tar czf "$BACKUP_DIR/data-$DATE.tar.gz" \
    "$SITE_DIR/mom/data/" 2>/dev/null || true

# Backup PostgreSQL
sudo -u postgres pg_dump mom 2>/dev/null | gzip > "$BACKUP_DIR/pg-$DATE.sql.gz" || true

# Backup private config
tar czf "$BACKUP_DIR/private-config-$DATE.tar.gz" \
    /var/www/data-private/ 2>/dev/null || true

# Retention: keep 30 days
find "$BACKUP_DIR" -type f -mtime +30 -delete 2>/dev/null || true

echo "$(date '+%Y-%m-%d %H:%M:%S') Backup completed" >> /var/log/qms-backup.log
BACKUP
chmod +x /etc/cron.daily/qms-backup
log "Daily backup configured (/var/backups/qms)"

# ══════════════════════════════════════════════════════════════════════════
# STEP 16: SSH Hardening
# ══════════════════════════════════════════════════════════════════════════
log "Hardening SSH..."
cat > /etc/ssh/sshd_config.d/hardening.conf <<'SSHCONF'
# HESEM MOM - SSH Hardening
PermitRootLogin prohibit-password
PasswordAuthentication no
PubkeyAuthentication yes
MaxAuthTries 5
ClientAliveInterval 300
ClientAliveCountMax 3
X11Forwarding no
AllowTcpForwarding no
SSHCONF
systemctl reload sshd 2>/dev/null || systemctl reload ssh 2>/dev/null || true
log "SSH hardened (key-only auth)"

# ══════════════════════════════════════════════════════════════════════════
# STEP 17: Install Certbot (SSL setup is manual)
# ══════════════════════════════════════════════════════════════════════════
log "Installing Certbot..."
apt install -y -qq certbot python3-certbot-nginx
systemctl enable certbot.timer 2>/dev/null || true
log "Certbot installed"

# ══════════════════════════════════════════════════════════════════════════
# STEP 18: Save credentials
# ══════════════════════════════════════════════════════════════════════════
cat > /root/.mom-db-credentials <<CREDS
# HESEM MOM Database Credentials
# Generated: $(date '+%Y-%m-%d %H:%M:%S')
DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASS=$DB_PASS
CREDS
chmod 600 /root/.mom-db-credentials

# ══════════════════════════════════════════════════════════════════════════
# DONE
# ══════════════════════════════════════════════════════════════════════════
echo ""
echo "══════════════════════════════════════════════════════════════"
echo -e "  ${GREEN}SETUP COMPLETE!${NC}"
echo "══════════════════════════════════════════════════════════════"
echo ""
echo "  Domain:      $DOMAIN"
echo "  Site root:   $SITE_DIR"
echo "  DB name:     $DB_NAME"
echo "  DB user:     $DB_USER"
echo "  DB password: (saved to /root/.mom-db-credentials)"
echo ""
echo "  NEXT STEPS:"
echo "  ─────────────────────────────────────────────────────────"
echo "  1. Point DNS A record: $DOMAIN → $(curl -s ifconfig.me 2>/dev/null || echo 'YOUR_VPS_IP')"
echo "  2. Run SSL setup:"
echo "     certbot --nginx -d $DOMAIN"
echo "  3. Migrate data from cPanel:"
echo "     scp data-backup.tar.gz deploy@VPS:/tmp/"
echo "     cd $SITE_DIR && tar xzf /tmp/data-backup.tar.gz"
echo "  4. Copy private config to /var/www/data-private/config/"
echo "  5. Test: https://$DOMAIN"
echo "  6. Future deploys: sudo bash $SITE_DIR/tools/vps-setup/scripts/deploy.sh"
echo "     GitHub Actions uses the same script through /etc/sudoers.d/qms-deploy"
echo ""
echo "  DB credentials: cat /root/.mom-db-credentials"
echo "══════════════════════════════════════════════════════════════"

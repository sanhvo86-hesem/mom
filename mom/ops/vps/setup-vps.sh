#!/usr/bin/env bash
# ============================================================================
# HESEM MOM Portal — VPS Auto-Setup Script
# Ubuntu 22.04 / 24.04 — Nginx + PHP 8.3-FPM + PostgreSQL 16 + Redis
# ============================================================================
# Usage: ssh root@103.110.87.55 'bash -s' < setup-vps.sh
# ============================================================================
set -euo pipefail

DOMAIN="qms.hesem.com.vn"
DB_NAME="mom"
DB_USER="mom_app"
DB_PASS="$(openssl rand -base64 24 | tr -dc 'A-Za-z0-9' | head -c 32)"
APP_DIR="/var/www/hesem-mom"
REPO_URL="https://github.com/sanhvo86-hesem/hesemqms.git"

echo "============================================"
echo " HESEM MOM Portal — VPS Setup"
echo " Domain: $DOMAIN"
echo " IP: $(curl -s ifconfig.me || echo '103.110.87.55')"
echo "============================================"

# ── 1. System Update ────────────────────────────────────────────────────────
echo "[1/10] Updating system..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -y && apt-get upgrade -y
apt-get install -y curl wget gnupg2 software-properties-common \
    git unzip zip htop nano ufw fail2ban \
    lsb-release ca-certificates apt-transport-https

# ── 2. Firewall ─────────────────────────────────────────────────────────────
echo "[2/10] Configuring firewall..."
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw --force enable
echo "Firewall: SSH(22), HTTP(80), HTTPS(443) — enabled"

# ── 3. PHP 8.3 ──────────────────────────────────────────────────────────────
echo "[3/10] Installing PHP 8.3..."
add-apt-repository -y ppa:ondrej/php
apt-get update -y
apt-get install -y php8.3-fpm php8.3-cli php8.3-pgsql php8.3-curl \
    php8.3-mbstring php8.3-xml php8.3-zip php8.3-gd php8.3-intl \
    php8.3-bcmath php8.3-opcache php8.3-readline php8.3-redis \
    php8.3-uuid php8.3-soap

# PHP-FPM optimization
cat > /etc/php/8.3/fpm/pool.d/hesem.conf <<'PHPPOOL'
[hesem]
user = www-data
group = www-data
listen = /run/php/php8.3-fpm-hesem.sock
listen.owner = www-data
listen.group = www-data
pm = dynamic
pm.max_children = 30
pm.start_servers = 5
pm.min_spare_servers = 3
pm.max_spare_servers = 10
pm.max_requests = 500
php_admin_value[memory_limit] = 256M
php_admin_value[upload_max_filesize] = 50M
php_admin_value[post_max_size] = 55M
php_admin_value[max_execution_time] = 120
php_admin_value[opcache.enable] = 1
php_admin_value[opcache.memory_consumption] = 128
php_admin_value[opcache.max_accelerated_files] = 10000
php_admin_value[opcache.validate_timestamps] = 0
PHPPOOL

systemctl restart php8.3-fpm
systemctl enable php8.3-fpm

# ── 4. PostgreSQL 16 ────────────────────────────────────────────────────────
echo "[4/10] Installing PostgreSQL 16..."
sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc | gpg --dearmor -o /etc/apt/trusted.gpg.d/postgresql.gpg
apt-get update -y
apt-get install -y postgresql-16 postgresql-contrib-16

# Tune PostgreSQL for 8GB RAM
cat >> /etc/postgresql/16/main/conf.d/hesem.conf <<'PGCONF'
# HESEM MOM Portal - PostgreSQL tuning for 8GB RAM VPS
shared_buffers = '2GB'
effective_cache_size = '6GB'
work_mem = '16MB'
maintenance_work_mem = '512MB'
wal_buffers = '64MB'
max_connections = 100
checkpoint_completion_target = 0.9
random_page_cost = 1.1
effective_io_concurrency = 200
min_wal_size = '1GB'
max_wal_size = '4GB'
max_worker_processes = 4
max_parallel_workers_per_gather = 2
max_parallel_workers = 4
PGCONF

systemctl restart postgresql
systemctl enable postgresql

# Create database and user
sudo -u postgres psql <<EOSQL
CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';
CREATE DATABASE $DB_NAME OWNER $DB_USER;
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
ALTER USER $DB_USER CREATEDB;
\c $DB_NAME
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gist";
EOSQL

echo "PostgreSQL: database=$DB_NAME, user=$DB_USER"

# ── 5. Redis ────────────────────────────────────────────────────────────────
echo "[5/10] Installing Redis..."
apt-get install -y redis-server
sed -i 's/^supervised no/supervised systemd/' /etc/redis/redis.conf
systemctl restart redis-server
systemctl enable redis-server

# ── 6. Nginx ────────────────────────────────────────────────────────────────
echo "[6/10] Installing Nginx..."
apt-get install -y nginx

cat > /etc/nginx/sites-available/hesem-mom <<'NGINX'
server {
    listen 80;
    listen [::]:80;
    server_name qms.hesem.com.vn;

    root /var/www/hesem-mom/mom;
    index portal.html index.html index.php;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript image/svg+xml;
    gzip_min_length 1024;
    gzip_comp_level 6;

    # Static files cache
    location ~* \.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 7d;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }

    # API — PHP-FPM
    location /api/ {
        try_files $uri /api/index.php$is_args$args;
    }

    location ~ \.php$ {
        include snippets/fastcgi-params.conf;
        fastcgi_pass unix:/run/php/php8.3-fpm-hesem.sock;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        fastcgi_param DOCUMENT_ROOT $realpath_root;

        # Environment variables for DB
        fastcgi_param DB_HOST localhost;
        fastcgi_param DB_PORT 5432;
        fastcgi_param DB_NAME mom;
        fastcgi_param DB_USER mom_app;
        fastcgi_param DB_PASS __DB_PASS_PLACEHOLDER__;
        fastcgi_param USE_POSTGRES true;
        fastcgi_param SHADOW_WRITE false;
        fastcgi_param JSON_FALLBACK false;
    }

    # SPA fallback
    location / {
        try_files $uri $uri/ /portal.html;
    }

    # Block sensitive files
    location ~ /\.(git|env|claude) {
        deny all;
        return 404;
    }
    location ~ /(database|tools|tests|docs|ops)/ {
        deny all;
        return 404;
    }

    # Upload limit
    client_max_body_size 50M;
}
NGINX

# Replace DB password placeholder
sed -i "s/__DB_PASS_PLACEHOLDER__/$DB_PASS/" /etc/nginx/sites-available/hesem-mom

ln -sf /etc/nginx/sites-available/hesem-mom /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Create fastcgi-params if not exists
if [ ! -f /etc/nginx/snippets/fastcgi-params.conf ]; then
    cat > /etc/nginx/snippets/fastcgi-params.conf <<'FCGI'
fastcgi_split_path_info ^(.+\.php)(/.+)$;
fastcgi_index index.php;
include fastcgi_params;
fastcgi_read_timeout 120s;
fastcgi_buffers 16 16k;
fastcgi_buffer_size 32k;
FCGI
fi

nginx -t && systemctl restart nginx
systemctl enable nginx

# ── 7. Clone Repository ────────────────────────────────────────────────────
echo "[7/10] Cloning repository..."
mkdir -p /var/www
if [ -d "$APP_DIR" ]; then
    cd "$APP_DIR" && git fetch origin && git reset --hard origin/main
else
    git clone "$REPO_URL" "$APP_DIR"
fi
chown -R www-data:www-data "$APP_DIR"
chmod -R 755 "$APP_DIR"
chmod -R 775 "$APP_DIR/mom/data"

# ── 8. Run Database Migrations ──────────────────────────────────────────────
echo "[8/10] Running database migrations..."
cd "$APP_DIR/mom/database/migrations"
for migration in $(ls *.sql | sort); do
    echo "  Running: $migration"
    PGPASSWORD="$DB_PASS" psql -h localhost -U "$DB_USER" -d "$DB_NAME" -f "$migration" 2>&1 || echo "  Warning: $migration had issues (may be OK if already applied)"
done

# ── 9. SSL Certificate ─────────────────────────────────────────────────────
echo "[9/10] Setting up SSL..."
apt-get install -y certbot python3-certbot-nginx
certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --email admin@hesem.com.vn --redirect || echo "SSL setup failed — run manually: certbot --nginx -d $DOMAIN"

# ── 10. Deploy Script ───────────────────────────────────────────────────────
echo "[10/10] Creating deploy script..."
cat > /usr/local/bin/hesem-deploy <<'DEPLOY'
#!/usr/bin/env bash
set -euo pipefail
cd /var/www/hesem-mom
echo "Pulling latest code..."
git fetch origin
git reset --hard origin/main
chown -R www-data:www-data .
chmod -R 755 .
chmod -R 775 mom/data

echo "Clearing PHP OPcache..."
php8.3 -r "opcache_reset();" 2>/dev/null || true
systemctl reload php8.3-fpm

echo "Deploy complete! $(date)"
DEPLOY
chmod +x /usr/local/bin/hesem-deploy

# ── Summary ─────────────────────────────────────────────────────────────────
echo ""
echo "============================================"
echo " HESEM MOM Portal — Setup Complete!"
echo "============================================"
echo ""
echo " URL:       https://$DOMAIN"
echo " IP:        103.110.87.55"
echo " App Dir:   $APP_DIR/mom"
echo ""
echo " Database:  $DB_NAME"
echo " DB User:   $DB_USER"
echo " DB Pass:   $DB_PASS"
echo ""
echo " Deploy:    hesem-deploy"
echo " Terminal:  bash /var/www/hesem-mom/mom/ops/vps/install-terminal-gateway.sh"
echo " Observe:   bash /var/www/hesem-mom/mom/ops/vps/install-observability-stack.sh"
echo " PHP-FPM:   systemctl status php8.3-fpm"
echo " Nginx:     systemctl status nginx"
echo " PostgreSQL: systemctl status postgresql"
echo ""
echo " IMPORTANT: Save DB password above!"
echo "============================================"

# Save credentials
cat > /root/.hesem-credentials <<CREDS
DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASS=$DB_PASS
DOMAIN=$DOMAIN
APP_DIR=$APP_DIR
CREDS
chmod 600 /root/.hesem-credentials
echo "Credentials saved to /root/.hesem-credentials"

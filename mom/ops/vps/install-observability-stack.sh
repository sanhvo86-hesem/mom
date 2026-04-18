#!/usr/bin/env bash
# ============================================================================
# HESEM MOM Portal — Observability Stack Installer
# Netdata + Grafana + Nginx auth_request + portal session auth
# ============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./runtime-detect.sh
. "${SCRIPT_DIR}/runtime-detect.sh"

DOMAIN="${DOMAIN:-}"
APP_DIR="${APP_DIR:-}"
PORTAL_DIR="${PORTAL_DIR:-}"
HOST_ID="${HOST_ID:-hesem-vps-01}"
PHP_SOCK="${PHP_SOCK:-}"
NGINX_SITE="${NGINX_SITE:-}"
GRAFANA_PORT="${GRAFANA_PORT:-3000}"
NETDATA_PORT="${NETDATA_PORT:-19999}"
NETDATA_ENABLE_POSTGRES_COLLECTOR="${NETDATA_ENABLE_POSTGRES_COLLECTOR:-0}"
NETDATA_POSTGRES_DSN="${NETDATA_POSTGRES_DSN:-}"
NGINX_SNIPPET="/etc/nginx/snippets/hesem-observability-stack.conf"

require_root() {
  if [ "$(id -u)" -ne 0 ]; then
    echo "Run this script as root." >&2
    exit 1
  fi
}

bootstrap_runtime_vars() {
  APP_DIR="$(resolve_app_dir)"
  PORTAL_DIR="$(resolve_portal_dir)"
  NGINX_SITE="$(resolve_nginx_site)"
  PHP_SOCK="$(resolve_php_sock)"
  DOMAIN="$(resolve_domain)"
}

validate_runtime() {
  if [ ! -d "$APP_DIR" ]; then
    echo "Resolved APP_DIR does not exist: $APP_DIR" >&2
    exit 1
  fi

  if [ ! -f "${PORTAL_DIR}/api.php" ]; then
    echo "Resolved PORTAL_DIR does not contain api.php: ${PORTAL_DIR}" >&2
    exit 1
  fi

  if [ ! -f "$NGINX_SITE" ]; then
    echo "Resolved NGINX_SITE does not exist: $NGINX_SITE" >&2
    exit 1
  fi

  if [ ! -S "$PHP_SOCK" ]; then
    echo "Resolved PHP_FPM socket does not exist: $PHP_SOCK" >&2
    exit 1
  fi
}

install_prereqs() {
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -y
  apt-get install -y apt-transport-https wget curl gpg ca-certificates
}

install_netdata() {
  wget -O /tmp/netdata-kickstart.sh https://get.netdata.cloud/kickstart.sh
  sh /tmp/netdata-kickstart.sh --non-interactive --release-channel stable --native-only
  systemctl enable --now netdata
}

write_netdata_local_config() {
  local conf="/etc/netdata/netdata.conf"
  local tmp

  mkdir -p /etc/netdata
  touch "$conf"
  backup_file "$conf"

  tmp="$(mktemp)"
  awk '
    BEGIN { skip = 0 }
    /^# HESEM MANAGED LOCAL START$/ { skip = 1; next }
    /^# HESEM MANAGED LOCAL END$/ { skip = 0; next }
    skip == 0 { print }
  ' "$conf" > "$tmp"
  mv "$tmp" "$conf"

  cat >> "$conf" <<'CONF'
# HESEM MANAGED LOCAL START
[web]
    bind to = 127.0.0.1 ::1

[logs]
    access = off
# HESEM MANAGED LOCAL END
CONF
}

write_netdata_collector_config() {
  local conf="/etc/netdata/go.d.conf"
  local tmp
  local postgres_enabled="no"

  mkdir -p /etc/netdata/go.d
  touch "$conf"
  backup_file "$conf"

  if [ "$NETDATA_ENABLE_POSTGRES_COLLECTOR" = "1" ] && [ -n "$NETDATA_POSTGRES_DSN" ]; then
    postgres_enabled="yes"
    cat > /etc/netdata/go.d/postgres.conf <<EOF
jobs:
  - name: local
    dsn: ${NETDATA_POSTGRES_DSN}
EOF
  else
    rm -f /etc/netdata/go.d/postgres.conf
  fi

  tmp="$(mktemp)"
  awk '
    BEGIN { skip = 0 }
    /^# HESEM MANAGED GO START$/ { skip = 1; next }
    /^# HESEM MANAGED GO END$/ { skip = 0; next }
    skip == 0 { print }
  ' "$conf" > "$tmp"
  mv "$tmp" "$conf"

  cat >> "$conf" <<EOF
# HESEM MANAGED GO START
modules:
  postgres: ${postgres_enabled}
# HESEM MANAGED GO END
EOF

  if [ "$NETDATA_ENABLE_POSTGRES_COLLECTOR" = "1" ] && [ -z "$NETDATA_POSTGRES_DSN" ]; then
    echo "NETDATA_ENABLE_POSTGRES_COLLECTOR=1 was requested without NETDATA_POSTGRES_DSN; PostgreSQL collector remains disabled." >&2
  fi
}

install_grafana() {
  mkdir -p /etc/apt/keyrings
  if [ ! -f /etc/apt/keyrings/grafana.gpg ]; then
    wget -q -O - https://apt.grafana.com/gpg.key | gpg --dearmor > /etc/apt/keyrings/grafana.gpg
  fi
  cat > /etc/apt/sources.list.d/grafana.list <<'APT'
deb [signed-by=/etc/apt/keyrings/grafana.gpg] https://apt.grafana.com stable main
APT
  apt-get update -y
  apt-get install -y grafana
}

configure_grafana_proxy_auth() {
  mkdir -p /etc/systemd/system/grafana-server.service.d
  cat > /etc/systemd/system/grafana-server.service.d/hesem-auth-proxy.conf <<EOF
[Service]
Environment="GF_SERVER_DOMAIN=${DOMAIN}"
Environment="GF_SERVER_ROOT_URL=https://${DOMAIN}/ops/grafana/"
Environment="GF_SERVER_HTTP_ADDR=127.0.0.1"
Environment="GF_SERVER_HTTP_PORT=${GRAFANA_PORT}"
Environment="GF_SECURITY_ALLOW_EMBEDDING=true"
Environment="GF_SECURITY_COOKIE_SECURE=true"
Environment="GF_AUTH_BASIC_ENABLED=false"
Environment="GF_AUTH_DISABLE_LOGIN_FORM=true"
Environment="GF_USERS_ALLOW_SIGN_UP=false"
Environment="GF_USERS_AUTO_ASSIGN_ORG=true"
Environment="GF_USERS_AUTO_ASSIGN_ORG_ROLE=Viewer"
Environment="GF_AUTH_PROXY_ENABLED=true"
Environment="GF_AUTH_PROXY_HEADER_NAME=X-WEBAUTH-USER"
Environment="GF_AUTH_PROXY_HEADER_PROPERTY=username"
Environment="GF_AUTH_PROXY_AUTO_SIGN_UP=true"
Environment="GF_AUTH_PROXY_SYNC_TTL=15"
Environment="GF_AUTH_PROXY_WHITELIST=127.0.0.1"
Environment="GF_AUTH_PROXY_ENABLE_LOGIN_TOKEN=true"
EOF

  systemctl daemon-reload
  systemctl enable grafana-server
}

write_nginx_snippet() {
  mkdir -p /etc/nginx/snippets
  cat > "$NGINX_SNIPPET" <<'NGINX'
location = /_ops_auth/observability-netdata {
    internal;
    include fastcgi_params;
    fastcgi_param SCRIPT_FILENAME __PORTAL_DIR__/api.php;
    fastcgi_param SCRIPT_NAME /api.php;
    fastcgi_param QUERY_STRING action=vps_observability_auth&host_id=__HOST_ID__&panel_id=netdata;
    fastcgi_param REQUEST_METHOD GET;
    fastcgi_param CONTENT_TYPE "";
    fastcgi_param CONTENT_LENGTH "";
    fastcgi_param HTTP_COOKIE $http_cookie;
    fastcgi_param REMOTE_ADDR $remote_addr;
    fastcgi_pass unix:__PHP_SOCK__;
}

location = /_ops_auth/observability-grafana {
    internal;
    include fastcgi_params;
    fastcgi_param SCRIPT_FILENAME __PORTAL_DIR__/api.php;
    fastcgi_param SCRIPT_NAME /api.php;
    fastcgi_param QUERY_STRING action=vps_observability_auth&host_id=__HOST_ID__&panel_id=grafana;
    fastcgi_param REQUEST_METHOD GET;
    fastcgi_param CONTENT_TYPE "";
    fastcgi_param CONTENT_LENGTH "";
    fastcgi_param HTTP_COOKIE $http_cookie;
    fastcgi_param REMOTE_ADDR $remote_addr;
    fastcgi_pass unix:__PHP_SOCK__;
}

location = /ops/netdata {
    return 301 /ops/netdata/;
}

location ^~ /ops/netdata/ {
    auth_request /_ops_auth/observability-netdata;
    proxy_redirect off;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-Host $host;
    proxy_set_header X-Forwarded-Server $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_http_version 1.1;
    proxy_pass_request_headers on;
    proxy_set_header Connection "keep-alive";
    proxy_store off;
    rewrite ^/ops/netdata/(.*)$ /$1 break;
    proxy_pass http://127.0.0.1:__NETDATA_PORT__;
    gzip on;
    gzip_proxied any;
    gzip_types *;
}

location = /ops/grafana {
    return 301 /ops/grafana/;
}

location ^~ /ops/grafana/ {
    auth_request /_ops_auth/observability-grafana;
    auth_request_set $grafana_user $upstream_http_x_remote_user;
    proxy_set_header X-WEBAUTH-USER $grafana_user;
    proxy_set_header Authorization "";
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Host $host;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_read_timeout 86400;
    proxy_buffering off;
    rewrite ^/ops/grafana/(.*)$ /$1 break;
    proxy_pass http://127.0.0.1:__GRAFANA_PORT__;
}
NGINX

  sed -i "s|__PORTAL_DIR__|${PORTAL_DIR}|g" "$NGINX_SNIPPET"
  sed -i "s|__PHP_SOCK__|${PHP_SOCK}|g" "$NGINX_SNIPPET"
  sed -i "s|__HOST_ID__|${HOST_ID}|g" "$NGINX_SNIPPET"
  sed -i "s|__NETDATA_PORT__|${NETDATA_PORT}|g" "$NGINX_SNIPPET"
  sed -i "s|__GRAFANA_PORT__|${GRAFANA_PORT}|g" "$NGINX_SNIPPET"
}

remove_legacy_inline_observability_locations() {
  local site="$1"

  if ! grep -Eq '^[[:space:]]*location[[:space:]]*=[[:space:]]*/ops/grafana[[:space:]]*\{' "$site"; then
    if ! grep -Eq '^[[:space:]]*location[[:space:]]*\^~[[:space:]]*/ops/grafana/[[:space:]]*\{' "$site"; then
      return
    fi
  fi

  backup_file "$site"

  python3 - "$site" <<'PY'
from pathlib import Path
import re
import sys

site_path = Path(sys.argv[1])
content = site_path.read_text()
lines = content.splitlines(keepends=True)

start_patterns = (
    re.compile(r'^\s*location\s*=\s*/_ops_auth/observability-netdata\s*\{'),
    re.compile(r'^\s*location\s*=\s*/_ops_auth/observability-grafana\s*\{'),
    re.compile(r'^\s*location\s*=\s*/ops/netdata\s*\{'),
    re.compile(r'^\s*location\s+\^~\s*/ops/netdata/\s*\{'),
    re.compile(r'^\s*location\s*=\s*/ops/grafana\s*\{'),
    re.compile(r'^\s*location\s+\^~\s*/ops/grafana/\s*\{'),
)

result = []
skip_block = False
brace_depth = 0

for line in lines:
    if not skip_block and any(pattern.search(line) for pattern in start_patterns):
        skip_block = True
        brace_depth = line.count('{') - line.count('}')
        if brace_depth <= 0:
            skip_block = False
        continue

    if skip_block:
        brace_depth += line.count('{') - line.count('}')
        if brace_depth <= 0:
            skip_block = False
        continue

    result.append(line)

updated = ''.join(result)
updated = re.sub(r'\n{3,}', '\n\n', updated)
site_path.write_text(updated)
PY
}

reload_stack() {
  nginx -t
  systemctl restart netdata grafana-server
  systemctl reload nginx
}

print_summary() {
  cat <<SUMMARY

============================================
 HESEM Observability Stack Ready
============================================
 Domain:      ${DOMAIN}
 Netdata:     https://${DOMAIN}/ops/netdata/
 Grafana:     https://${DOMAIN}/ops/grafana/
 App Dir:     ${APP_DIR}
 Portal Dir:  ${PORTAL_DIR}
 Host ID:     ${HOST_ID}
 PHP Sock:    ${PHP_SOCK}
 Nginx Site:  ${NGINX_SITE}
 Services:    netdata, grafana-server
============================================

The stack is protected by:
  nginx auth_request -> api.php?action=vps_observability_auth

 Netdata PostgreSQL collector:
   enabled=${NETDATA_ENABLE_POSTGRES_COLLECTOR}
   dsn_supplied=$([ -n "${NETDATA_POSTGRES_DSN}" ] && echo yes || echo no)

SUMMARY
}

require_root
bootstrap_runtime_vars
validate_runtime
install_prereqs
install_netdata
write_netdata_local_config
write_netdata_collector_config
install_grafana
configure_grafana_proxy_auth
write_nginx_snippet
remove_legacy_inline_observability_locations "$NGINX_SITE"
ensure_nginx_include "$NGINX_SITE" "$NGINX_SNIPPET"
reload_stack
print_summary

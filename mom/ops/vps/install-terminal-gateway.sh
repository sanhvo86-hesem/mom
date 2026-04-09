#!/usr/bin/env bash
# ============================================================================
# HESEM MOM Portal — Terminal Gateway Installer
# ttyd + systemd + nginx auth_request + portal session auth
# ============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./runtime-detect.sh
. "${SCRIPT_DIR}/runtime-detect.sh"

DOMAIN="${DOMAIN:-}"
APP_DIR="${APP_DIR:-}"
PORTAL_DIR="${PORTAL_DIR:-}"
HOST_ID="${HOST_ID:-hesem-vps-01}"
PRIMARY_PORT="${PRIMARY_PORT:-7681}"
READONLY_PORT="${READONLY_PORT:-7682}"
PHP_SOCK="${PHP_SOCK:-}"
NGINX_SITE="${NGINX_SITE:-}"
NGINX_SNIPPET="/etc/nginx/snippets/hesem-terminal-gateway.conf"

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

arch_asset_name() {
  case "$(uname -m)" in
    x86_64|amd64) echo "ttyd.x86_64" ;;
    aarch64|arm64) echo "ttyd.aarch64" ;;
    armv7l) echo "ttyd.armhf" ;;
    armv6l) echo "ttyd.arm" ;;
    *)
      echo "Unsupported architecture: $(uname -m)" >&2
      exit 1
      ;;
  esac
}

install_packages() {
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -y
  apt-get install -y curl ca-certificates tmux
}

install_ttyd() {
  local api_url="https://api.github.com/repos/tsl0922/ttyd/releases/latest"
  local asset_name
  local release_json
  local asset_url
  local tmp_bin

  asset_name="$(arch_asset_name)"
  release_json="$(curl -fsSL "$api_url")"
  asset_url="$(printf '%s' "$release_json" | python3 -c 'import json,sys; asset_name=sys.argv[1]; payload=json.load(sys.stdin); print(next((a.get("browser_download_url", "") for a in payload.get("assets", []) if a.get("name")==asset_name), ""))' "$asset_name")"

  if [ -z "$asset_url" ]; then
    echo "Could not resolve latest ttyd release asset for ${asset_name}." >&2
    exit 1
  fi

  tmp_bin="$(mktemp)"
  curl -fsSL "$asset_url" -o "$tmp_bin"
  install -m 0755 "$tmp_bin" /usr/local/bin/ttyd
  rm -f "$tmp_bin"
  /usr/local/bin/ttyd --version || true
}

write_wrapper_scripts() {
  cat > /usr/local/bin/hesem-terminal-primary <<PRIMARY
#!/usr/bin/env bash
set -euo pipefail
export TERM="xterm-256color"
cd "${APP_DIR}" 2>/dev/null || cd /root
if command -v tmux >/dev/null 2>&1; then
  exec tmux new-session -A -s hesem-ops
fi
exec bash -l
PRIMARY

  cat > /usr/local/bin/hesem-terminal-readonly <<'READONLY'
#!/usr/bin/env bash
set -euo pipefail
export TERM="xterm-256color"
while true; do
  clear
  echo "HESEM readonly diagnostics"
  echo "Time: $(date -Is)"
  echo "Host: $(hostname)"
  echo
  echo "Services"
  systemctl is-active nginx php8.3-fpm postgresql redis-server 2>/dev/null || true
  echo
  echo "Disk"
  df -h / 2>/dev/null || true
  echo
  echo "Memory"
  free -m 2>/dev/null || true
  echo
  echo "Listen ports"
  (ss -ltnp 2>/dev/null || netstat -lnt 2>/dev/null || true) | head -n 20
  echo
  echo "Docker"
  docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' 2>/dev/null | head -n 20 || echo "docker_not_available"
  sleep 4
done
READONLY

  chmod 0755 /usr/local/bin/hesem-terminal-primary /usr/local/bin/hesem-terminal-readonly
}

write_systemd_units() {
  cat > /etc/systemd/system/hesem-ttyd-primary.service <<PRIMARY
[Unit]
Description=HESEM ttyd primary shell
After=network.target

[Service]
Type=simple
WorkingDirectory=${APP_DIR}
ExecStart=/usr/local/bin/ttyd -i 127.0.0.1 -p ${PRIMARY_PORT} -H X-Remote-User -W -O -b /ops/terminal/primary/ -t rendererType=webgl -t disableLeaveAlert=true /usr/local/bin/hesem-terminal-primary
Restart=always
RestartSec=2

[Install]
WantedBy=multi-user.target
PRIMARY

  cat > /etc/systemd/system/hesem-ttyd-readonly.service <<READONLY
[Unit]
Description=HESEM ttyd readonly diagnostics
After=network.target

[Service]
Type=simple
WorkingDirectory=${APP_DIR}
ExecStart=/usr/local/bin/ttyd -i 127.0.0.1 -p ${READONLY_PORT} -H X-Remote-User -O -b /ops/terminal/readonly/ -t rendererType=webgl -t disableLeaveAlert=true /usr/local/bin/hesem-terminal-readonly
Restart=always
RestartSec=2

[Install]
WantedBy=multi-user.target
READONLY

  systemctl daemon-reload
  systemctl enable --now hesem-ttyd-primary.service hesem-ttyd-readonly.service
}

write_nginx_snippet() {
  mkdir -p /etc/nginx/snippets
  cat > "$NGINX_SNIPPET" <<'NGINX'
location = /_ops_auth/terminal-primary {
    internal;
    include fastcgi_params;
    fastcgi_param SCRIPT_FILENAME __PORTAL_DIR__/api.php;
    fastcgi_param SCRIPT_NAME /api.php;
    fastcgi_param QUERY_STRING action=vps_terminal_auth&host_id=__HOST_ID__&terminal_id=primary;
    fastcgi_param REQUEST_METHOD GET;
    fastcgi_param CONTENT_TYPE "";
    fastcgi_param CONTENT_LENGTH "";
    fastcgi_param HTTP_COOKIE $http_cookie;
    fastcgi_param REMOTE_ADDR $remote_addr;
    fastcgi_pass unix:__PHP_SOCK__;
}

location = /_ops_auth/terminal-readonly {
    internal;
    include fastcgi_params;
    fastcgi_param SCRIPT_FILENAME __PORTAL_DIR__/api.php;
    fastcgi_param SCRIPT_NAME /api.php;
    fastcgi_param QUERY_STRING action=vps_terminal_auth&host_id=__HOST_ID__&terminal_id=readonly;
    fastcgi_param REQUEST_METHOD GET;
    fastcgi_param CONTENT_TYPE "";
    fastcgi_param CONTENT_LENGTH "";
    fastcgi_param HTTP_COOKIE $http_cookie;
    fastcgi_param REMOTE_ADDR $remote_addr;
    fastcgi_pass unix:__PHP_SOCK__;
}

location ^~ /ops/terminal/primary/ {
    auth_request /_ops_auth/terminal-primary;
    auth_request_set $ttyd_remote_user $upstream_http_x_remote_user;
    proxy_set_header X-Remote-User $ttyd_remote_user;
    proxy_set_header Authorization "";
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_read_timeout 86400;
    proxy_buffering off;
    proxy_pass http://127.0.0.1:__PRIMARY_PORT__;
}

location ^~ /ops/terminal/readonly/ {
    auth_request /_ops_auth/terminal-readonly;
    auth_request_set $ttyd_remote_user $upstream_http_x_remote_user;
    proxy_set_header X-Remote-User $ttyd_remote_user;
    proxy_set_header Authorization "";
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_read_timeout 86400;
    proxy_buffering off;
    proxy_pass http://127.0.0.1:__READONLY_PORT__;
}
NGINX

  sed -i "s|__PORTAL_DIR__|${PORTAL_DIR}|g" "$NGINX_SNIPPET"
  sed -i "s|__PHP_SOCK__|${PHP_SOCK}|g" "$NGINX_SNIPPET"
  sed -i "s|__HOST_ID__|${HOST_ID}|g" "$NGINX_SNIPPET"
  sed -i "s|__PRIMARY_PORT__|${PRIMARY_PORT}|g" "$NGINX_SNIPPET"
  sed -i "s|__READONLY_PORT__|${READONLY_PORT}|g" "$NGINX_SNIPPET"
}

reload_stack() {
  nginx -t
  systemctl reload nginx
  systemctl restart hesem-ttyd-primary.service hesem-ttyd-readonly.service
}

print_summary() {
  cat <<SUMMARY

============================================
 HESEM Terminal Gateway Ready
============================================
 Domain:      ${DOMAIN}
 Primary:     https://${DOMAIN}/ops/terminal/primary/
 Readonly:    https://${DOMAIN}/ops/terminal/readonly/
 App Dir:     ${APP_DIR}
 Portal Dir:  ${PORTAL_DIR}
 Host ID:     ${HOST_ID}
 PHP Sock:    ${PHP_SOCK}
 Nginx Site:  ${NGINX_SITE}
 Services:    hesem-ttyd-primary, hesem-ttyd-readonly
============================================

The gateway trusts portal session auth through:
  nginx auth_request -> api.php?action=vps_terminal_auth -> ttyd X-Remote-User

SUMMARY
}

require_root
bootstrap_runtime_vars
validate_runtime
install_packages
install_ttyd
write_wrapper_scripts
write_systemd_units
write_nginx_snippet
ensure_nginx_include "$NGINX_SITE" "$NGINX_SNIPPET"
reload_stack
print_summary

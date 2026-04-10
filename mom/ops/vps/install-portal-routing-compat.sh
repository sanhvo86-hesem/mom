#!/usr/bin/env bash
# ============================================================================
# HESEM MOM Portal — Nginx routing compatibility installer
# Adds REST /api/... routing for legacy site layouts rooted above /mom
# ============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=./runtime-detect.sh
. "${SCRIPT_DIR}/runtime-detect.sh"

APP_DIR="${APP_DIR:-}"
PORTAL_DIR="${PORTAL_DIR:-}"
NGINX_SITE="${NGINX_SITE:-}"
NGINX_SNIPPET="/etc/nginx/snippets/hesem-portal-routing-compat.conf"
QMS_DATA_DIR_VALUE=""

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
  QMS_DATA_DIR_VALUE="${PORTAL_DIR}/data"
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

  if [ ! -f "${PORTAL_DIR}/api/index.php" ]; then
    echo "Resolved PORTAL_DIR does not contain api/index.php: ${PORTAL_DIR}" >&2
    exit 1
  fi

  if [ ! -f "$NGINX_SITE" ]; then
    echo "Resolved NGINX_SITE does not exist: $NGINX_SITE" >&2
    exit 1
  fi
}

write_nginx_snippet() {
  mkdir -p /etc/nginx/snippets
  cat > "$NGINX_SNIPPET" <<'NGINX'
location = / {
    return 302 /mom/portal.html;
}

location = /portal.html {
    return 302 /mom/portal.html;
}

location = /manifest.json {
    return 302 /mom/manifest.json;
}

location = /favicon.ico {
    return 302 /mom/favicon.ico;
}

location = /apple-touch-icon.png {
    return 302 /mom/assets/icons/icon-192x192.png;
}

location ~ ^/assets/icons/(.+)$ {
    return 302 /mom/assets/icons/$1;
}

location ~ ^/(?:\./)+assets/icons/(.+)$ {
    return 302 /mom/assets/icons/$1;
}

location = /mom/portal.html/ {
    return 302 /mom/portal.html;
}

location ~ ^/mom/portal\.html/(.+)$ {
    return 302 /mom/$1;
}

location = /api {
    return 301 /api/;
}

location ^~ /api/ {
    try_files $uri /mom/api/index.php$is_args$args;
}

location = /status {
    stub_status;
    allow 127.0.0.1;
    allow ::1;
    deny all;
}

location = /stub_status {
    stub_status;
    allow 127.0.0.1;
    allow ::1;
    deny all;
}

location = /basic_status {
    stub_status;
    allow 127.0.0.1;
    allow ::1;
    deny all;
}
NGINX
}

ensure_http_probe_routes() {
  python3 - "$NGINX_SITE" <<'PY'
from pathlib import Path
import re
import sys

site_path = Path(sys.argv[1])
content = site_path.read_text()

server_match = re.search(r"server\s*\{", content)
if not server_match:
    raise SystemExit(f"Could not locate an HTTP server block in {site_path}")

start = server_match.start()
depth = 0
end = None
for idx in range(start, len(content)):
    char = content[idx]
    if char == "{":
        depth += 1
    elif char == "}":
        depth -= 1
        if depth == 0:
            end = idx + 1
            break

if end is None:
    raise SystemExit(f"Could not determine end of the first server block in {site_path}")

block = content[start:end]
if "listen 80;" not in block:
    raise SystemExit(f"First server block in {site_path} is not the port-80 server")

if "location = /status {" in block and "location / {" in block:
    raise SystemExit(0)

pattern = re.compile(
    r"(?P<indent>^[ \t]*)server_name[ \t]+(?P<server>[^;]+);\n(?P=indent)return 301 https://\$server_name\$request_uri;\n",
    re.MULTILINE,
)
match = pattern.search(block)
if not match:
    raise SystemExit(f"Could not rewrite the port-80 redirect block in {site_path}")

indent = match.group("indent")
server_name = match.group("server").strip()
replacement = (
    f"{indent}server_name {server_name};\n\n"
    f"{indent}location = /status {{\n"
    f"{indent}    stub_status;\n"
    f"{indent}    allow 127.0.0.1;\n"
    f"{indent}    allow ::1;\n"
    f"{indent}    deny all;\n"
    f"{indent}}}\n\n"
    f"{indent}location = /stub_status {{\n"
    f"{indent}    stub_status;\n"
    f"{indent}    allow 127.0.0.1;\n"
    f"{indent}    allow ::1;\n"
    f"{indent}    deny all;\n"
    f"{indent}}}\n\n"
    f"{indent}location = /basic_status {{\n"
    f"{indent}    stub_status;\n"
    f"{indent}    allow 127.0.0.1;\n"
    f"{indent}    allow ::1;\n"
    f"{indent}    deny all;\n"
    f"{indent}}}\n\n"
    f"{indent}location = /nginx_status {{\n"
    f"{indent}    stub_status;\n"
    f"{indent}    allow 127.0.0.1;\n"
    f"{indent}    allow ::1;\n"
    f"{indent}    deny all;\n"
    f"{indent}}}\n\n"
    f"{indent}location / {{\n"
    f"{indent}    return 301 https://$server_name$request_uri;\n"
    f"{indent}}}\n"
)

block = block[:match.start()] + replacement + block[match.end():]
content = content[:start] + block + content[end:]
site_path.write_text(content)
PY
}

ensure_runtime_env_binding() {
  ensure_fastcgi_param_in_php_location "$NGINX_SITE" "QMS_DATA_DIR" "$QMS_DATA_DIR_VALUE"
}

reload_nginx() {
  nginx -t
  systemctl reload nginx
}

print_summary() {
  cat <<SUMMARY

============================================
 HESEM Portal Routing Compatibility Ready
============================================
 App Dir:     ${APP_DIR}
 Portal Dir:  ${PORTAL_DIR}
 Nginx Site:  ${NGINX_SITE}
 Snippet:     ${NGINX_SNIPPET}
 Root Shell:  / -> /mom/portal.html
 PWA Assets:  /manifest.json, /assets/icons/*, /favicon.ico
 REST API:    /api/...
 Nginx Probe: /status, /stub_status, /basic_status (localhost only)
============================================

SUMMARY
}

require_root
bootstrap_runtime_vars
validate_runtime
write_nginx_snippet
ensure_http_probe_routes
ensure_nginx_include "$NGINX_SITE" "$NGINX_SNIPPET"
ensure_runtime_env_binding
reload_nginx
print_summary

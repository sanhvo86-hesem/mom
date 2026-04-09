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
location = /api {
    return 301 /api/;
}

location ^~ /api/ {
    try_files $uri /mom/api/index.php$is_args$args;
}
NGINX
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
 REST API:    /api/...
============================================

SUMMARY
}

require_root
bootstrap_runtime_vars
validate_runtime
write_nginx_snippet
ensure_nginx_include "$NGINX_SITE" "$NGINX_SNIPPET"
reload_nginx
print_summary

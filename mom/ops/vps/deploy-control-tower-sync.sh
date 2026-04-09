#!/usr/bin/env bash
# ============================================================================
# HESEM MOM Portal — Deploy local VPS Control Tower changes to a remote VPS
# Sync the current local repo state, then install terminal + observability.
# ============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"

TARGET="${TARGET:-root@103.110.87.55}"
DEFAULT_APP_DIR="/var/www/hesem-mom"
APP_DIR="${APP_DIR:-}"
SSH_OPTS="${SSH_OPTS:- -oStrictHostKeyChecking=yes -oConnectTimeout=8}"
RSYNC_RSH="${RSYNC_RSH:-ssh${SSH_OPTS}}"
RUN_TERMINAL_INSTALL="${RUN_TERMINAL_INSTALL:-1}"
RUN_OBSERVABILITY_INSTALL="${RUN_OBSERVABILITY_INSTALL:-1}"
RUN_ROUTING_COMPAT_INSTALL="${RUN_ROUTING_COMPAT_INSTALL:-1}"
RUN_REMOTE_SMOKE="${RUN_REMOTE_SMOKE:-1}"
APP_OWNER_GROUP="${APP_OWNER_GROUP:-}"
APP_DATA_OWNER_GROUP="${APP_DATA_OWNER_GROUP:-}"
REMOTE_SUDO="${REMOTE_SUDO:-}"
DOMAIN="${DOMAIN:-}"

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

run_ssh() {
  # shellcheck disable=SC2086
  ssh ${SSH_OPTS} "$TARGET" "$@"
}

run_remote_cmd() {
  local cmd="$1"
  if [ -n "${REMOTE_SUDO:-}" ]; then
    run_ssh "${REMOTE_SUDO} bash -lc $(printf '%q' "$cmd")"
    return
  fi

  run_ssh "$cmd"
}

detect_remote_app_dir() {
  if [ -n "${APP_DIR:-}" ]; then
    return
  fi

  local detected
  detected="$(
    run_ssh "bash -s" <<'REMOTE'
set -euo pipefail

trim_root_to_app_dir() {
  local root_path="$1"
  root_path="${root_path%/}"
  if [ -f "${root_path}/api.php" ] && [ -f "${root_path}/portal.html" ]; then
    printf '%s\n' "$(dirname "$root_path")"
    return 0
  fi
  if [ -f "${root_path}/mom/api.php" ]; then
    printf '%s\n' "$root_path"
    return 0
  fi
  return 1
}

for candidate in \
  /var/www/eqms.hesemeng.com \
  /var/www/hesem-mom \
  /var/www/qms.hesem.com.vn \
  /srv/hesem-mom \
  /srv/qms.hesem.com.vn
do
  if [ -f "${candidate}/mom/api.php" ]; then
    printf '%s\n' "$candidate"
    exit 0
  fi
done

for site_dir in /etc/nginx/sites-enabled /etc/nginx/sites-available /etc/nginx/conf.d; do
  [ -d "$site_dir" ] || continue
  while IFS= read -r root_path; do
    [ -n "$root_path" ] || continue
    if trim_root_to_app_dir "$root_path"; then
      exit 0
    fi
  done < <(sed -n 's/^[[:space:]]*root[[:space:]]\+\([^;]*\);/\1/p' "$site_dir"/* 2>/dev/null)
done

printf '%s\n' ""
REMOTE
  )"

  if [ -n "$detected" ]; then
    APP_DIR="$detected"
    return
  fi

  APP_DIR="$DEFAULT_APP_DIR"
}

detect_remote_owner_group() {
  if [ -n "${APP_OWNER_GROUP:-}" ]; then
    return
  fi

  local detected
  detected="$(run_ssh "if [ -e '${APP_DIR}' ]; then stat -c '%U:%G' '${APP_DIR}' 2>/dev/null || true; fi")"
  if [ -n "$detected" ]; then
    APP_OWNER_GROUP="$detected"
    return
  fi

  APP_OWNER_GROUP="www-data:www-data"
}

detect_remote_data_owner_group() {
  if [ -n "${APP_DATA_OWNER_GROUP:-}" ]; then
    return
  fi

  local detected
  detected="$(
    run_ssh "bash -s" <<'REMOTE'
set -euo pipefail

for conf in /etc/php/*/fpm/pool.d/mom.conf /etc/php/*/fpm/pool.d/*.conf; do
  [ -f "$conf" ] || continue
  user="$(sed -n 's/^[[:space:]]*user[[:space:]]*=[[:space:]]*//p' "$conf" | head -n 1 || true)"
  group="$(sed -n 's/^[[:space:]]*group[[:space:]]*=[[:space:]]*//p' "$conf" | head -n 1 || true)"
  if [ -n "$user" ] && [ -n "$group" ]; then
    printf '%s:%s\n' "$user" "$group"
    exit 0
  fi
done

for sock in /run/php/php*-hesem.sock /run/php/php*-fpm.sock /var/run/php/php*-fpm.sock; do
  if [ -S "$sock" ]; then
    stat -c '%U:%G' "$sock" 2>/dev/null || true
    exit 0
  fi
done

printf '%s\n' "www-data:www-data"
REMOTE
  )"

  if [ -n "$detected" ]; then
    APP_DATA_OWNER_GROUP="$detected"
    return
  fi

  APP_DATA_OWNER_GROUP="www-data:www-data"
}

detect_remote_domain() {
  if [ -n "${DOMAIN:-}" ]; then
    return
  fi

  local detected
  detected="$(
    run_ssh "bash -s" <<'REMOTE'
set -euo pipefail
for site_dir in /etc/nginx/sites-enabled /etc/nginx/sites-available /etc/nginx/conf.d; do
  [ -d "$site_dir" ] || continue
  domain="$(sed -n 's/^[[:space:]]*server_name[[:space:]]\+\([^ ;]*\).*/\1/p' "$site_dir"/* 2>/dev/null | grep -v '^_$' | head -n 1 || true)"
  if [ -n "$domain" ]; then
    printf '%s\n' "$domain"
    exit 0
  fi
done
printf '%s\n' "eqms.hesemeng.com"
REMOTE
  )"

  if [ -n "$detected" ]; then
    DOMAIN="$detected"
    return
  fi

  DOMAIN="eqms.hesemeng.com"
}

sync_repo() {
  echo "==> Sync local repo to ${TARGET}:${APP_DIR}"
  run_remote_cmd "mkdir -p '${APP_DIR}'"
  local rsync_path="rsync"
  if [ -n "${REMOTE_SUDO:-}" ]; then
    rsync_path="${REMOTE_SUDO} rsync"
  fi
  RSYNC_RSH="$RSYNC_RSH" rsync -az --delete \
    --rsync-path="$rsync_path" \
    --exclude '.git/' \
    --exclude '.DS_Store' \
    --exclude '.claude/' \
    --exclude '_reports/' \
    --exclude 'mom/data/php_error.log' \
    --exclude 'mom/data/sessions/' \
    --exclude 'mom/data/scan_cache.json' \
    --exclude 'mom/data/*.sqlite' \
    --exclude 'mom/ops/local-runtime/.php-server.pid' \
    --exclude 'mom/ops/local-runtime/.php-server.log' \
    "${REPO_ROOT}/" "${TARGET}:${APP_DIR}/"
}

fix_permissions() {
  echo "==> Fix remote permissions"
  run_remote_cmd "owner_group='${APP_DATA_OWNER_GROUP}'; owner=\${owner_group%%:*}; group=\${owner_group##*:}; mkdir -p '${APP_DIR}/mom/data' '${APP_DIR}/mom/data/sessions' '${APP_DIR}/mom/data/ratelimit'; touch '${APP_DIR}/mom/data/php_error.log'; chown -R \"\${owner}:\${group}\" '${APP_DIR}/mom/data'; find '${APP_DIR}/mom/data' -type d -exec chmod 775 {} +; find '${APP_DIR}/mom/data' -type f -exec chmod 664 {} +; chown -R \"\${owner}:\${group}\" '${APP_DIR}/mom/data/sessions' '${APP_DIR}/mom/data/ratelimit' '${APP_DIR}/mom/data/php_error.log'; find '${APP_DIR}/mom/data/sessions' -type f -exec chmod 660 {} +; chmod 2770 '${APP_DIR}/mom/data/sessions'; chmod 2775 '${APP_DIR}/mom/data/ratelimit'; chmod 664 '${APP_DIR}/mom/data/php_error.log'"
}

run_installers() {
  if [ "$RUN_ROUTING_COMPAT_INSTALL" = "1" ]; then
    echo "==> Install portal routing compatibility"
    run_remote_cmd "cd '${APP_DIR}' && bash 'mom/ops/vps/install-portal-routing-compat.sh'"
  fi

  if [ "$RUN_TERMINAL_INSTALL" = "1" ]; then
    echo "==> Install terminal gateway"
    run_remote_cmd "cd '${APP_DIR}' && bash 'mom/ops/vps/install-terminal-gateway.sh'"
  fi

  if [ "$RUN_OBSERVABILITY_INSTALL" = "1" ]; then
    echo "==> Install observability stack"
    run_remote_cmd "cd '${APP_DIR}' && bash 'mom/ops/vps/install-observability-stack.sh'"
  fi
}

reload_runtime() {
  echo "==> Reload runtime"
  run_remote_cmd "set -e; nginx -t >/dev/null; systemctl reload nginx; php_fpm_service=\$(systemctl list-units --type=service --all 'php*-fpm.service' --no-legend 2>/dev/null | awk '{print \$1}' | head -n 1 || true); if [ -n \"\$php_fpm_service\" ]; then systemctl reload \"\$php_fpm_service\"; fi"
}

remote_smoke() {
  if [ "$RUN_REMOTE_SMOKE" != "1" ]; then
    return
  fi

  echo "==> Remote smoke checks"
  run_remote_cmd "set -e; nginx -t >/dev/null; systemctl is-active nginx >/dev/null; php_fpm_service=\$(systemctl list-units --type=service --all 'php*-fpm.service' --no-legend 2>/dev/null | awk '{print \$1}' | head -n 1 || true); if [ -n \"\$php_fpm_service\" ]; then systemctl is-active \"\$php_fpm_service\" >/dev/null; fi; for unit in postgresql redis-server; do if systemctl list-unit-files \"\$unit.service\" >/dev/null 2>&1; then systemctl is-active \"\$unit\" >/dev/null; fi; done; systemctl is-active hesem-ttyd-primary hesem-ttyd-readonly >/dev/null || true; systemctl is-active netdata grafana-server >/dev/null || true; code7681=\$(curl -s -o /dev/null -w '%{http_code}' 'http://127.0.0.1:7681' || true); code7682=\$(curl -s -o /dev/null -w '%{http_code}' 'http://127.0.0.1:7682' || true); [ \"\$code7681\" = '200' ] || [ \"\$code7681\" = '401' ] || [ \"\$code7681\" = '407' ] || true; [ \"\$code7682\" = '200' ] || [ \"\$code7682\" = '401' ] || [ \"\$code7682\" = '407' ] || true; curl -fsS 'http://127.0.0.1:19999/api/v1/info' >/dev/null || true; curl -fsS 'http://127.0.0.1:3000/api/health' >/dev/null || true; cookie_jar=\$(mktemp); auth_json=\$(curl -kfsS --resolve '${DOMAIN}:443:127.0.0.1' -c \"\$cookie_jar\" -b \"\$cookie_jar\" 'https://${DOMAIN}/mom/api.php?action=auth_status'); csrf=\$(printf '%s' \"\$auth_json\" | php -r '\$d=json_decode(stream_get_contents(STDIN), true); echo (string)(\$d[\"csrf_token\"] ?? \"\");'); [ -n \"\$csrf\" ]; login_body=\$(mktemp); login_code=\$(curl -ksS -o \"\$login_body\" -w '%{http_code}' --resolve '${DOMAIN}:443:127.0.0.1' -c \"\$cookie_jar\" -b \"\$cookie_jar\" -X POST 'https://${DOMAIN}/mom/api.php?action=auth_login' -H 'Origin: https://${DOMAIN}' -H \"X-CSRF-Token: \$csrf\" -H 'Content-Type: application/x-www-form-urlencoded' --data 'username=invalid&password=invalid'); [ \"\$login_code\" = '401' ]; grep -q 'invalid_credentials' \"\$login_body\"; rm -f \"\$cookie_jar\" \"\$login_body\"; echo 'remote_smoke_ok'"
}

print_summary() {
  cat <<SUMMARY

============================================
 HESEM Control Tower Sync Deploy Complete
============================================
 Target:      ${TARGET}
 App Dir:     ${APP_DIR}
 Routing:     $( [ "$RUN_ROUTING_COMPAT_INSTALL" = "1" ] && echo installed || echo skipped )
 Terminal:    $( [ "$RUN_TERMINAL_INSTALL" = "1" ] && echo installed || echo skipped )
 Observe:     $( [ "$RUN_OBSERVABILITY_INSTALL" = "1" ] && echo installed || echo skipped )
 Smoke:       $( [ "$RUN_REMOTE_SMOKE" = "1" ] && echo executed || echo skipped )
============================================

Expected URLs:
  https://${DOMAIN}/ops/terminal/primary/
  https://${DOMAIN}/ops/terminal/readonly/
  https://${DOMAIN}/ops/netdata/
  https://${DOMAIN}/ops/grafana/

SUMMARY
}

require_cmd ssh
require_cmd rsync
require_cmd curl

detect_remote_app_dir
detect_remote_owner_group
detect_remote_data_owner_group
detect_remote_domain
sync_repo
fix_permissions
run_installers
fix_permissions
reload_runtime
remote_smoke
print_summary

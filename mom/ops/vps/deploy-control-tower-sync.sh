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
RUN_DB_MIGRATIONS="${RUN_DB_MIGRATIONS:-1}"
RUN_DB_SCHEMA_SMOKE="${RUN_DB_SCHEMA_SMOKE:-1}"
RUN_REMOTE_SMOKE="${RUN_REMOTE_SMOKE:-1}"
PRESERVE_RUNTIME_CONFIG="${PRESERVE_RUNTIME_CONFIG:-1}"
SYNC_RUNTIME_DOCS="${SYNC_RUNTIME_DOCS:-0}"
APP_OWNER_GROUP="${APP_OWNER_GROUP:-}"
APP_DATA_OWNER_GROUP="${APP_DATA_OWNER_GROUP:-}"
REMOTE_SUDO="${REMOTE_SUDO:-}"
DOMAIN="${DOMAIN:-}"

# shellcheck source=../../../tools/vps-setup/scripts/_runtime-files.sh
source "${REPO_ROOT}/tools/vps-setup/scripts/_runtime-files.sh"

RUNTIME_CONFIG_EXCLUDES=()
for runtime_config_file in "${RUNTIME_CONFIG_FILES[@]}"; do
  RUNTIME_CONFIG_EXCLUDES+=("mom/data/config/${runtime_config_file}")
done

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
  local excludes=(
    --exclude '.git'
    --exclude '.git/'
    --exclude '.DS_Store'
    --exclude '.claude/'
    --exclude '_reports/'
    --exclude 'mom/data/php_error.log'
    --exclude 'mom/data/sessions/'
    --exclude 'mom/data/ratelimit/'
    --exclude 'mom/data/cache/'
    --exclude 'mom/data/scan_cache.json'
    --exclude 'mom/data/*.sqlite'
    --exclude 'mom/ops/local-runtime/.php-server.pid'
    --exclude 'mom/ops/local-runtime/.php-server.log'
  )
  if [ -n "${REMOTE_SUDO:-}" ]; then
    rsync_path="${REMOTE_SUDO} rsync"
  fi

  if [ "$PRESERVE_RUNTIME_CONFIG" = "1" ]; then
    echo "==> Preserve remote runtime config during rsync"
    local config_file
    for config_file in "${RUNTIME_CONFIG_EXCLUDES[@]}"; do
      excludes+=(--exclude "$config_file")
    done
  fi

  if [ "$SYNC_RUNTIME_DOCS" != "1" ]; then
    echo "==> Preserve remote document corpus during rsync (set SYNC_RUNTIME_DOCS=1 to intentionally publish repo docs)"
    excludes+=(--exclude 'mom/docs/***' --exclude 'archive/***')
  fi

  RSYNC_RSH="$RSYNC_RSH" rsync -az --delete \
    --rsync-path="$rsync_path" \
    "${excludes[@]}" \
    "${REPO_ROOT}/" "${TARGET}:${APP_DIR}/"
}

fix_permissions() {
  echo "==> Fix remote permissions"
  run_remote_cmd "set -e; app='${APP_DIR}'; data_dir=\"\${app}/mom/data\"; docs_dir=\"\${app}/mom/docs\"; owner_group='${APP_DATA_OWNER_GROUP}'; owner=\${owner_group%%:*}; group=\${owner_group##*:}; find \"\${app}\" -path \"\${data_dir}\" -prune -o -type d -exec chmod u+rwx,go+rx {} +; find \"\${app}\" -path \"\${data_dir}\" -prune -o -type f -exec chmod u+rw,go+r {} +; mkdir -p \"\${data_dir}\" \"\${data_dir}/sessions\" \"\${data_dir}/ratelimit\"; touch \"\${data_dir}/php_error.log\"; chown -R \"\${owner}:\${group}\" \"\${data_dir}\"; find \"\${data_dir}\" -type d -exec chmod 775 {} +; find \"\${data_dir}\" -type f -exec chmod 664 {} +; chown -R \"\${owner}:\${group}\" \"\${data_dir}/sessions\" \"\${data_dir}/ratelimit\" \"\${data_dir}/php_error.log\"; for runtime_dir in sessions ratelimit; do find \"\${data_dir}/\${runtime_dir}\" -type d -exec chmod 2770 {} +; find \"\${data_dir}/\${runtime_dir}\" -type f -exec chmod 660 {} +; done; chmod 664 \"\${data_dir}/php_error.log\"; if [ -d \"\${docs_dir}\" ]; then chown -R \"\${owner}:\${group}\" \"\${docs_dir}\"; find \"\${docs_dir}\" -type d -exec chmod 775 {} +; find \"\${docs_dir}\" -type f -exec chmod 664 {} +; fi; if [ -d \"\${app}/.git\" ] && command -v git >/dev/null 2>&1; then (cd \"\${app}\" && git ls-files -s | awk '\$1 == \"100755\" {print \$4}' | while IFS= read -r tracked; do [ -f \"\$tracked\" ] && chmod 755 \"\$tracked\"; done); fi"
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

run_db_migrations() {
  if [ "$RUN_DB_MIGRATIONS" != "1" ]; then
    echo "==> DB migrations skipped"
    return
  fi

  echo "==> Run DB migrations and Data Schema live-DB smoke"
  run_remote_cmd "cd '${APP_DIR}' && RUN_DB_MIGRATIONS='${RUN_DB_MIGRATIONS}' RUN_DB_SCHEMA_SMOKE='${RUN_DB_SCHEMA_SMOKE}' bash 'mom/ops/vps/run-db-migrations.sh'"
}

reload_runtime() {
  echo "==> Reload runtime"
  run_remote_cmd "set -e; nginx -t >/dev/null; systemctl reload nginx; php_fpm_service=\$(systemctl list-units --type=service --all 'php*-fpm.service' --no-legend 2>/dev/null | awk '{print \$1}' | head -n 1 || true); if [ -n \"\$php_fpm_service\" ]; then systemctl reload \"\$php_fpm_service\"; fi"
}

# Re-apply DCC header standardisation after every deploy. The rsync step above
# brings local doc HTML files (which are ALWAYS in pre-DCC form because the
# repo's source-of-truth docs are authored without the runtime injection)
# onto the VPS, clobbering the in-place migration. Running migrate.php here
# is idempotent and restores the canonical DCC ribbon for every controlled
# document in <1s per file. The DB password comes from PHP-FPM's pool env.
run_dcc_batch_migrate() {
  if [ "${RUN_DCC_BATCH:-1}" != "1" ]; then
    echo "==> Skipping DCC batch migrate (RUN_DCC_BATCH=0)"
    return
  fi
  echo "==> Re-apply DCC header standardisation across mom/docs/**"
  run_remote_cmd "set -e; cd '${APP_DIR}'; \
    DB_PASS=\$(grep -h '^env\\\\[DB_PASS\\\\]' /etc/php/*/fpm/pool.d/*.conf 2>/dev/null | head -n1 | sed -E 's/.*=\\\\s*//') ; \
    if [ -z \"\$DB_PASS\" ]; then echo '[dcc-batch] DB_PASS env not found in PHP-FPM pool, skipping' >&2; exit 0; fi; \
    DB_PASS=\"\$DB_PASS\" php mom/tools/dcc-batch/migrate.php 2>&1 | tail -15"
}

remote_smoke() {
  if [ "$RUN_REMOTE_SMOKE" != "1" ]; then
    return
  fi

  echo "==> Remote smoke checks"
  run_remote_cmd "set -e; nginx -t >/dev/null; systemctl is-active nginx >/dev/null; php_fpm_service=\$(systemctl list-units --type=service --all 'php*-fpm.service' --no-legend 2>/dev/null | awk '{print \$1}' | head -n 1 || true); if [ -n \"\$php_fpm_service\" ]; then systemctl is-active \"\$php_fpm_service\" >/dev/null; fi; for unit in postgresql redis-server; do if systemctl list-unit-files \"\$unit.service\" >/dev/null 2>&1; then systemctl is-active \"\$unit\" >/dev/null; fi; done; systemctl is-active hesem-ttyd-primary hesem-ttyd-readonly >/dev/null || true; systemctl is-active netdata grafana-server >/dev/null || true; code7681=\$(curl -s -o /dev/null -w '%{http_code}' 'http://127.0.0.1:7681' || true); code7682=\$(curl -s -o /dev/null -w '%{http_code}' 'http://127.0.0.1:7682' || true); [ \"\$code7681\" = '200' ] || [ \"\$code7681\" = '401' ] || [ \"\$code7681\" = '407' ] || true; [ \"\$code7682\" = '200' ] || [ \"\$code7682\" = '401' ] || [ \"\$code7682\" = '407' ] || true; curl -fsS 'http://127.0.0.1:19999/api/v1/info' >/dev/null || true; curl -fsS 'http://127.0.0.1:3000/api/health' >/dev/null || true; for probe in status stub_status basic_status; do curl -fsS \"http://127.0.0.1/\$probe\" >/dev/null; done; root_code=\$(curl -ksS -o /dev/null -w '%{http_code}' --resolve '${DOMAIN}:443:127.0.0.1' 'https://${DOMAIN}/'); [ \"\$root_code\" = '302' ] || [ \"\$root_code\" = '200' ]; portal_code=\$(curl -ksS -o /dev/null -w '%{http_code}' --resolve '${DOMAIN}:443:127.0.0.1' 'https://${DOMAIN}/portal.html'); [ \"\$portal_code\" = '302' ] || [ \"\$portal_code\" = '200' ]; icon_code=\$(curl -ksS -o /dev/null -w '%{http_code}' --resolve '${DOMAIN}:443:127.0.0.1' 'https://${DOMAIN}/assets/icons/icon-192x192.png'); [ \"\$icon_code\" = '200' ] || [ \"\$icon_code\" = '302' ]; cookie_jar=\$(mktemp); auth_json=\$(curl -kfsS --resolve '${DOMAIN}:443:127.0.0.1' -c \"\$cookie_jar\" -b \"\$cookie_jar\" 'https://${DOMAIN}/mom/api.php?action=auth_status'); csrf=\$(printf '%s' \"\$auth_json\" | php -r '\$d=json_decode(stream_get_contents(STDIN), true); echo (string)(\$d[\"csrf_token\"] ?? \"\");'); [ -n \"\$csrf\" ]; login_body=\$(mktemp); login_code=\$(curl -ksS -o \"\$login_body\" -w '%{http_code}' --resolve '${DOMAIN}:443:127.0.0.1' -c \"\$cookie_jar\" -b \"\$cookie_jar\" -X POST 'https://${DOMAIN}/mom/api.php?action=auth_login' -H 'Origin: https://${DOMAIN}' -H \"X-CSRF-Token: \$csrf\" -H 'Content-Type: application/x-www-form-urlencoded' --data 'username=invalid&password=invalid'); [ \"\$login_code\" = '401' ]; grep -q 'invalid_credentials' \"\$login_body\"; rm -f \"\$cookie_jar\" \"\$login_body\"; echo 'remote_smoke_ok'"
}

print_summary() {
  cat <<SUMMARY

============================================
 HESEM Control Tower Sync Deploy Complete
============================================
 Target:      ${TARGET}
 App Dir:     ${APP_DIR}
 Routing:     $( [ "$RUN_ROUTING_COMPAT_INSTALL" = "1" ] && echo installed || echo skipped )
 DB Migrate:  $( [ "$RUN_DB_MIGRATIONS" = "1" ] && echo executed || echo skipped )
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
run_db_migrations
run_installers
fix_permissions
reload_runtime
run_dcc_batch_migrate
remote_smoke
print_summary

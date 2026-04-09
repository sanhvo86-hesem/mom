#!/usr/bin/env bash
set -euo pipefail

search_nginx_site() {
  local needle="$1"
  shift || true

  if [ -z "$needle" ]; then
    return
  fi

  grep -RslF -- "$needle" "$@" 2>/dev/null | head -n 1 || true
}

resolve_app_dir() {
  if [ -n "${APP_DIR:-}" ] && [ -d "${APP_DIR:-}" ]; then
    printf '%s\n' "$APP_DIR"
    return
  fi

  local candidate

  if [ -n "${SCRIPT_DIR:-}" ]; then
    candidate="$(cd "${SCRIPT_DIR}/../../.." 2>/dev/null && pwd || true)"
    if [ -n "$candidate" ] && [ -f "${candidate}/mom/api.php" ]; then
      printf '%s\n' "$candidate"
      return
    fi
  fi

  if [ -f "/var/www/hesem-mom/mom/api.php" ]; then
    printf '%s\n' "/var/www/hesem-mom"
    return
  fi

  if [ -f "/var/www/eqms.hesemeng.com/mom/api.php" ]; then
    printf '%s\n' "/var/www/eqms.hesemeng.com"
    return
  fi

  if [ -f "/var/www/qms.hesem.com.vn/mom/api.php" ]; then
    printf '%s\n' "/var/www/qms.hesem.com.vn"
    return
  fi

  if [ -f "$(pwd)/mom/api.php" ]; then
    printf '%s\n' "$(pwd)"
    return
  fi

  if [ -f "$(pwd)/api.php" ] && [ -f "$(pwd)/portal.html" ]; then
    printf '%s\n' "$(dirname "$(pwd)")"
    return
  fi

  local site
  local root_path
  site="$(resolve_nginx_site)"
  root_path="$(sed -n 's/^[[:space:]]*root[[:space:]]\+\([^;]*\).*/\1/p' "$site" | head -n 1 || true)"
  root_path="${root_path%/}"
  if [ -n "$root_path" ] && [ -f "${root_path}/api.php" ] && [ -f "${root_path}/portal.html" ]; then
    printf '%s\n' "$(dirname "$root_path")"
    return
  fi

  if [ -n "$root_path" ] && [ -f "${root_path}/mom/api.php" ]; then
    printf '%s\n' "$root_path"
    return
  fi

  printf '%s\n' "/var/www/hesem-mom"
}

resolve_portal_dir() {
  if [ -n "${PORTAL_DIR:-}" ] && [ -d "${PORTAL_DIR:-}" ]; then
    printf '%s\n' "$PORTAL_DIR"
    return
  fi

  local candidate

  if [ -n "${SCRIPT_DIR:-}" ]; then
    candidate="$(cd "${SCRIPT_DIR}/../.." 2>/dev/null && pwd || true)"
    if [ -n "$candidate" ] && [ -f "${candidate}/api.php" ] && [ -f "${candidate}/portal.html" ]; then
      printf '%s\n' "$candidate"
      return
    fi
  fi

  local app_dir
  app_dir="$(resolve_app_dir)"

  if [ -f "${app_dir}/mom/api.php" ]; then
    printf '%s\n' "${app_dir}/mom"
    return
  fi

  printf '%s\n' "${app_dir}"
}

resolve_nginx_site() {
  if [ -n "${NGINX_SITE:-}" ] && [ -f "${NGINX_SITE:-}" ]; then
    printf '%s\n' "$NGINX_SITE"
    return
  fi

  local portal_dir
  local candidate
  portal_dir="$(resolve_portal_dir)"

  candidate="$(search_nginx_site "${DOMAIN:-qms.hesem.com.vn}" /etc/nginx/sites-enabled /etc/nginx/sites-available /etc/nginx/conf.d)"
  if [ -n "$candidate" ] && [ -f "$candidate" ]; then
    printf '%s\n' "$candidate"
    return
  fi

  candidate="$(search_nginx_site "eqms.hesemeng.com" /etc/nginx/sites-enabled /etc/nginx/sites-available /etc/nginx/conf.d)"
  if [ -n "$candidate" ] && [ -f "$candidate" ]; then
    printf '%s\n' "$candidate"
    return
  fi

  candidate="$(search_nginx_site "qms.hesem.com.vn" /etc/nginx/sites-enabled /etc/nginx/sites-available /etc/nginx/conf.d)"
  if [ -n "$candidate" ] && [ -f "$candidate" ]; then
    printf '%s\n' "$candidate"
    return
  fi

  candidate="$(search_nginx_site "$portal_dir" /etc/nginx/sites-enabled /etc/nginx/sites-available /etc/nginx/conf.d)"
  if [ -n "$candidate" ] && [ -f "$candidate" ]; then
    printf '%s\n' "$candidate"
    return
  fi

  candidate="$(search_nginx_site "fastcgi_pass unix:" /etc/nginx/sites-enabled /etc/nginx/sites-available /etc/nginx/conf.d)"
  if [ -n "$candidate" ] && [ -f "$candidate" ]; then
    printf '%s\n' "$candidate"
    return
  fi

  if [ -f "/etc/nginx/sites-enabled/hesem-mom" ]; then
    printf '%s\n' "/etc/nginx/sites-enabled/hesem-mom"
    return
  fi

  if [ -f "/etc/nginx/sites-available/hesem-mom" ]; then
    printf '%s\n' "/etc/nginx/sites-available/hesem-mom"
    return
  fi

  if [ -f "/etc/nginx/sites-enabled/eqms.hesemeng.com" ]; then
    printf '%s\n' "/etc/nginx/sites-enabled/eqms.hesemeng.com"
    return
  fi

  if [ -f "/etc/nginx/sites-available/eqms.hesemeng.com" ]; then
    printf '%s\n' "/etc/nginx/sites-available/eqms.hesemeng.com"
    return
  fi

  printf '%s\n' "/etc/nginx/sites-available/default"
}

resolve_php_sock() {
  if [ -n "${PHP_SOCK:-}" ] && [ -S "${PHP_SOCK:-}" ]; then
    printf '%s\n' "$PHP_SOCK"
    return
  fi

  local site
  local sock
  site="$(resolve_nginx_site)"
  sock="$(sed -n "s/.*fastcgi_pass unix:\\([^;]*\\);.*/\\1/p" "$site" | head -n 1 || true)"
  if [ -n "$sock" ] && [ -S "$sock" ]; then
    printf '%s\n' "$sock"
    return
  fi

  for sock in /run/php/php*-hesem.sock /run/php/php*-fpm.sock /var/run/php/php*-fpm.sock; do
    if [ -S "$sock" ]; then
      printf '%s\n' "$sock"
      return
    fi
  done

  printf '%s\n' "/run/php/php8.3-fpm-hesem.sock"
}

resolve_domain() {
  if [ -n "${DOMAIN:-}" ]; then
    printf '%s\n' "$DOMAIN"
    return
  fi

  local site
  local domain
  site="$(resolve_nginx_site)"
  domain="$(sed -n 's/^[[:space:]]*server_name[[:space:]]\+\([^ ;]*\).*/\1/p' "$site" | head -n 1 || true)"
  if [ -n "$domain" ]; then
    printf '%s\n' "$domain"
    return
  fi

  if [ -f "/var/www/eqms.hesemeng.com/mom/api.php" ]; then
    printf '%s\n' "eqms.hesemeng.com"
    return
  fi

  printf '%s\n' "qms.hesem.com.vn"
}

backup_file() {
  local path="$1"
  local source_path="$path"
  if [ -L "$path" ] && command -v readlink >/dev/null 2>&1; then
    source_path="$(readlink -f "$path" 2>/dev/null || printf '%s' "$path")"
  fi
  if [ "$source_path" = "$path" ] && [[ "$path" == /etc/nginx/sites-enabled/* ]]; then
    local base_name
    base_name="$(basename "$path")"
    if [ -f "/etc/nginx/sites-available/${base_name}" ]; then
      source_path="/etc/nginx/sites-available/${base_name}"
    fi
  fi
  if [ -f "$source_path" ]; then
    cp -a "$source_path" "${source_path}.bak.$(date +%Y%m%d%H%M%S)"
  fi
}

ensure_nginx_include() {
  local site="$1"
  local include_path="$2"

  if grep -q "include ${include_path};" "$site"; then
    return
  fi

  backup_file "$site"

  if grep -q 'client_max_body_size' "$site"; then
    sed -i "\|client_max_body_size|a\\    include ${include_path};" "$site"
    return
  fi

  local tmp
  tmp="$(mktemp)"
  awk -v include_line="    include ${include_path};" '
    BEGIN { inserted = 0 }
    {
      if (!inserted && $0 ~ /^[[:space:]]*}[[:space:]]*$/) {
        print include_line
        inserted = 1
      }
      print
    }
  ' "$site" > "$tmp"
  cat "$tmp" > "$site"
  rm -f "$tmp"
}

#!/usr/bin/env bash
set -euo pipefail

# HESEM MOM — install the repo-local DCC VI→EN translation provider.
#
# This provisions a small Python venv under PRIVATE_DATA so the backend can
# call a stable on-prem command provider:
#   DCC_TRANSLATION_DRIVER=command
#   DCC_TRANSLATION_COMMAND=/var/www/data-private/venvs/dcc-translation/bin/python /var/www/eqms.hesemeng.com/tools/scripts/translation/dcc_argos_vi_to_en.py

SITE_DIR="${SITE_DIR:-/var/www/eqms.hesemeng.com}"
PRIVATE_DATA="${PRIVATE_DATA:-/var/www/data-private}"
VENV_DIR="${VENV_DIR:-$PRIVATE_DATA/venvs/dcc-translation}"
MODEL_DIR="${MODEL_DIR:-$PRIVATE_DATA/translation-models}"
MODEL_URL="${MODEL_URL:-https://argos-net.com/v1/translate-vi_en-1_9.argosmodel}"
MODEL_FILE="${MODEL_FILE:-$MODEL_DIR/translate-vi_en-1_9.argosmodel}"
RUNTIME_HOME="${RUNTIME_HOME:-$PRIVATE_DATA/translation-runtime}"
WEB_USER="${WEB_USER:-www-data}"
WEB_GROUP="${WEB_GROUP:-www-data}"
FPM_POOL_CONF="${FPM_POOL_CONF:-/etc/php/8.5/fpm/pool.d/mom.conf}"
SCRIPT_PATH="$SITE_DIR/tools/scripts/translation/dcc_argos_vi_to_en.py"
PREWARM_SERVICE_SRC="$SITE_DIR/tools/vps-setup/systemd/dcc-locale-prewarm.service"
PREWARM_TIMER_SRC="$SITE_DIR/tools/vps-setup/systemd/dcc-locale-prewarm.timer"

upsert_fpm_env() {
  local key="$1"
  local value="$2"
  local conf="$FPM_POOL_CONF"
  python3 - "$conf" "$key" "$value" <<'PY'
import pathlib
import re
import sys

conf = pathlib.Path(sys.argv[1])
key = sys.argv[2]
value = sys.argv[3]
line = f"env[{key}] = {value}\n"
pattern = re.compile(r"^\s*;?\s*env\[" + re.escape(key) + r"\]\s*=.*$")

lines = conf.read_text(encoding="utf-8").splitlines(keepends=True) if conf.exists() else []
out = []
replaced = False
for existing in lines:
    if pattern.match(existing.rstrip("\n")):
        if not replaced:
            out.append(line)
            replaced = True
        continue
    out.append(existing)

if not replaced:
    if out and not out[-1].endswith("\n"):
        out[-1] += "\n"
    out.append(line)

conf.write_text("".join(out), encoding="utf-8")
PY
}

echo "[dcc-translation] site_dir=$SITE_DIR"
echo "[dcc-translation] venv_dir=$VENV_DIR"

command -v python3 >/dev/null 2>&1 || { echo "python3 not found" >&2; exit 1; }
command -v curl >/dev/null 2>&1 || { echo "curl not found" >&2; exit 1; }

mkdir -p "$MODEL_DIR"
mkdir -p "$RUNTIME_HOME/.local/share" "$RUNTIME_HOME/.cache" "$RUNTIME_HOME/.config"
python3 -m venv "$VENV_DIR"
"$VENV_DIR/bin/pip" install --upgrade pip >/dev/null
"$VENV_DIR/bin/pip" install argostranslate beautifulsoup4 lxml >/dev/null

if [ ! -f "$MODEL_FILE" ]; then
  echo "[dcc-translation] downloading Argos vi→en model..."
  curl -fsSL "$MODEL_URL" -o "$MODEL_FILE"
fi

echo "[dcc-translation] installing Argos model..."
env \
  HOME="$RUNTIME_HOME" \
  XDG_DATA_HOME="$RUNTIME_HOME/.local/share" \
  XDG_CACHE_HOME="$RUNTIME_HOME/.cache" \
  XDG_CONFIG_HOME="$RUNTIME_HOME/.config" \
  DCC_TRANSLATION_RUNTIME_HOME="$RUNTIME_HOME" \
  "$VENV_DIR/bin/python" - <<PY
import argostranslate.package
argostranslate.package.install_from_path(r"$MODEL_FILE")
print("model_installed")
PY

if id "$WEB_USER" >/dev/null 2>&1; then
  chown -R "$WEB_USER:$WEB_GROUP" "$RUNTIME_HOME"
fi

mkdir -p \
  "$SITE_DIR/mom/data/cache/dcc-locale-jobs/en" \
  "$SITE_DIR/mom/data/cache/dcc-locale-artifacts/en"
touch "$SITE_DIR/mom/data/php_error.log"
if id "$WEB_USER" >/dev/null 2>&1; then
  chown -R "$WEB_USER:$WEB_GROUP" \
    "$SITE_DIR/mom/data/cache/dcc-locale-jobs" \
    "$SITE_DIR/mom/data/cache/dcc-locale-artifacts"
  chown "$WEB_USER:$WEB_GROUP" "$SITE_DIR/mom/data/php_error.log"
fi
find "$SITE_DIR/mom/data/cache/dcc-locale-jobs" "$SITE_DIR/mom/data/cache/dcc-locale-artifacts" \
  -type d -exec chmod 2775 {} +
find "$SITE_DIR/mom/data/cache/dcc-locale-jobs" "$SITE_DIR/mom/data/cache/dcc-locale-artifacts" \
  -type f -exec chmod 0664 {} +
chmod 0664 "$SITE_DIR/mom/data/php_error.log"

if [ ! -f "$SCRIPT_PATH" ]; then
  echo "Provider script missing: $SCRIPT_PATH" >&2
  exit 1
fi

if [ -f "$FPM_POOL_CONF" ]; then
  PHP_CLI_BINARY="$(command -v php8.5 2>/dev/null || command -v php 2>/dev/null || true)"
  upsert_fpm_env "DCC_TRANSLATION_DRIVER" "command"
  upsert_fpm_env "DCC_TRANSLATION_RUNTIME_HOME" "$RUNTIME_HOME"
  upsert_fpm_env "DCC_TRANSLATION_COMMAND" "$VENV_DIR/bin/python $SCRIPT_PATH"
  upsert_fpm_env "DCC_TRANSLATION_WORKER_SLOTS" "4"
  upsert_fpm_env "DCC_TRANSLATION_COMMAND_TIMEOUT_SECONDS" "1800"
  upsert_fpm_env "DCC_TRANSLATION_JOB_MAX_ATTEMPTS" "3"
  if [ -n "$PHP_CLI_BINARY" ]; then
    upsert_fpm_env "PHP_CLI_BINARY" "$PHP_CLI_BINARY"
  fi
  if command -v systemctl >/dev/null 2>&1; then
    systemctl reload php8.5-fpm 2>/dev/null || true
  fi
else
  echo "[dcc-translation] FPM pool config not found: $FPM_POOL_CONF" >&2
fi

if command -v systemctl >/dev/null 2>&1 \
  && [ -f "$PREWARM_SERVICE_SRC" ] \
  && [ -f "$PREWARM_TIMER_SRC" ]; then
  echo "[dcc-translation] installing locale prewarm systemd timer..."
  sed "s#/var/www/eqms.hesemeng.com#$SITE_DIR#g; s#/etc/php/8.5/fpm/pool.d/mom.conf#$FPM_POOL_CONF#g" \
    "$PREWARM_SERVICE_SRC" > /etc/systemd/system/dcc-locale-prewarm.service
  chmod 0644 /etc/systemd/system/dcc-locale-prewarm.service
  install -m 0644 "$PREWARM_TIMER_SRC" /etc/systemd/system/dcc-locale-prewarm.timer
  systemctl daemon-reload
  if [ -f "$FPM_POOL_CONF" ] \
    && grep -Eq '^[[:space:]]*env\[DCC_TRANSLATION_DRIVER\][[:space:]]*=[[:space:]]*command[[:space:]]*$' "$FPM_POOL_CONF" \
    && grep -Eq '^[[:space:]]*env\[DCC_TRANSLATION_COMMAND\][[:space:]]*=' "$FPM_POOL_CONF"; then
    systemctl enable --now dcc-locale-prewarm.timer
  else
    echo "[dcc-translation] prewarm timer installed but not enabled because provider env is not configured in $FPM_POOL_CONF"
  fi
fi

cat <<EOF

[dcc-translation] install complete

Set these PHP-FPM environment variables:
  env[DCC_TRANSLATION_DRIVER] = command
  env[DCC_TRANSLATION_RUNTIME_HOME] = $RUNTIME_HOME
  env[DCC_TRANSLATION_COMMAND] = $VENV_DIR/bin/python $SCRIPT_PATH
  env[DCC_TRANSLATION_WORKER_SLOTS] = 4
  env[DCC_TRANSLATION_COMMAND_TIMEOUT_SECONDS] = 1800
  env[DCC_TRANSLATION_JOB_MAX_ATTEMPTS] = 3

Then reload PHP-FPM.
After PHP-FPM env is configured, enable proactive prewarm:
  systemctl enable --now dcc-locale-prewarm.timer
EOF

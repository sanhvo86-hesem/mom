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
SCRIPT_PATH="$SITE_DIR/tools/scripts/translation/dcc_argos_vi_to_en.py"

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

if [ ! -f "$SCRIPT_PATH" ]; then
  echo "Provider script missing: $SCRIPT_PATH" >&2
  exit 1
fi

cat <<EOF

[dcc-translation] install complete

Set these PHP-FPM environment variables:
  env[DCC_TRANSLATION_DRIVER] = command
  env[DCC_TRANSLATION_RUNTIME_HOME] = $RUNTIME_HOME
  env[DCC_TRANSLATION_COMMAND] = $VENV_DIR/bin/python $SCRIPT_PATH

Then reload PHP-FPM.
EOF

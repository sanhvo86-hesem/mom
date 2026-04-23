#!/usr/bin/env bash
set -euo pipefail

# HESEM MOM — install the repo-local DCC VI→EN translation provider.
#
# This provisions a small Python venv under PRIVATE_DATA so the backend can
# call a stable on-prem command provider. The repo root defaults to the
# location of this setup script, so the generated command does not depend on
# a hardcoded deploy root. Model bootstrap is local-first; set MODEL_URL
# explicitly only when an approved internal mirror or one-time external fetch
# is allowed by governance.
#   DCC_TRANSLATION_DRIVER=command
#   DCC_TRANSLATION_COMMAND=<venv>/bin/python <repo-root>/tools/scripts/translation/dcc_argos_vi_to_en.py

SCRIPT_DIR="$(cd -- "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "$SCRIPT_DIR/../../.." && pwd)"

SITE_DIR="${SITE_DIR:-$REPO_ROOT}"
PRIVATE_DATA="${PRIVATE_DATA:-/var/www/data-private}"
VENV_DIR="${VENV_DIR:-$PRIVATE_DATA/venvs/dcc-translation}"
MODEL_DIR="${MODEL_DIR:-$PRIVATE_DATA/translation-models}"
MODEL_URL="${MODEL_URL:-}"
MODEL_FILE="${MODEL_FILE:-$MODEL_DIR/translate-vi_en-1_9.argosmodel}"
MODEL_SHA256="${MODEL_SHA256:-ebd51b7189b13eccb9238a5777de1d343008c4c05284a8b89610242364433953}"
ARGOS_VERSION="${ARGOS_VERSION:-1.11.0}"
BS4_VERSION="${BS4_VERSION:-4.14.3}"
LXML_VERSION="${LXML_VERSION:-6.1.0}"
SCRIPT_PATH="$SITE_DIR/tools/scripts/translation/dcc_argos_vi_to_en.py"

echo "[dcc-translation] site_dir=$SITE_DIR"
echo "[dcc-translation] venv_dir=$VENV_DIR"

command -v python3 >/dev/null 2>&1 || { echo "python3 not found" >&2; exit 1; }

mkdir -p "$MODEL_DIR"
python3 -m venv "$VENV_DIR"
"$VENV_DIR/bin/pip" install --upgrade pip >/dev/null
"$VENV_DIR/bin/pip" install \
  "argostranslate==$ARGOS_VERSION" \
  "beautifulsoup4==$BS4_VERSION" \
  "lxml==$LXML_VERSION" >/dev/null

if [ ! -f "$MODEL_FILE" ]; then
  if [ -z "$MODEL_URL" ]; then
    echo "Model artifact missing at $MODEL_FILE" >&2
    echo "Pre-seed the Argos model locally or set MODEL_URL to an approved mirror/download source." >&2
    exit 1
  fi
  command -v curl >/dev/null 2>&1 || { echo "curl not found" >&2; exit 1; }
  echo "[dcc-translation] downloading Argos vi→en model from explicit MODEL_URL..."
  curl -fsSL "$MODEL_URL" -o "$MODEL_FILE"
fi

ACTUAL_SHA="$(sha256sum "$MODEL_FILE" | awk '{print $1}')"
if [ "$ACTUAL_SHA" != "$MODEL_SHA256" ]; then
  echo "Model checksum mismatch: expected $MODEL_SHA256 got $ACTUAL_SHA" >&2
  exit 1
fi

echo "[dcc-translation] installing Argos model..."
"$VENV_DIR/bin/python" - <<PY
import argostranslate.package
argostranslate.package.install_from_path(r"$MODEL_FILE")
print("model_installed")
PY

if [ ! -f "$SCRIPT_PATH" ]; then
  echo "Provider script missing: $SCRIPT_PATH" >&2
  exit 1
fi

cat <<EOF

[dcc-translation] install complete

Set these PHP-FPM environment variables:
  env[DCC_TRANSLATION_DRIVER] = command
  env[DCC_TRANSLATION_COMMAND] = $VENV_DIR/bin/python $SCRIPT_PATH

Then reload PHP-FPM.
EOF

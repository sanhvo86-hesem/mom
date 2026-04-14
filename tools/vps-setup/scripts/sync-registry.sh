#!/usr/bin/env bash
# sync-registry.sh — Upload generated registry files to the VPS
# Run from the repo root after generating registry files locally:
#   bash tools/vps-setup/scripts/sync-registry.sh [VPS_TARGET]
#
# VPS_TARGET defaults to root@103.110.87.55

set -euo pipefail

VPS="${1:-root@103.110.87.55}"
VPS_DATA_DIR="/var/www/eqms.hesemeng.com/mom/data"
LOCAL_REG="mom/data/registry"

if [ ! -d "$LOCAL_REG" ]; then
  echo "ERROR: $LOCAL_REG does not exist. Generate registry files first." >&2
  exit 1
fi

echo "Syncing registry files to $VPS:$VPS_DATA_DIR/registry/ ..."
ssh "$VPS" "mkdir -p $VPS_DATA_DIR/registry && chown www-data:www-data $VPS_DATA_DIR/registry"
rsync -avz --checksum \
  "$LOCAL_REG/" \
  "$VPS:$VPS_DATA_DIR/registry/"

echo "Done. Registry files synced."

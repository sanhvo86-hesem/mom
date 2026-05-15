#!/usr/bin/env bash
set -euo pipefail

SITE="${SITE:-https://eqms.hesemeng.com}"
KEY_FILE="${KEY_FILE:-/var/www/data-private/secrets/cron-api-key}"
LOG="${LOG:-/var/log/qms-doc-usage-cron.log}"

if [ ! -r "$KEY_FILE" ]; then
  echo "$(date '+%F %T') Lỗi: không đọc được API key $KEY_FILE" >> "$LOG"
  exit 1
fi

API_KEY="$(tr -d '[:space:]' < "$KEY_FILE")"
RESPONSE="$(curl -sS -X POST \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  --max-time 60 \
  "$SITE/api.php?action=deploy_doc_usage_aggregate" \
  -d '{}' || echo '{"error":"curl_failed"}')"

echo "$(date '+%F %T') $RESPONSE" >> "$LOG"

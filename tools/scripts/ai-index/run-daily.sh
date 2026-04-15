#!/bin/bash
# AI Knowledge Index — Daily Re-index Script
# Chạy bởi launchd mỗi ngày lúc 06:00
# Log: /Users/a10/Documents/mom/.ai/index.log

REPO_ROOT="/Users/a10/Documents/mom"
PHP="/opt/homebrew/bin/php"
SCRIPT="$REPO_ROOT/tools/scripts/ai-index/generate.php"
AI_DIR="$REPO_ROOT/.ai"
LOG="$AI_DIR/index.log"

echo "======================================" >> "$LOG"
echo "$(date '+%Y-%m-%d %H:%M:%S') — AI index started" >> "$LOG"

"$PHP" "$SCRIPT" >> "$LOG" 2>&1
EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    echo "$(date '+%Y-%m-%d %H:%M:%S') — Done (exit 0)" >> "$LOG"

    # ── File size report (token budget tracking) ──────────────────────────────
    echo "$(date '+%Y-%m-%d %H:%M:%S') — Index sizes (bytes → ~tokens at 0.75 bytes/token):" >> "$LOG"

    report_size() {
        local f="$1"
        local label="$2"
        if [ -f "$f" ]; then
            local bytes
            bytes=$(wc -c < "$f" | tr -d ' ')
            local tokens=$(( bytes * 4 / 3 ))   # rough: 0.75 bytes per token
            printf "  %-30s %7d bytes  (~%dk tokens)\n" "$label" "$bytes" "$(( tokens / 1000 ))" >> "$LOG"
        fi
    }

    report_size "$AI_DIR/repo-map.json"        "repo-map.json"
    report_size "$AI_DIR/route-map.json"       "route-map.json"
    report_size "$AI_DIR/db-map.json"          "db-map.json (full)"
    report_size "$AI_DIR/db-map/index.json"    "db-map/index.json"
    report_size "$AI_DIR/contracts-map.json"   "contracts-map.json"
    report_size "$AI_DIR/symbols.json"         "symbols.json"

    # Domain files
    DOMAIN_COUNT=0
    DOMAIN_TOTAL=0
    for f in "$AI_DIR/db-map/"*.json; do
        [ "$(basename "$f")" = "index.json" ] && continue
        [ -f "$f" ] || continue
        bytes=$(wc -c < "$f" | tr -d ' ')
        DOMAIN_TOTAL=$(( DOMAIN_TOTAL + bytes ))
        DOMAIN_COUNT=$(( DOMAIN_COUNT + 1 ))
    done
    if [ "$DOMAIN_COUNT" -gt 0 ]; then
        AVG=$(( DOMAIN_TOTAL / DOMAIN_COUNT ))
        printf "  %-30s %7d bytes  (%d files, avg %d)\n" \
            "db-map/<domain>.json" "$DOMAIN_TOTAL" "$DOMAIN_COUNT" "$AVG" >> "$LOG"
    fi

    # ── Validate domain split ──────────────────────────────────────────────────
    if [ "$DOMAIN_COUNT" -eq 0 ]; then
        echo "$(date '+%Y-%m-%d %H:%M:%S') — WARNING: no domain files found in .ai/db-map/" >> "$LOG"
    fi

else
    echo "$(date '+%Y-%m-%d %H:%M:%S') — ERROR (exit $EXIT_CODE)" >> "$LOG"
fi

# Giữ tối đa 500 dòng log (tránh phình file)
tail -500 "$LOG" > "$LOG.tmp" && mv "$LOG.tmp" "$LOG"

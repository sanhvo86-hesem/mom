#!/bin/bash
# AI Knowledge Index — Daily Re-index Script
# Chạy bởi launchd mỗi ngày lúc 06:00
# Log: /Users/a10/Documents/mom/.ai/index.log

REPO_ROOT="/Users/a10/Documents/mom"
PHP="/opt/homebrew/bin/php"
SCRIPT="$REPO_ROOT/tools/scripts/ai-index/generate.php"
LOG="$REPO_ROOT/.ai/index.log"

echo "======================================" >> "$LOG"
echo "$(date '+%Y-%m-%d %H:%M:%S') — AI index started" >> "$LOG"

"$PHP" "$SCRIPT" >> "$LOG" 2>&1
EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    echo "$(date '+%Y-%m-%d %H:%M:%S') — Done (exit 0)" >> "$LOG"
else
    echo "$(date '+%Y-%m-%d %H:%M:%S') — ERROR (exit $EXIT_CODE)" >> "$LOG"
fi

# Giữ tối đa 500 dòng log (tránh phình file)
tail -500 "$LOG" > "$LOG.tmp" && mv "$LOG.tmp" "$LOG"

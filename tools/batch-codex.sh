#!/usr/bin/env bash
# =============================================================================
# batch-codex.sh — Tự động chạy danh sách prompt qua OpenAI Codex CLI
# =============================================================================
# Cách dùng:
#   1. Lưu các prompt từ GPT vào file tasks.txt (mỗi dòng = 1 prompt)
#   2. Chạy: bash tools/batch-codex.sh tasks.txt
#
# Flags tuỳ chọn:
#   --commit      Tự động git commit sau mỗi task
#   --dry-run     Chỉ in prompt, không gọi Codex
#   --delay N     Dừng N giây giữa các task (mặc định: 5)
# =============================================================================

set -euo pipefail

# ── Màu sắc terminal ──────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

# ── Defaults ──────────────────────────────────────────────────────────────────
TASKS_FILE=""
AUTO_COMMIT=false
DRY_RUN=false
DELAY=5
LOG_FILE="tools/codex-run-$(date +%Y%m%d-%H%M%S).log"

# ── Parse arguments ───────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --commit)    AUTO_COMMIT=true ;;
    --dry-run)   DRY_RUN=true ;;
    --delay)     DELAY="$2"; shift ;;
    -*)          echo "Unknown flag: $1"; exit 1 ;;
    *)           TASKS_FILE="$1" ;;
  esac
  shift
done

if [[ -z "$TASKS_FILE" ]]; then
  echo -e "${RED}Lỗi: Chưa chỉ định file tasks.${RESET}"
  echo "Dùng: bash tools/batch-codex.sh tasks.txt [--commit] [--dry-run] [--delay 5]"
  exit 1
fi

if [[ ! -f "$TASKS_FILE" ]]; then
  echo -e "${RED}Lỗi: Không tìm thấy file '$TASKS_FILE'${RESET}"
  exit 1
fi

# ── Kiểm tra Codex CLI ────────────────────────────────────────────────────────
if ! command -v codex &>/dev/null && [[ "$DRY_RUN" == false ]]; then
  echo -e "${RED}Lỗi: Không tìm thấy 'codex' CLI. Cài bằng: npm install -g @openai/codex${RESET}"
  exit 1
fi

# ── Đọc tasks (bỏ qua dòng trống và comment #) ───────────────────────────────
mapfile -t RAW_LINES < "$TASKS_FILE"
TASKS=()
for line in "${RAW_LINES[@]}"; do
  trimmed="${line#"${line%%[![:space:]]*}"}"   # trim leading whitespace
  if [[ -n "$trimmed" && "${trimmed:0:1}" != "#" ]]; then
    TASKS+=("$trimmed")
  fi
done

TOTAL=${#TASKS[@]}
if [[ $TOTAL -eq 0 ]]; then
  echo -e "${YELLOW}File '$TASKS_FILE' không có task nào.${RESET}"
  exit 0
fi

# ── Header ────────────────────────────────────────────────────────────────────
mkdir -p "$(dirname "$LOG_FILE")"
echo -e "${BOLD}${CYAN}══════════════════════════════════════════════${RESET}"
echo -e "${BOLD}  Batch Codex Runner${RESET}"
echo -e "  File: ${YELLOW}$TASKS_FILE${RESET}  |  Tasks: ${YELLOW}$TOTAL${RESET}"
echo -e "  Auto-commit: ${YELLOW}$AUTO_COMMIT${RESET}  |  Dry-run: ${YELLOW}$DRY_RUN${RESET}"
echo -e "  Log: ${YELLOW}$LOG_FILE${RESET}"
echo -e "${BOLD}${CYAN}══════════════════════════════════════════════${RESET}"
echo ""

# ── Chạy từng task ────────────────────────────────────────────────────────────
SUCCESS=0
FAILED=0
SKIPPED=0

for i in "${!TASKS[@]}"; do
  TASK_NUM=$((i + 1))
  PROMPT="${TASKS[$i]}"

  echo -e "${BOLD}[${TASK_NUM}/${TOTAL}]${RESET} ${BLUE}${PROMPT:0:100}${RESET}"
  echo "$(date '+%Y-%m-%d %H:%M:%S') [TASK $TASK_NUM/$TOTAL] $PROMPT" >> "$LOG_FILE"

  if [[ "$DRY_RUN" == true ]]; then
    echo -e "  ${YELLOW}[DRY-RUN] Sẽ chạy: codex --approval-mode full-auto \"...\"${RESET}"
    ((SKIPPED++))
    continue
  fi

  # Chạy Codex
  echo -e "  ${CYAN}→ Đang gọi Codex...${RESET}"
  if codex --approval-mode full-auto "$PROMPT" >> "$LOG_FILE" 2>&1; then
    echo -e "  ${GREEN}✓ Thành công${RESET}"
    echo "$(date '+%Y-%m-%d %H:%M:%S') [OK] Task $TASK_NUM" >> "$LOG_FILE"
    ((SUCCESS++))

    # Auto commit nếu được bật
    if [[ "$AUTO_COMMIT" == true ]]; then
      COMMIT_MSG="codex: task $TASK_NUM/$TOTAL - ${PROMPT:0:72}"
      if git diff --quiet && git diff --cached --quiet; then
        echo -e "  ${YELLOW}⚠ Không có thay đổi để commit${RESET}"
      else
        git add -A
        git commit -m "$COMMIT_MSG" >> "$LOG_FILE" 2>&1
        echo -e "  ${GREEN}✓ Đã commit: \"${COMMIT_MSG:0:60}...\"${RESET}"
      fi
    fi
  else
    echo -e "  ${RED}✗ Lỗi — xem log: $LOG_FILE${RESET}"
    echo "$(date '+%Y-%m-%d %H:%M:%S') [FAIL] Task $TASK_NUM" >> "$LOG_FILE"
    ((FAILED++))
  fi

  # Delay giữa các task (trừ task cuối)
  if [[ $TASK_NUM -lt $TOTAL ]]; then
    echo -e "  ${YELLOW}⏳ Chờ ${DELAY}s trước task tiếp theo...${RESET}"
    sleep "$DELAY"
  fi

  echo ""
done

# ── Tổng kết ──────────────────────────────────────────────────────────────────
echo -e "${BOLD}${CYAN}══════════════════════════════════════════════${RESET}"
echo -e "${BOLD}  Kết quả:${RESET}"
echo -e "  ${GREEN}✓ Thành công: $SUCCESS${RESET}"
if [[ $FAILED -gt 0 ]]; then
  echo -e "  ${RED}✗ Thất bại:   $FAILED${RESET}"
fi
if [[ $SKIPPED -gt 0 ]]; then
  echo -e "  ${YELLOW}⏭ Bỏ qua:    $SKIPPED (dry-run)${RESET}"
fi
echo -e "  Log đầy đủ: ${YELLOW}$LOG_FILE${RESET}"
echo -e "${BOLD}${CYAN}══════════════════════════════════════════════${RESET}"

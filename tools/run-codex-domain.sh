#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════════
# run-codex-domain.sh
# Chạy Codex với prompts từ các domain GPT Pro chat
# ══════════════════════════════════════════════════════════════════
# Dùng:
#   bash tools/run-codex-domain.sh              # chạy tất cả 4 domains theo thứ tự
#   bash tools/run-codex-domain.sh eqms         # chỉ chạy eqms
#   bash tools/run-codex-domain.sh ai frontend  # chạy ai rồi frontend
#   bash tools/run-codex-domain.sh --dry-run    # thử, không động code
# ══════════════════════════════════════════════════════════════════

set -euo pipefail

# ── Màu ──────────────────────────────────────────────────────────
R='\033[0;31m'; G='\033[0;32m'; Y='\033[1;33m'; B='\033[0;34m'
C='\033[0;36m'; M='\033[0;35m'; W='\033[1m'; X='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROMPTS_DIR="$SCRIPT_DIR/prompts"
LOG_DIR="$SCRIPT_DIR/audit-logs"
DRY_RUN=false
DELAY=8

# ── Domain config ─────────────────────────────────────────────────
declare -A DOMAIN_LABEL=(
  [eqms]="🟢 EQMS — Quality Management"
  [ai]="🟣 AI — Intelligence Layer"
  [frontend]="🟡 Frontend — UI/UX"
  [backend]="🔵 Backend — API & Database"
)
declare -A DOMAIN_COLOR=(
  [eqms]="$G"
  [ai]="$M"
  [frontend]="$Y"
  [backend]="$B"
)
declare -A DOMAIN_FILE=(
  [eqms]="1-eqms.txt"
  [ai]="2-ai.txt"
  [frontend]="3-frontend.txt"
  [backend]="4-backend.txt"
)

# Thứ tự mặc định (đúng theo task list của bạn)
DEFAULT_ORDER=(eqms ai frontend backend)

# ── Parse args ────────────────────────────────────────────────────
DOMAINS_TO_RUN=()
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    --delay)   shift; DELAY="$1" ;;
    eqms|ai|frontend|backend) DOMAINS_TO_RUN+=("$arg") ;;
    *) echo -e "${R}Unknown: $arg${X}"; exit 1 ;;
  esac
done

if [[ ${#DOMAINS_TO_RUN[@]} -eq 0 ]]; then
  DOMAINS_TO_RUN=("${DEFAULT_ORDER[@]}")
fi

mkdir -p "$LOG_DIR"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
LOG_FILE="$LOG_DIR/run-$TIMESTAMP.log"

# ── Banner ────────────────────────────────────────────────────────
echo -e "\n${W}${C}$(printf '═%.0s' {1..58})${X}"
echo -e "${W}  🚀 MOM ERP Codex Runner — Domain Prompts${X}"
echo -e "  Domains  : ${Y}${DOMAINS_TO_RUN[*]}${X}"
echo -e "  Dry-run  : ${Y}$DRY_RUN${X}"
echo -e "  Log      : ${C}$LOG_FILE${X}"
echo -e "${W}${C}$(printf '═%.0s' {1..58})${X}\n"

TOTAL_SUCCESS=0
TOTAL_FAILED=0
TOTAL_SKIPPED=0

# ── Chạy từng domain ──────────────────────────────────────────────
for DOMAIN in "${DOMAINS_TO_RUN[@]}"; do
  LABEL="${DOMAIN_LABEL[$DOMAIN]}"
  COLOR="${DOMAIN_COLOR[$DOMAIN]}"
  FILE="$PROMPTS_DIR/${DOMAIN_FILE[$DOMAIN]}"

  echo -e "${W}${COLOR}$(printf '─%.0s' {1..58})${X}"
  echo -e "${W}  $LABEL${X}"
  echo -e "${W}${COLOR}$(printf '─%.0s' {1..58})${X}"

  if [[ ! -f "$FILE" ]]; then
    echo -e "  ${R}✗ File không tồn tại: $FILE${X}"
    continue
  fi

  # Đọc prompts (bỏ comment # và dòng trống)
  mapfile -t PROMPTS < <(grep -v '^\s*#' "$FILE" | grep -v '^\s*$' || true)

  # Xử lý prompt multi-line: gộp các dòng liên tiếp thành 1 prompt
  # (prompt cách nhau bằng dòng trống trong file gốc trước khi strip)
  TASKS=()
  CURRENT=""
  while IFS= read -r line; do
    stripped="${line#"${line%%[![:space:]]*}"}"
    if [[ -z "$stripped" || "${stripped:0:1}" == "#" ]]; then
      if [[ -n "$CURRENT" ]]; then
        TASKS+=("$CURRENT")
        CURRENT=""
      fi
    else
      if [[ -n "$CURRENT" ]]; then
        CURRENT="$CURRENT $stripped"
      else
        CURRENT="$stripped"
      fi
    fi
  done < "$FILE"
  [[ -n "$CURRENT" ]] && TASKS+=("$CURRENT")

  TASK_COUNT=${#TASKS[@]}

  if [[ $TASK_COUNT -eq 0 ]]; then
    echo -e "  ${Y}⚠ Chưa có prompt trong file. Paste kết quả từ GPT Pro vào:${X}"
    echo -e "  ${C}$FILE${X}"
    ((TOTAL_SKIPPED++))
    echo ""
    continue
  fi

  echo -e "  ${W}$TASK_COUNT tasks${X} từ ${C}${DOMAIN_FILE[$DOMAIN]}${X}\n"
  echo "$(date '+%Y-%m-%d %H:%M:%S') [$DOMAIN] $TASK_COUNT tasks" >> "$LOG_FILE"

  D_SUCCESS=0
  D_FAILED=0

  for i in "${!TASKS[@]}"; do
    TASK_NUM=$((i + 1))
    PROMPT="${TASKS[$i]}"
    SHORT="${PROMPT:0:100}"

    echo -e "  ${W}[$TASK_NUM/$TASK_COUNT]${X} ${COLOR}${SHORT}...${X}"
    echo "$(date '+%Y-%m-%d %H:%M:%S') [$DOMAIN] Task $TASK_NUM: ${PROMPT:0:200}" >> "$LOG_FILE"

    if [[ "$DRY_RUN" == true ]]; then
      echo -e "  ${Y}  [DRY-RUN] Bỏ qua${X}"
      ((TOTAL_SKIPPED++))
      continue
    fi

    if codex --approval-mode full-auto "$PROMPT" >> "$LOG_FILE" 2>&1; then
      echo -e "  ${G}  ✓ OK${X}"
      ((D_SUCCESS++)); ((TOTAL_SUCCESS++))
    else
      echo -e "  ${R}  ✗ Lỗi${X}"
      ((D_FAILED++)); ((TOTAL_FAILED++))
    fi

    if [[ $TASK_NUM -lt $TASK_COUNT ]]; then
      echo -e "  ${Y}  ⏳ ${DELAY}s...${X}"
      sleep "$DELAY"
    fi
  done

  # Auto commit sau mỗi domain
  if [[ "$DRY_RUN" == false ]] && git -C "$SCRIPT_DIR/.." diff --quiet HEAD 2>/dev/null; then
    echo -e "  ${Y}⚠ Không có thay đổi để commit${X}"
  elif [[ "$DRY_RUN" == false ]]; then
    COMMIT_MSG="codex[$DOMAIN]: $D_SUCCESS/$TASK_COUNT tasks — $(date '+%Y-%m-%d %H:%M')"
    git -C "$SCRIPT_DIR/.." add -A 2>/dev/null || true
    git -C "$SCRIPT_DIR/.." commit -m "$COMMIT_MSG" >> "$LOG_FILE" 2>&1 || true
    echo -e "  ${G}✓ Committed: $COMMIT_MSG${X}"
  fi

  echo -e "\n  ${COLOR}$LABEL xong:${X} ${G}✓$D_SUCCESS${X}  ${R}✗$D_FAILED${X}\n"
done

# ── Tổng kết ─────────────────────────────────────────────────────
echo -e "${W}${C}$(printf '═%.0s' {1..58})${X}"
echo -e "${W}  Kết quả tổng:${X}"
echo -e "  ${G}✓ Thành công : $TOTAL_SUCCESS${X}"
[[ $TOTAL_FAILED  -gt 0 ]] && echo -e "  ${R}✗ Thất bại   : $TOTAL_FAILED${X}"
[[ $TOTAL_SKIPPED -gt 0 ]] && echo -e "  ${Y}⏭ Bỏ qua     : $TOTAL_SKIPPED${X}"
echo -e "  Log: ${C}$LOG_FILE${X}"
echo -e "${W}${C}$(printf '═%.0s' {1..58})${X}\n"

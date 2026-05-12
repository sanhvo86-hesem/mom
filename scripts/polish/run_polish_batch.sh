#!/usr/bin/env bash
# =============================================================================
# run_polish_batch.sh
# Polish Vietnamese prose cho 51 tài liệu còn lại (docs #2–52)
# Chạy song song, mỗi doc = 1 claude CLI session độc lập
#
# Usage:
#   bash run_polish_batch.sh            # concurrency = 4 (default)
#   bash run_polish_batch.sh 6          # concurrency = 6
#   bash run_polish_batch.sh 4 20 35    # chỉ chạy doc #20–35
#
# Yêu cầu: claude CLI + ssh alias "eqms" đã cấu hình
# =============================================================================

set -euo pipefail

CONCURRENCY=${1:-4}
FROM=${2:-2}
TO=${3:-52}
LOGDIR="$(dirname "$0")/polish_logs"
mkdir -p "$LOGDIR"

# --------------------------------------------------------------------------
# Danh sách 51 tài liệu: (số thứ tự, file_path, doc_code, tmp_filename)
# --------------------------------------------------------------------------
declare -a DOCS=(
  "02|02-Department-Handbooks/dept-engineering-handbook.html|DEPT-ENGINEERING-HANDBOOK|dept-engineering-handbook.html"
  "03|02-Department-Handbooks/dept-epicor-handbook.html|DEPT-EPICOR-HANDBOOK|dept-epicor-handbook.html"
  "04|02-Department-Handbooks/dept-executive-handbook.html|DEPT-EXECUTIVE-HANDBOOK|dept-executive-handbook.html"
  "05|02-Department-Handbooks/dept-finance-handbook.html|DEPT-FINANCE-HANDBOOK|dept-finance-handbook.html"
  "06|02-Department-Handbooks/dept-hr-handbook.html|DEPT-HR-HANDBOOK|dept-hr-handbook.html"
  "07|02-Department-Handbooks/dept-it-handbook.html|DEPT-IT-HANDBOOK|dept-it-handbook.html"
  "08|02-Department-Handbooks/dept-production-handbook.html|DEPT-PRODUCTION-HANDBOOK|dept-production-handbook.html"
  "09|02-Department-Handbooks/dept-quality-handbook.html|DEPT-QUALITY-HANDBOOK|dept-quality-handbook.html"
  "10|02-Department-Handbooks/dept-sales-and-customer-service-handbook.html|DEPT-SCS-HANDBOOK|dept-sales-and-customer-service-handbook.html"
  "11|02-Department-Handbooks/dept-supply-chain-handbook.html|DEPT-SCM-HANDBOOK|dept-supply-chain-handbook.html"
  "12|03-Job-Descriptions/01-JD-Executive/jd-chief-executive-officer.html|JD-CEO|jd-chief-executive-officer.html"
  "13|03-Job-Descriptions/01-JD-Executive/jd-production-director.html|JD-PRODIR|jd-production-director.html"
  "14|03-Job-Descriptions/02-JD-Production/jd-cleaning-and-packaging-supervisor.html|JD-CLNPKG-SUP|jd-cleaning-and-packaging-supervisor.html"
  "15|03-Job-Descriptions/02-JD-Production/jd-cleaning-packaging-technician.html|JD-CLNPKG-TECH|jd-cleaning-packaging-technician.html"
  "16|03-Job-Descriptions/02-JD-Production/jd-cnc-operator.html|JD-CNCO|jd-cnc-operator.html"
  "17|03-Job-Descriptions/02-JD-Production/jd-cnc-workshop-manager.html|JD-WKM|jd-cnc-workshop-manager.html"
  "18|03-Job-Descriptions/02-JD-Production/jd-deburr-team-lead.html|JD-DBR-LEAD|jd-deburr-team-lead.html"
  "19|03-Job-Descriptions/02-JD-Production/jd-deburr-technician.html|JD-DBR-TECH|jd-deburr-technician.html"
  "20|03-Job-Descriptions/02-JD-Production/jd-maintenance-technician.html|JD-MNT|jd-maintenance-technician.html"
  "21|03-Job-Descriptions/02-JD-Production/jd-production-engineer-industrial-engineer.html|JD-PE-IE|jd-production-engineer-industrial-engineer.html"
  "22|03-Job-Descriptions/02-JD-Production/jd-production-planner.html|JD-PP|jd-production-planner.html"
  "23|03-Job-Descriptions/02-JD-Production/jd-setup-technician.html|JD-SETUP|jd-setup-technician.html"
  "24|03-Job-Descriptions/02-JD-Production/jd-shift-leader.html|JD-SL|jd-shift-leader.html"
  "25|03-Job-Descriptions/03-JD-Engineering/jd-cam-nc-programmer.html|JD-CAMP|jd-cam-nc-programmer.html"
  "26|03-Job-Descriptions/03-JD-Engineering/jd-dfm-engineer.html|JD-DFM|jd-dfm-engineer.html"
  "27|03-Job-Descriptions/03-JD-Engineering/jd-engineering-lead-manager.html|JD-ENGM|jd-engineering-lead-manager.html"
  "28|03-Job-Descriptions/03-JD-Engineering/jd-process-engineer.html|JD-PRCE|jd-process-engineer.html"
  "29|03-Job-Descriptions/04-JD-Quality/jd-internal-auditor-outsource.html|JD-IAO|jd-internal-auditor-outsource.html"
  "30|03-Job-Descriptions/04-JD-Quality/jd-metrology-and-calibration-specialist.html|JD-MCS|jd-metrology-and-calibration-specialist.html"
  "31|03-Job-Descriptions/04-JD-Quality/jd-qa-manager.html|JD-QA|jd-qa-manager.html"
  "32|03-Job-Descriptions/04-JD-Quality/jd-qc-inspector-cmm-programmer-operator.html|JD-QC|jd-qc-inspector-cmm-programmer-operator.html"
  "33|03-Job-Descriptions/04-JD-Quality/jd-qc-inspector-lead.html|JD-QCL|jd-qc-inspector-lead.html"
  "34|03-Job-Descriptions/04-JD-Quality/jd-qms-engineer.html|JD-QMS|jd-qms-engineer.html"
  "35|03-Job-Descriptions/04-JD-Quality/jd-quality-engineer.html|JD-QE|jd-quality-engineer.html"
  "36|03-Job-Descriptions/05-JD-Supply-Chain/jd-buyer-purchasing.html|JD-BUY|jd-buyer-purchasing.html"
  "37|03-Job-Descriptions/05-JD-Supply-Chain/jd-logistics-shipping-coordinator.html|JD-LSC|jd-logistics-shipping-coordinator.html"
  "38|03-Job-Descriptions/05-JD-Supply-Chain/jd-supply-chain-manager.html|JD-SCM|jd-supply-chain-manager.html"
  "39|03-Job-Descriptions/05-JD-Supply-Chain/jd-tool-crib-tool-storekeeper.html|JD-TCR|jd-tool-crib-tool-storekeeper.html"
  "40|03-Job-Descriptions/05-JD-Supply-Chain/jd-warehouse-clerk.html|JD-WHC|jd-warehouse-clerk.html"
  "41|03-Job-Descriptions/06-JD-Sales/jd-customer-service.html|JD-CS|jd-customer-service.html"
  "42|03-Job-Descriptions/06-JD-Sales/jd-estimator.html|JD-EST|jd-estimator.html"
  "43|03-Job-Descriptions/07-JD-Finance/jd-ap-ar-and-payments-accountant.html|JD-APAR|jd-ap-ar-and-payments-accountant.html"
  "44|03-Job-Descriptions/07-JD-Finance/jd-finance-manager.html|JD-FIN|jd-finance-manager.html"
  "45|03-Job-Descriptions/07-JD-Finance/jd-general-ledger-and-payroll-accountant.html|JD-GLPR|jd-general-ledger-and-payroll-accountant.html"
  "46|03-Job-Descriptions/08-JD-HR/jd-hr-manager.html|JD-HR|jd-hr-manager.html"
  "47|03-Job-Descriptions/09-JD-EHS/jd-ehs-specialist.html|JD-EHS|jd-ehs-specialist.html"
  "48|03-Job-Descriptions/10-JD-IT/jd-epicor-system-administrator.html|JD-EPSA|jd-epicor-system-administrator.html"
  "49|03-Job-Descriptions/10-JD-IT/jd-it-admin.html|JD-ITA|jd-it-admin.html"
  "50|04-RACI-Authority/authority-matrix.html|ORG-AUTHORITY-MATRIX|authority-matrix.html"
  "51|04-RACI-Authority/raci-master-matrix.html|ORG-RACI-MASTER|raci-master-matrix.html"
  "52|04-RACI-Authority/role-and-department-bundles.html|ORG-ROLE-DEPT-BUNDLES|role-and-department-bundles.html"
)

# --------------------------------------------------------------------------
# Hàm sinh prompt cho một tài liệu
# --------------------------------------------------------------------------
make_prompt() {
  local num="$1" fpath="$2" code="$3" fname="$4"
  cat <<PROMPT
You are a Claude Code agent. Execute the following task autonomously using Bash tool. No interactive input needed.

TASK: Polish Vietnamese professional prose in ONE HTML document stored on VPS. Read → rewrite → publish.

═══ RULES — PRESERVE INTACT ═══
- All HTML tags, attributes (class, id, href, src, data-*, title, style)
- Everything inside <head>, <script>, <style> blocks
- data-dcc-bootstrap JSON attribute value
- HTML comments
- Doc codes: jd-*, dept-*, pol-*, sop-*, annex-*, wi-*, frm-*, org-*
- Role codes: CEO, QA, QC, WKM, PD, EHS, HR, ITA, EPSA, SL, CPS, DBL, SCM, BUY, CS, EST, FIN, CAMP, DFM, ENGM, PRCE, IAO, MCS, QCL, QMS, QE, LSC, TCR, WHC, MNT, PP, SETUP, CNCO, CLNPKG-SUP, CLNPKG-TECH, DBR-LEAD, DBR-TECH, PE-IE, APAR, GLPR, PRODIR
- Brand/system names: HESEM, Epicor, CMM, CNC, CAM, ERP, LOTO, PPE, CAPA, KPI, ISO, SOP, WI, ANNEX, RACI, NCR, CTQ, FOD, FIFO
- ISO clause refs: §5.2, §7.1, §8.5, §10.2, etc.
- entity-link anchor text is controlled by title="" — do NOT edit title="" content

═══ ONLY CHANGE ═══
Visible Vietnamese text nodes between HTML tags. Fix:
1. English words mixed into Vietnamese sentences (see dictionary below)
2. Awkward translated phrasing ("is responsible for", "will be", "shall")
3. Inconsistent capitalization in table cells (first word of each cell)
4. Mechanical word-for-word translations → natural office Vietnamese

═══ TERMINOLOGY DICTIONARY ═══
owner/responsible → đầu mối phụ trách
audit → đánh giá (nội bộ)
review → xem xét
compliance → tuân thủ
training → đào tạo
records → hồ sơ
incident → sự cố
near miss → sự cố cận
safety → an toàn
hazard → mối nguy
emergency → tình huống khẩn cấp
requirement → yêu cầu
escalate/escalated/escalation → báo cấp
decision → quyết định
support → hỗ trợ
leadership → lãnh đạo
schedule → lịch / kế hoạch
KPI → chỉ số KPI
CAPA → hành động khắc phục — phòng ngừa (CAPA)
first-off/first article → sản phẩm đầu loạt
CTQ → đặc tính chất lượng then chốt (CTQ)
outsource → gia công thuê ngoài
on-time delivery → giao hàng đúng hạn
containment → khoanh vùng
root cause → nguyên nhân gốc rễ
corrective action → hành động khắc phục
preventive action → hành động phòng ngừa
nonconformance/NCR → không phù hợp
rework → làm lại
scrap → phế phẩm
yield → tỷ lệ đạt
lead time → thời gian thực hiện
bottleneck → điểm thắt cổ chai
capacity → năng suất / công suất
preventive maintenance → bảo dưỡng phòng ngừa
measurement system → hệ thống đo lường
work instruction → hướng dẫn công việc
process control → kiểm soát quá trình
drill → diễn tập
permit → giấy phép công việc
LOTO (when in text, not acronym) → khóa cô lập (LOTO)
PPE (when in text) → phương tiện bảo vệ cá nhân (PPE)
repeated → tái diễn
bypass → bỏ qua quy trình
board (tracking) → bảng theo dõi
issue (noun) → vấn đề
kit → bộ dụng cụ
route (escape/path) → tuyến
trend → xu hướng
status → trạng thái
checklist → danh mục kiểm tra
fire (hỏa hoạn) → hỏa hoạn
critical → trọng yếu
depth → chiều sâu
readiness → mức sẵn sàng
active (incidents) → đang xử lý
contractor → nhà thầu
control gate → cửa kiểm soát
rule → quy tắc
interface → giao tiếp / yêu cầu
and (between two Vietnamese nouns) → và
risk → rủi ro
Owner (table header) → Đầu mối phụ trách
trend (table cell) → xu hướng
Human-factor drift → Sai lệch yếu tố con người
quality (as dept role) → Chất lượng
is responsible for → [active verb form]
will be / shall → [phải / sẽ / được — choose per context]
content (nội dung) → nội dung
due (deadline) → đến hạn
response kits → bộ dụng cụ ứng phó
route maps → sơ đồ tuyến thoát hiểm

═══ DOCUMENT TO PROCESS ═══
FILE: ${fpath}
CODE: ${code}
TMP:  /tmp/${fname}
VPS base: /var/www/eqms.hesemeng.com/mom/docs/system/organization/

═══ EXECUTE THESE STEPS IN ORDER ═══

Step 1 — Read file from VPS:
  ssh eqms "cat /var/www/eqms.hesemeng.com/mom/docs/system/organization/${fpath}"

Step 2 — Rewrite all visible text per rules and dictionary above.
  Write the complete edited HTML to /tmp/${fname} on local machine.
  (Use Write tool to create /tmp/${fname})

Step 3 — Upload to VPS:
  scp /tmp/${fname} eqms:/tmp/${fname}

Step 4 — Publish revision V1.1:
  ssh eqms "DB_PASS=E6SsB6SWtfKH8NJtlEEURNqd7AgL5 SKIP_BUMP=0 php /tmp/publish_doc_revision.php '${code}' 'mom/docs/system/organization/${fpath}' minor /tmp/${fname} 'Contextual Vietnamese prose polish V1.1 — office register, no mechanical substitution'"

Step 5 — Verify DB state:
  ssh eqms "sudo -u postgres psql -d mom -c \"SELECT doc_code, revision, status FROM dcc_document_header WHERE doc_code = '${code}';\""

Step 6 — Report result: DONE or ERROR with details.
PROMPT
}

# --------------------------------------------------------------------------
# Runner: chạy 1 document trong subshell, log vào file
# --------------------------------------------------------------------------
run_doc() {
  local entry="$1"
  IFS='|' read -r num fpath code fname <<< "$entry"

  # Bỏ qua nếu ngoài khoảng FROM–TO (10#$num forces decimal parsing for "08","09")
  if (( 10#$num < FROM || 10#$num > TO )); then
    return 0
  fi

  local logfile="$LOGDIR/doc_${num}_${code}.log"
  local prompt
  prompt="$(make_prompt "$num" "$fpath" "$code" "$fname")"

  echo "[$(date '+%H:%M:%S')] ▶ DOC $num — $code" | tee -a "$logfile"

  claude --dangerously-skip-permissions \
    --model claude-sonnet-4-6 \
    -p "$prompt" \
    >> "$logfile" 2>&1

  local exit_code=$?
  if [[ $exit_code -eq 0 ]]; then
    echo "[$(date '+%H:%M:%S')] ✓ DOC $num — $code DONE" | tee -a "$logfile"
  else
    echo "[$(date '+%H:%M:%S')] ✗ DOC $num — $code FAILED (exit $exit_code)" | tee -a "$logfile"
  fi
  return $exit_code
}

# --------------------------------------------------------------------------
# Parallel runner với concurrency limit
# --------------------------------------------------------------------------
active=0
pids=()
doc_nums=()

echo "=================================================="
echo " Polish batch: docs ${FROM}-${TO}, concurrency=${CONCURRENCY}"
echo " Logs: $LOGDIR"
echo "=================================================="

for entry in "${DOCS[@]}"; do
  IFS='|' read -r num _ _ _ <<< "$entry"
  (( 10#$num < FROM || 10#$num > TO )) && continue

  # Nếu đủ concurrency, chờ 1 child hoàn thành
  while (( active >= CONCURRENCY )); do
    for i in "${!pids[@]}"; do
      pid="${pids[$i]}"
      dnum="${doc_nums[$i]}"
      if ! kill -0 "$pid" 2>/dev/null; then
        wait "$pid" || true
        unset 'pids[$i]'
        unset 'doc_nums[$i]'
        (( active-- ))
        echo "[$(date '+%H:%M:%S')] slot freed (was doc $dnum), active=$active"
      fi
    done
    pids=("${pids[@]}")
    doc_nums=("${doc_nums[@]}")
    (( active >= CONCURRENCY )) && sleep 5
  done

  # Launch
  echo "[$(date '+%H:%M:%S')] → launching doc $num (active=$((active+1))/$CONCURRENCY)"
  run_doc "$entry" &
  pid=$!
  pids+=("$pid")
  doc_nums+=("$num")
  (( active++ ))
done

# Chờ tất cả còn lại
echo "[$(date '+%H:%M:%S')] All launched — waiting for remaining ${#pids[@]} jobs..."
for pid in "${pids[@]}"; do
  wait "$pid" || true
done

echo ""
echo "=================================================="
echo " BATCH COMPLETE"
echo " Check logs in: $LOGDIR"
echo " Quick summary:"
echo "=================================================="
grep -h "✓\|✗" "$LOGDIR"/doc_*.log 2>/dev/null | sort || true

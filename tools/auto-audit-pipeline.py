#!/usr/bin/env python3
"""
auto-audit-pipeline.py
======================
Pipeline tự động — phản chiếu đúng 4 GPT Pro chat của bạn:

  Chat 1: EQMS     → audit Quality Management System
  Chat 2: AI       → audit AI/ML features & intelligence layer
  Chat 3: Frontend → audit UI/UX, components, API contracts
  Chat 4: Backend  → audit API, services, DB, performance

Mỗi domain chạy song song → tổng hợp → Codex fix → re-audit → lặp.

Cài đặt:
    pip install openai --break-system-packages

Cấu hình:
    export OPENAI_API_KEY="sk-..."

Chạy:
    python3 tools/auto-audit-pipeline.py              # 2 rounds mặc định
    python3 tools/auto-audit-pipeline.py --rounds 3  # 3 rounds
    python3 tools/auto-audit-pipeline.py --dry-run   # thử, không động code
    python3 tools/auto-audit-pipeline.py --domain backend  # chỉ 1 domain
"""

import os, sys, json, subprocess, argparse, textwrap, time, concurrent.futures
from datetime import datetime
from pathlib import Path

# ── Màu terminal ──────────────────────────────────────────────────────────────
R="\033[0;31m"; G="\033[0;32m"; Y="\033[1;33m"; B="\033[0;34m"
C="\033[0;36m"; M="\033[0;35m"; W="\033[1m"; X="\033[0m"

# ── Paths ─────────────────────────────────────────────────────────────────────
REPO_ROOT  = Path(__file__).parent.parent
AI_DIR     = REPO_ROOT / ".ai"
TOOLS_DIR  = REPO_ROOT / "tools"
LOG_DIR    = TOOLS_DIR / "audit-logs"

# ── Config ────────────────────────────────────────────────────────────────────
GPT_MODEL           = "gpt-4o"
DELAY_BETWEEN_TASKS = 8    # giây giữa mỗi Codex call
MAX_TASKS_PER_DOMAIN = 6   # tasks mỗi domain mỗi round (6 domain × 6 = tối đa 24/round)

# ══════════════════════════════════════════════════════════════════════════════
# ĐỊNH NGHĨA 4 DOMAIN SPECIALISTS — phản chiếu 4 GPT Pro chat của bạn
# ══════════════════════════════════════════════════════════════════════════════
DOMAINS = {
    "eqms": {
        "label":  "EQMS — Quality Management",
        "color":  G,
        "icon":   "🟢",
        "system_prompt": """
Bạn là chuyên gia EQMS (Enterprise Quality Management System) hàng đầu thế giới,
ngang tầm Siemens Opcenter Quality, SAP QM, Honeywell QMS.

Tập trung audit NGHIÊM KHẮC các mảng:
- Non-conformance management (NCR, CAPA, 8D)
- Inspection & SPC (Statistical Process Control)
- Document control & audit trails
- Supplier quality management
- ISO 9001 / IATF 16949 / ISO 13485 compliance
- Risk management & FMEA workflows
- Calibration & measurement system analysis
- Quality KPI dashboards & reporting

Tiêu chí đánh giá: correctness, traceability, compliance, auditability, data integrity.
""",
        "focus_files": ["quality_improvement", "procurement_supplier_quality"],
    },
    "ai": {
        "label":  "AI — Intelligence & Analytics Layer",
        "color":  M,
        "icon":   "🟣",
        "system_prompt": """
Bạn là AI/ML architect hàng đầu cho hệ thống ERP/MOM công nghiệp,
ngang tầm Siemens Industrial AI, GE Predix, PTC ThingWorx Analytics.

Tập trung audit NGHIÊM KHẮC các mảng:
- Predictive maintenance & anomaly detection
- Demand forecasting & production planning AI
- Quality prediction & defect detection
- OEE optimization algorithms
- AI-driven scheduling & dispatching
- Analytics dashboards & KPI intelligence
- Data pipeline & feature engineering
- Model serving, versioning, drift detection
- Integration với IoT sensor data

Tiêu chí: accuracy, latency, explainability, data quality, model governance.
""",
        "focus_files": ["analytics", "planning_production"],
    },
    "frontend": {
        "label":  "Frontend — UI/UX & API Contracts",
        "color":  Y,
        "icon":   "🟡",
        "system_prompt": """
Bạn là Frontend architect & UX specialist cho ERP/MOM enterprise,
ngang tầm SAP Fiori UX, Oracle Redwood, Siemens Opcenter UI.

Tập trung audit NGHIÊM KHẮC các mảng:
- API contract consistency (request/response schemas)
- Frontend performance (bundle size, lazy loading, caching)
- UX workflows (operator ergonomics, click efficiency)
- Real-time data display (WebSocket, SSE, polling strategy)
- Responsive design cho shop-floor tablets & monitors
- Error handling & user feedback patterns
- Accessibility (WCAG compliance)
- Form validation & data entry UX
- Dashboard & visualization best practices
- API versioning & backward compatibility

Tiêu chí: usability, performance, consistency, accessibility, API contract integrity.
""",
        "focus_files": ["commercial_customer", "core_infrastructure"],
    },
    "backend": {
        "label":  "Backend — API, Services & Database",
        "color":  B,
        "icon":   "🔵",
        "system_prompt": """
Bạn là Backend architect & DBA hàng đầu cho hệ thống ERP/MOM enterprise,
ngang tầm SAP S/4HANA backend, Oracle ERP Cloud, Microsoft Dynamics 365.

Tập trung audit NGHIÊM KHẮC các mảng:
- API design & REST best practices
- Database performance (indexes, query plans, N+1 problems)
- Transaction management & data consistency (ACID)
- Service layer architecture & separation of concerns
- Authentication, authorization & security (OWASP Top 10)
- Caching strategy (Redis) & cache invalidation
- Message queue patterns (RabbitMQ)
- Error handling, logging & observability
- Migration safety & schema evolution
- Rate limiting, circuit breakers, resilience patterns
- Multi-tenant data isolation

Tiêu chí: performance, security, scalability, reliability, maintainability.
""",
        "focus_files": ["core_infrastructure", "finance", "inventory_logistics", "master_data"],
    },
}

# ── Load repo context từ .ai/ index ──────────────────────────────────────────
def load_repo_context(focus_domains: list[str], max_chars: int = 6000) -> str:
    parts = []

    # Repo map (luôn cần)
    for fname, label in [("repo-map.json", "Project Topology"), ("db-map.json", "Database Schema")]:
        fpath = AI_DIR / fname
        if fpath.exists():
            try:
                data = json.loads(fpath.read_text())
                content = json.dumps(data, indent=2, ensure_ascii=False)[:1500]
                parts.append(f"## {label}\n{content}\n...(truncated)")
            except:
                pass

    # Module summaries liên quan đến domain
    summaries_dir = AI_DIR / "module-summaries"
    if summaries_dir.exists():
        for domain_key in focus_domains:
            md_file = summaries_dir / f"{domain_key}.md"
            if md_file.exists():
                content = md_file.read_text(encoding="utf-8")[:800]
                parts.append(f"## Module: {domain_key}\n{content}")

    return "\n\n".join(parts)[:max_chars]


# ── Gọi GPT cho 1 domain ──────────────────────────────────────────────────────
def audit_domain(client, domain_key: str, round_num: int, pending_issues: list[str]) -> dict:
    """1 GPT call cho 1 domain — chạy song song với 3 domain kia."""
    domain = DOMAINS[domain_key]
    color  = domain["color"]
    label  = domain["label"]

    print(f"  {color}→ [{label}] Đang gửi lên GPT-4o...{X}")

    repo_ctx = load_repo_context(domain["focus_files"])

    pending_str = ""
    domain_pending = [i for i in pending_issues if domain_key in i.lower()]
    if domain_pending:
        pending_str = "\n\nTỒN ĐỌNG CHƯA XỬ LÝ (BẮT BUỘC ưu tiên):\n" + \
                      "\n".join(f"- {p}" for p in domain_pending[-10:])

    user_msg = f"""
Round {round_num} — {label}

Codebase context:
{repo_ctx}
{pending_str}

Yêu cầu:
Tạo CHÍNH XÁC {MAX_TASKS_PER_DOMAIN} Codex CLI prompts để fix các vấn đề nghiêm trọng nhất.

Mỗi Codex prompt PHẢI:
1. Chỉ định rõ file/class/method cần sửa
2. Yêu cầu Codex triển khai 6 agents song song:
   - Agent 1: Audit & phân tích vấn đề hiện tại
   - Agent 2: Research global best practices
   - Agent 3: Implement fix
   - Agent 4: Viết unit/integration tests
   - Agent 5: Code review & security check
   - Agent 6: Update documentation
3. Kết thúc với yêu cầu re-audit nghiêm khắc sau khi fix

Trả lời JSON:
{{
  "audit_summary": "Tình trạng {domain_key} (2-3 câu)",
  "critical_issues": ["issue 1", "issue 2"],
  "tasks": [
    {{
      "priority": "CRITICAL|HIGH|MEDIUM",
      "title": "Tên ngắn",
      "prompt": "Prompt đầy đủ cho Codex CLI"
    }}
  ]
}}
"""

    try:
        response = client.chat.completions.create(
            model=GPT_MODEL,
            messages=[
                {"role": "system", "content": domain["system_prompt"]},
                {"role": "user",   "content": user_msg},
            ],
            response_format={"type": "json_object"},
            temperature=0.2,
        )
        result = json.loads(response.choices[0].message.content)
        result["domain"] = domain_key
        result["label"]  = label
        print(f"  {color}✓ [{label}] {len(result.get('tasks',[]))} tasks{X}")
        return result
    except Exception as e:
        print(f"  {R}✗ [{label}] GPT lỗi: {e}{X}")
        return {"domain": domain_key, "label": label,
                "audit_summary": f"Error: {e}", "critical_issues": [], "tasks": []}


# ── Chạy Codex cho 1 task ─────────────────────────────────────────────────────
def run_codex_task(task: dict, task_num: int, total: int, dry_run: bool) -> bool:
    pcolor = {
        "CRITICAL": R, "HIGH": Y, "MEDIUM": B
    }.get(task.get("priority", "MEDIUM"), X)
    dcolor = DOMAINS.get(task.get("domain",""), {}).get("color", X)

    print(f"\n  {W}[{task_num}/{total}]{X} "
          f"{dcolor}[{task.get('domain','?').upper()}]{X} "
          f"[{pcolor}{task.get('priority','?')}{X}] "
          f"{task.get('title','?')}")

    prompt = task.get("prompt", "")
    if not prompt:
        print(f"    {R}✗ Không có prompt{X}")
        return False

    print(f"    {C}{textwrap.shorten(prompt, 110, placeholder='...')}{X}")

    if dry_run:
        print(f"    {Y}[DRY-RUN]{X}")
        return True

    try:
        result = subprocess.run(
            ["codex", "--approval-mode", "full-auto", prompt],
            cwd=REPO_ROOT, timeout=600,
        )
        ok = result.returncode == 0
        print(f"    {G if ok else R}{'✓ OK' if ok else '✗ Failed'}{X}")
        return ok
    except subprocess.TimeoutExpired:
        print(f"    {R}✗ Timeout (10 phút){X}")
        return False
    except FileNotFoundError:
        print(f"    {R}✗ 'codex' không tìm thấy. Cài: npm install -g @openai/codex{X}")
        sys.exit(1)


# ── Git commit ────────────────────────────────────────────────────────────────
def git_commit(message: str):
    try:
        r = subprocess.run(["git", "diff", "--stat"], cwd=REPO_ROOT,
                           capture_output=True, text=True)
        if not r.stdout.strip():
            print(f"  {Y}⚠ Không có thay đổi để commit{X}")
            return
        subprocess.run(["git", "add", "-A"], cwd=REPO_ROOT, check=True)
        subprocess.run(["git", "commit", "-m", message], cwd=REPO_ROOT, check=True)
        print(f"  {G}✓ Committed: {message[:70]}{X}")
    except subprocess.CalledProcessError as e:
        print(f"  {R}⚠ Git error: {e}{X}")


# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--rounds",    type=int, default=2)
    parser.add_argument("--dry-run",   action="store_true")
    parser.add_argument("--no-commit", action="store_true")
    parser.add_argument("--domain",    choices=list(DOMAINS.keys()),
                        help="Chỉ chạy 1 domain thay vì cả 4")
    args = parser.parse_args()

    api_key = os.environ.get("OPENAI_API_KEY", "")
    if not api_key:
        print(f"{R}Cần: export OPENAI_API_KEY='sk-...'{X}")
        sys.exit(1)

    try:
        from openai import OpenAI
        client = OpenAI(api_key=api_key)
    except ImportError:
        print(f"{R}Cài: pip install openai --break-system-packages{X}")
        sys.exit(1)

    active_domains = [args.domain] if args.domain else list(DOMAINS.keys())

    # ── Banner ────────────────────────────────────────────────────────────────
    print(f"\n{W}{C}{'═'*60}{X}")
    print(f"{W}  🔁 MOM ERP Auto Audit Pipeline — 4 Domain Specialists{X}")
    print(f"  Domains : {' | '.join(DOMAINS[d]['icon']+' '+d for d in active_domains)}")
    print(f"  Rounds  : {Y}{args.rounds}{X}  |  Tasks/domain: {Y}{MAX_TASKS_PER_DOMAIN}{X}")
    print(f"  Dry-run : {Y}{args.dry_run}{X}  |  Model: {Y}{GPT_MODEL}{X}")
    print(f"{W}{C}{'═'*60}{X}")

    pending_issues: list[str] = []
    LOG_DIR.mkdir(parents=True, exist_ok=True)

    for round_num in range(1, args.rounds + 1):
        print(f"\n{W}{B}{'─'*60}{X}")
        print(f"{W}  ROUND {round_num}/{args.rounds} — 4 domains chạy song song{X}")
        print(f"{W}{B}{'─'*60}{X}\n")

        # ── BƯỚC 1: 4 GPT calls song song ─────────────────────────────────
        print(f"{W}[Step 1] GPT-4o audit 4 domains đồng thời...{X}")
        domain_results: dict[str, dict] = {}

        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
            futures = {
                executor.submit(audit_domain, client, dk, round_num, pending_issues): dk
                for dk in active_domains
            }
            for future in concurrent.futures.as_completed(futures):
                dk = futures[future]
                try:
                    domain_results[dk] = future.result()
                except Exception as e:
                    print(f"  {R}✗ [{dk}] Exception: {e}{X}")
                    domain_results[dk] = {"domain": dk, "tasks": [], "critical_issues": []}

        # ── BƯỚC 2: Tổng hợp & sắp xếp theo priority ──────────────────────
        print(f"\n{W}[Step 2] Tổng hợp tasks từ 4 domains...{X}")

        all_tasks = []
        for dk in active_domains:
            res = domain_results.get(dk, {})
            summary  = res.get("audit_summary", "")
            critical = res.get("critical_issues", [])
            tasks    = res.get("tasks", [])

            dcolor = DOMAINS[dk]["color"]
            print(f"\n  {dcolor}{DOMAINS[dk]['icon']} {DOMAINS[dk]['label']}{X}")
            print(f"  {summary}")
            if critical:
                for c in critical[:3]:
                    print(f"  {R}• {c}{X}")

            for t in tasks:
                t["domain"] = dk
            all_tasks.extend(tasks)

            # Lưu issues để round sau xử lý
            pending_issues.extend([f"[{dk}] {c}" for c in critical])

        # Sắp xếp: CRITICAL trước
        priority_order = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2}
        all_tasks.sort(key=lambda t: priority_order.get(t.get("priority","MEDIUM"), 2))

        total_tasks = len(all_tasks)
        print(f"\n  {W}Tổng cộng: {total_tasks} tasks{X} "
              f"({sum(1 for t in all_tasks if t.get('priority')=='CRITICAL')} CRITICAL, "
              f"{sum(1 for t in all_tasks if t.get('priority')=='HIGH')} HIGH)")

        # Lưu ra file để xem/edit nếu cần
        tasks_file = TOOLS_DIR / f"tasks-round-{round_num:02d}.txt"
        with tasks_file.open("w", encoding="utf-8") as f:
            f.write(f"# Round {round_num} — {datetime.now().strftime('%Y-%m-%d %H:%M')}\n\n")
            for dk in active_domains:
                res = domain_results.get(dk, {})
                f.write(f"# ══ {DOMAINS[dk]['label']} ══\n")
                f.write(f"# {res.get('audit_summary','')}\n\n")
                for t in res.get("tasks", []):
                    f.write(f"# [{t.get('priority')}] {t.get('title','')}\n")
                    f.write(t.get("prompt","") + "\n\n")
        print(f"  {C}Saved: {tasks_file.name}{X}")

        if not all_tasks:
            print(f"  {Y}Không có task nào. Kết thúc.{X}")
            break

        # ── BƯỚC 3: Codex chạy từng task theo thứ tự priority ─────────────
        print(f"\n{W}[Step 3] Codex chạy {total_tasks} tasks (full-auto)...{X}")

        success = failed = 0
        for i, task in enumerate(all_tasks, 1):
            ok = run_codex_task(task, i, total_tasks, args.dry_run)
            if ok:
                success += 1
            else:
                failed += 1
                pending_issues.append(
                    f"[FAILED-R{round_num}][{task.get('domain','')}] "
                    f"{task.get('title','')}: {task.get('prompt','')[:150]}"
                )
            if i < total_tasks:
                time.sleep(DELAY_BETWEEN_TASKS)

        # ── BƯỚC 4: Auto commit ────────────────────────────────────────────
        if not args.no_commit and not args.dry_run:
            msg = (f"codex-audit: round {round_num} — "
                   f"{success}/{total_tasks} tasks OK — "
                   f"{datetime.now().strftime('%Y-%m-%d %H:%M')}")
            git_commit(msg)

        # ── Log ────────────────────────────────────────────────────────────
        log_file = LOG_DIR / f"round-{round_num:02d}-{datetime.now().strftime('%Y%m%d-%H%M%S')}.json"
        log_file.write_text(json.dumps({
            "round": round_num,
            "timestamp": datetime.now().isoformat(),
            "domains": {dk: domain_results.get(dk,{}) for dk in active_domains},
            "tasks_total": total_tasks,
            "success": success,
            "failed": failed,
            "pending_issues_accumulated": len(pending_issues),
        }, indent=2, ensure_ascii=False))

        # ── Round summary ──────────────────────────────────────────────────
        print(f"\n{W}  Round {round_num} xong:{X} "
              f"{G}✓ {success}{X}  {R}✗ {failed}{X}  "
              f"Tồn đọng: {Y}{len(pending_issues)}{X}")

        if round_num < args.rounds:
            print(f"\n  {Y}⏳ 20s trước round {round_num+1} (GPT + Codex cần nghỉ)...{X}")
            time.sleep(20)

    # ── Kết thúc ──────────────────────────────────────────────────────────────
    print(f"\n{W}{C}{'═'*60}{X}")
    print(f"{W}  ✅ Pipeline hoàn thành — {args.rounds} rounds{X}")
    print(f"  Logs: {C}{LOG_DIR}{X}")
    print(f"{W}{C}{'═'*60}{X}\n")


if __name__ == "__main__":
    main()

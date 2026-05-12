# 12-Week Deployment Playbook · Codex Author Prompt Packs

This folder holds the prompt packs used to fill the 12 weekly playbook scaffolds
at `mom/docs/training/system-ops/03-Deploy-Playbook/TRN-DEP-W01..W12.html`.

Run the 4 packs in **parallel** (one Codex agent per pack, 3 weeks each):

| Pack | Weeks | Focus | Date range |
|---|---|---|---|
| [PROMPT_PACK_1.md](PROMPT_PACK_1.md) | W01 · W02 · W03 | P0 kickoff → P1 RACI freeze → P2 Pilot QA start | 16/05 → 30/05/2026 |
| [PROMPT_PACK_2.md](PROMPT_PACK_2.md) | W04 · W05 · W06 | P2 Pilot gate → Wave 2 go-live → Wave 2 mid-review | 06/06 → 20/06/2026 |
| [PROMPT_PACK_3.md](PROMPT_PACK_3.md) | W07 · W08 · W09 | Wave Production go-live → Hypercare → Wave 3 kickoff | 27/06 → 11/07/2026 |
| [PROMPT_PACK_4.md](PROMPT_PACK_4.md) | W10 · W11 · W12 | Wave 3 stabilize → Lessons learned → Handoff | 18/07 → 01/08/2026 |

## Shared context (every pack includes this verbatim)

See [SHARED_CONTEXT.md](SHARED_CONTEXT.md). Every pack appends this block so each
author has the same factual base (week schedule, KPI catalog, doc-code registry,
framework citations).

## Cross-pack invariants

1. Each pack fills 3 HTML files. The agent must **never** touch a file outside its
   3-week scope. Cross-week consistency is achieved by every pack quoting the
   same SHARED_CONTEXT.
2. Output must be DCC-compliant: keep the existing `<head>`, the `<div class="dcc-header" …>`,
   and the `<div class="doc-content" id="docContent">` wrapper. Only fill the
   12 sections inside `<div class="doc-content">`.
3. Remove the orange `.pending-fill` warning block after filling all 12 sections.
4. **No fabricated employee names.** Use role codes only (CEO, QMS_MGR, QA_MGR,
   PROD_DIR, ENG_MGR, SCM_MGR, SALES_MGR, FIN_MGR, HR_MGR, IT_MGR, EHS_MGR,
   EPICOR_ADMIN, …). The portal resolves role codes to live users from `users.json`.
5. Vietnamese with full diacritics (per CLAUDE.md memory). Backend identifiers
   stay English (table names, column names, doc codes).
6. Every gate condition must be measurable. Forbidden phrases: "đảm bảo chất lượng",
   "tuân thủ đầy đủ", "phù hợp" without metric. Required pattern: `<thing> = <threshold>`
   with explicit unit and evidence source (e.g. `Sev-1 count = 0 trong 5 ngày làm việc · evidence: issues.json`).
7. Word-count floor per file: **≥3000 words** (Vietnamese). Sub-2000-word files
   will be rejected as too thin to act on.

## Verification after Codex finishes

After all 12 files are filled:

```bash
# 1. DCC audit — header sanity
php mom/tools/dcc-batch/audit.php --filter-prefix=TRN-DEP

# 2. DB upsert — insert/update dcc_document_header rows
php mom/tools/dcc-batch/migrate.php --filter-prefix=TRN-DEP

# 3. Deploy
git add mom/docs/training/system-ops/03-Deploy-Playbook/ && git commit -m "docs(deploy-playbook): fill W01-W12 details"
git push origin main   # triggers GitHub Actions deploy

# 4. Verify in Chrome
# Visit eqms.hesemeng.com, login as CEO, navigate to Triển khai vận hành tab,
# click any week, click "📖 Mở Playbook" — doc should render with full content.
```

# P16 — Rollback and Release Readiness Plan

| Field | Value |
|---|---|
| Package | `HESEM_UOM_PROMPT_OS_V1_2026-05-28` |
| Slice | P16 / artifact 2 of 3 |
| Date sealed | 2026-05-29 |

## 1. Purpose

Specify the rollback playbook + release-readiness checklist that gates the merge of PR #74 to `main` and the subsequent pre-production-to-production transition.

## 2. Release readiness checklist

| # | Item | Status |
|---|---|---|
| 1 | All P-prompts (P00–P18) have all required output files | (in progress this commit) |
| 2 | All IMPL-prompts (IMPL-00–IMPL-07) have all required output files | done |
| 3 | Migrations 214–230 applied on staging + production-target | confirmed VPS |
| 4 | PHPStan clean on the branch | confirmed |
| 5 | Tests pack runs (G-001 tracked) | confirmed |
| 6 | KPI integrity passes | confirmed |
| 7 | Migration drift detector reports no P1 findings | confirmed (P2 pre-existing only) |
| 8 | Scanner full scan returns OK on live | confirmed |
| 9 | Live VPS smoke probes pass (LV-001..LV-011) | confirmed |
| 10 | VRS-001 7-case pack passes | confirmed |
| 11 | OpenAPI block in `mom/api/openapi.yaml` (OG-001) | open |
| 12 | PSR-4 exception split (G-001) | open |
| 13 | Canonical contracts emission (G-003) | open |
| 14 | Tamper-detect-on-every-read wiring | open (planned IMPL-07 follow-up) |
| 15 | Signature payload table + nonce + reason (RT-001) | open |

## 3. Rollback playbook

### Case 1 — main-branch rollback after merge

| Step | Action |
|---|---|
| 1 | Identify offending commit |
| 2 | Open revert PR via `git revert <sha> --no-edit` |
| 3 | Run full CI on revert PR |
| 4 | Merge revert; deploy.yml re-deploys without the offending change |
| 5 | UoM catalog state is preserved (migrations forward-only) |

### Case 2 — catalog mutation gone wrong

| Step | Action |
|---|---|
| 1 | Identify the bad rule_code |
| 2 | Open admin UI → Workflow → retire the rule (this is itself an audited action) |
| 3 | Author a corrective forward rule via submitForReview → approve → esign |
| 4 | Workflow activates corrective rule on its `effective_from` |
| 5 | Historic MEASVAL envelopes pinned to the old rule_version remain valid |

### Case 3 — VPS deploy reverts api/index.php (current known issue)

| Step | Action |
|---|---|
| 1 | Detect via curl smoke: `GET /api/v1/uom/health → unknown_action` |
| 2 | SCP `mom/api/index.php` + UoM service tree from local branch |
| 3 | `sudo systemctl reload php8.5-fpm` |
| 4 | Re-run smoke probes |
| 5 | Permanent fix: merge PR #74 to `main` so `api/index.php` is canonical |

### Case 4 — DB tamper detected

| Step | Action |
|---|---|
| 1 | Bridge re-wrap emits `uom.measval.tamper_detected` event |
| 2 | Admin notification sent (planned) |
| 3 | Metrology + security investigate the specific row |
| 4 | Capture DBA query log; correlate to actor |
| 5 | If false-positive (display field mistakenly hashed), engine config fix |
| 6 | If actual tamper, recompute envelope from sources + open incident |

## 4. Release lanes

| Lane | Audience | Cutover |
|---|---|---|
| Development branch | this PR | continuous push |
| Pre-production | staging environment | manual deploy |
| Production canary (future) | 5% traffic | once production-cutover gate passes |
| Production full | 100% traffic | once canary clean for N days |

## 5. Decision ledger

| ID | Decision | Authority |
|---|---|---|
| RD-001 | Forward-only rollback for catalog state | audit integrity |
| RD-002 | Revert PR for code-only rollback | git history hygiene |
| RD-003 | api/index.php re-deploy pattern is a known workaround until PR #74 merges | release engineering |
| RD-004 | Tamper investigation has a dedicated SOP | regulated incident management |

## 6. Gap register

| Severity | ID | Gap | Plan |
|---|---|---|---|
| medium | RRG-001 | Production canary lane not yet implemented in deploy.yml | release engineering |
| medium | RRG-002 | Admin notification on tamper event not yet wired | follow-up |
| low | RRG-003 | Per-tenant traffic gating not applicable (single-tenant in v1) | n/a |

## 7. Audit scorecard

| Axis | Score |
|---|---|
| Checklist completeness | 9 |
| Rollback playbook clarity | 10 |
| Forward-only discipline | 10 |
| Lane management | 8 |
| **Total** | **37 / 40** |

## 8. Final token

`UOM_PROMPT_PASS_WITH_MINOR_REPAIRS_READY_FOR_NEXT`

## 9. Cross-references

- Sibling: `mom/docs/architecture/uom-measurement-conversion-v1/observability-reliability-plan.md` (P16 / 1)
- Audit: `_reports/uom-measurement-conversion-v1/p16-operational-readiness-redteam.md` (P16 / 3)

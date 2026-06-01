# MDA Platform Content Deploy Audit

Generated: 2026-06-01T17:11:52+07:00

Scope: Master Data Authority Platform content only. This explicitly excludes the earlier P1-P4 graphics/sidebar audit path.

## Source Truth Audit

| Evidence | Result |
| --- | --- |
| Local branch | `codex/mda-content-deploy-audit-20260601` from `origin/main` |
| Production branch/head | `main` at `2a5b73cd` before this repair |
| MDA V1 artifact path | `_reports/agent-audits/mda-prompt-os-2026-05-29` |
| Local tracked count | 182 files |
| VPS tracked/file count | 182/182 files |
| VPS dirty status in MDA V1 artifact path | 0 dirty files |
| Raw report URL | HTTP 403 for `_reports/.../MDA_FINAL_MASTER_BUILD_PLAN.md` |
| V4 runtime closure path | Not on production main; remains on separate MDA V4 recovery branch |

## Findings

| ID | Severity | Finding | Root Cause | Repair |
| --- | --- | --- | --- | --- |
| MDA-DEPLOY-001 | Pass | MDA V1/P00-P21 files are present on VPS and not overwritten. | Git-tracked artifact set is on current production main. | No content repair needed. |
| MDA-DEPLOY-002 | P1 publish gap | Chrome cannot read raw MDA report artifacts because `_reports` is blocked with HTTP 403. | `_reports` is a repo artifact directory, not a served document surface. | Add a read-only served dashboard under `mom/docs/system/agent-reports/mda-platform/`. |
| MDA-DEPLOY-003 | P1 overclaim risk | MDA V4 runtime closure is not deployed on main/VPS. | V4 branch is separate and still diverged from `origin/main`; deploying it wholesale would mix UOM/runtime/graphics deltas. | State explicitly that V4 is not live and do not claim runtime closure. |
| MDA-DEPLOY-004 | P2 VPS risk | VPS working tree has unrelated dirty files. | Prior live document/config edits exist outside this task. | Publish only new read-only dashboard paths and avoid overwriting existing dirty files. |

## Local Browser Smoke

Local URL: `http://127.0.0.1:18091/mom/docs/system/agent-reports/mda-platform/index.html`

Result:

- HTML status: 200
- JSON manifest status: 200
- Title rendered: `Deployment audit cho bộ nội dung MDA`
- Status badge count: 4
- Console/page errors: 0

## Decision

`MDA_CONTENT_PUBLISH_REPAIR_READY_FOR_DEPLOY`

The MDA content exists on VPS, but a served browser-facing dashboard is required for Chrome verification.

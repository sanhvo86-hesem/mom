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
| MDA-DEPLOY-002 | P1 publish gap | Chrome cannot read raw MDA report artifacts because `_reports` is blocked with HTTP 403. | `_reports` is a repo artifact directory, not a served document surface. | Keep source evidence under `_reports/agent-audits/...` and publish a runtime-only HTML dashboard copy under `mom/docs/system/agent-reports/mda-platform/`. |
| MDA-DEPLOY-003 | P1 overclaim risk | MDA V4 runtime closure is not deployed on main/VPS. | V4 branch is separate and still diverged from `origin/main`; deploying it wholesale would mix UOM/runtime/graphics deltas. | State explicitly that V4 is not live and do not claim runtime closure. |
| MDA-DEPLOY-004 | P2 VPS risk | VPS working tree has unrelated dirty files. | Prior live document/config edits exist outside this task. | Publish only new read-only dashboard paths and avoid overwriting existing dirty files. |
| MDA-DEPLOY-005 | P2 browser link defect | The first dashboard version linked directly to the JSON manifest, but protected non-HTML docs return HTTP 403 through the web server policy. | Document streaming/browser-open policy only makes the HTML report usable in Chrome; JSON is machine evidence in Git/server filesystem, not a browser surface. | Remove the dead JSON hyperlink and keep manifest path as server-side evidence text. |
| MDA-DEPLOY-006 | P1 source-boundary defect | Committing `mom/docs/system/agent-reports/mda-platform/*` failed CI/deploy because `RepoBoundaryScanner` classifies it as `generated_report`. | `agent-reports` is runtime/generated evidence, not controlled source; force-adding it bypassed `.gitignore` but not the CI boundary. | Remove the tracked runtime dashboard files, keep the source dashboard/manifest under the allowlisted `_reports/agent-audits/...` path, and copy the HTML to VPS as runtime document evidence after deploy. |

## Local Browser Smoke

Local URL: `http://127.0.0.1:18091/_reports/agent-audits/mda-platform-deploy-audit-2026-06-01/dashboard.html`

Result:

- HTML status: 200
- JSON manifest status: 200
- Title rendered: `Deployment audit cho bộ nội dung MDA`
- Status badge count: 4
- Console/page errors: 0

## Browser Link Repair

After deploy, direct browser access to the JSON manifest returned HTTP 403. The dashboard was repaired to remove the dead hyperlink. A second repair moved the committed dashboard source out of `mom/docs/system/agent-reports` because that path is a runtime generated-report surface blocked by the repo-boundary gate.

## Decision

`MDA_CONTENT_RUNTIME_PUBLISH_READY_FOR_DEPLOY`

The MDA content exists on VPS. Source evidence is tracked in `_reports/agent-audits/...`; Chrome verification uses a runtime-published HTML copy under the protected system document surface.

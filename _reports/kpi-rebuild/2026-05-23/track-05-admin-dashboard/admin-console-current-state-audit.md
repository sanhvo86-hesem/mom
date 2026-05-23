# Track 05 Admin Console Current-State Audit

Date: 2026-05-23
Branch: `codex/kpi-t5-admin-dashboard`
Mode: audit existing Admin Console first, then harden in place.

## Sources Read

- Prompt pack zip: all nine markdown/json prompt files from `codex_kpi_rebuild_prompts_md_v3_2026-05-23.zip`.
- Universal guardrails and Track 05 prompt.
- Present Track 02, 03, 04 reports under `_reports/kpi-rebuild/2026-05-23/`.
- `mom/data/registry/kpi-authority-registry.json`
- `mom/api/services/KpiRegistryAdminService.php`
- `mom/api/services/KpiEngine.php`
- `mom/api/controllers/AdminController.php`
- `mom/api/controllers/DashboardController.php`
- `mom/api/routes/core-routes.php`
- `mom/scripts/portal/00o-admin-kpi-registry.js`
- `mom/scripts/portal/12-kpi-badge-renderer.js`
- `mom/scripts/portal/13-jd-scorecard-renderer.js`

Track 01 report was not present on this branch. Track 02 confirmed runtime/source drift risks and staged scorecard candidates. Track 04 confirmed JD scorecards are complete but still legacy active-only.

## Current Facts Before Track 05

| Item | Fact |
|---|---:|
| Registry schema_version | 16 |
| Registry version | 2026-05-21 |
| Governance KPI rows | 33 |
| Gate control metric rows | 21 |
| Proposed operating metric rows | 71 |
| JD scorecard roles | 39 |
| Runtime catalog metric codes | 132 |
| Admin data-contract rows after hardening | 125 |
| Gate CDR coverage after hardening | 100% |

## Existing Strengths

- Existing `KpiRegistryAdminService` already follows seed registry plus runtime overlay, schema-version gate, editable-field whitelist, soft-retire, ANNEX-122 regeneration, and audit via `AdminController`.
- Existing admin save route already requires auth, CSRF, and admin/CEO/general-director style roles.
- Existing dashboard routes already expose `kpi_catalog`, `kpi_threshold_badges`, `kpi_jd_scorecards`, and manual input endpoints.
- Existing console avoids raw JSON editing and uses structured threshold, owner, cadence, decision, and counter fields.

## Gaps Found

- Console was a single KPI library view, not the Prompt 05 tab model for official, operating, gate, JD, data contracts, counter/blockers, retired, and audit/drift views.
- `GET kpi_catalog` did not expose complete practical-control metadata: metric type list, JD scorecards, gate coverage, top-level data-contract endpoints/status, and integrity findings.
- New Console-added KPIs defaulted to manual input. That was safer than runtime fake, but still allowed a new KPI to look operational before a data-contract gap and graduation condition were recorded.
- JD renderer only consumed `scorecard`, not the active/candidate model required by Track 04.
- Renderer CSS contained hardcoded color literals instead of tokenized UI colors.
- Integrity drift was not surfaced in the admin UI. The current registry still has staged reward-eligible metrics: `FINAL_RELEASE_RFT` and `GROSS_MARGIN_JOB_FAMILY`.

## Practical / Non-Practical

Practical now:

- Harden the existing service/module in place.
- Return structured grouped admin views from the service.
- Expose integrity failures without blocking every save, because current SSOT already contains staged reward-eligible rows.
- Require all new Console proposals to declare data-contract gap and graduation condition.
- Keep formula/runtime/calculation-status structural edits out of the UI.

Not practical in Track 05:

- Graduate staged metrics to runtime without Track 02 source/calculator repair.
- Rewrite JD scorecards into full active/candidate registry data without Track 04 implementation approval.
- Add a raw JSON editor or a parallel KPI admin service.

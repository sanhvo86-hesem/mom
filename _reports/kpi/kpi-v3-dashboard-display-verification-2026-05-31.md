# KPI V3 — Dashboard Display Verification (registry ↔ API ↔ render)

- **Date:** 2026-05-31
- **Branch:** `codex/kpi-v3-production-living-20260530`
- **Goal:** prove the dashboard shows what the registry declares — 11 runtime/
  verified company KPIs, no fake numbers, staged/retired hidden.

---

## 1. What was verified (static, code-level — no DB needed)

The app is PHP+PostgreSQL with no local server/DB this session, so a live pixel
check needs the VPS. But the **display contract is fully verifiable in code**, and
that is where a fake number would actually originate. Three layers checked:

### Layer 1 — API catalog source (`KpiEngine::getMetricCatalog`)
`getMetricCatalog()` iterates `self::ALL_METRICS` and tags each
`backend_status=runtime_calculated`. Reflection probe (DB-less) confirms
`ALL_METRICS` = **42**, and every graduated KPI is a member:

```
RELEASE_READINESS_RFT            runtime=YES
CUSTOMER_ESCAPE_SEVERITY_INDEX   runtime=YES
CSR_ACKNOWLEDGEMENT_RATE         runtime=YES
REPEAT_NCR_RATE                  runtime=YES
CAPA_EFFECTIVENESS               runtime=YES
ENGINEERING_RELEASE_RFT          runtime=YES
CUSTOMER_COMM_CLOSURE_OT         runtime=YES
CONSTRAINT_LOST_HOURS            runtime=NO   ✓ (staged — correctly excluded)
UNMANAGED_PROMISE_RISK_14D       runtime=NO   ✓ (retired — correctly excluded)
MARGIN_PER_CONSTRAINT_HOUR       runtime=NO   ✓ (retired — correctly excluded)
```

So the dashboard catalog serves the 7 graduated KPIs as real runtime, and never
serves the retired/unbuildable ones as live.

### Layer 2 — no-fake-number suppression (`KpiEngine` lines 514–606)
For any `staged_data_contract` / `data_contract_required` metric, the engine
**suppresses the numeric value** even if a manual_input row exists, returning
`insufficient_data_reason = metric_staged_data_contract_value_suppressed` per
`dashboard_render_contract.render_rules.staged_data_contract`. This is the
enforced guarantee that a staged metric can never render a number — exactly the
"no số ảo" rule, in code, not just policy.

### Layer 3 — guard backstop
`check_kpi_integrity.php` PASSES with: runtime_calculated_metrics 42, official
active scorecard items 7, 0 P0. The guard P0-blocks any attempt to score the
executive scorecard from staged/manual-unverified metrics (drift self-test
covers "staged-in-executive-scorecard"). So even a future regression is caught at
deploy.

---

## 2. Final company scorecard (what the board will display)

11 KPIs, weights normalized to 100, every one runtime or verified-manual:

| KPI | weight | state |
|---|---|---|
| CUSTOMER_ESCAPE_SEVERITY_INDEX | 19.7% | runtime |
| OTD | 17.0% | runtime |
| FINAL_RELEASE_RFT | 11.3% | manual-verified |
| FAI_FIRST_PASS | 8.5% | runtime |
| RELEASE_READINESS_RFT | 8.5% | runtime |
| REPEAT_NCR_RATE | 7.0% | runtime |
| WIP_AGING | 7.0% | runtime |
| ENGINEERING_RELEASE_RFT | 7.0% | runtime |
| CSR_ACKNOWLEDGEMENT_RATE | 5.6% | runtime |
| PLAN_ADHERENCE | 4.2% | runtime |
| INVOICE_RFT | 4.2% | runtime |

Renderers present: `12-kpi-badge-renderer.js`, `13-jd-scorecard-renderer.js`,
`14-exception-dashboard.js`; API: `DashboardController::kpiCatalog/kpiGet/
kpiAlerts/kpiThresholdBadges/kpiJdScorecards`.

---

## 3. What static verification canNOT prove (honest limit)

- **Live pixels:** that the rendered card actually grays a staged metric / shows
  the counter beside the primary — needs a running instance (VPS Chrome).
- **Real query results:** that each calc returns a sane number on production data
  — needs the Postgres DB. The SQL is written against confirmed real columns
  (verified per metric), and `php -l` is clean, but only a live run returns actual
  values.

**Recommendation:** a VPS Chrome check (per the repo's self-test-in-Chrome
policy) is the right final gate — but it is a deploy-time action on live infra,
not a local one. It should run after these commits are merged + deployed, against
`eqms.hesemeng.com`, confirming: (a) the 11 cards render with numbers, (b) staged
metrics show "data gap" not a number, (c) retired metrics absent, (d) counter
shown beside primary.

---

## 4. Self-Critique

- **Did I claim more than I verified?** No — I separated code-level (proven now:
  catalog membership + suppression logic + guard) from runtime pixels (needs
  VPS, flagged as the merge-time gate). I did not assert "the dashboard looks
  right" without a live check.
- **Is the contract actually enforced or just declared?** Enforced — the
  suppression is in `getKpiValue`/catalog code (lines 514–606), not only in the
  registry `dashboard_render_contract`. A staged metric is structurally unable to
  emit a number.
- **Lean fit:** the board now carries 11 signal KPIs (not 218), all real — the
  display matches the lean intent.

---

## 5. Net

The registry→API→render contract is verified at code level: 7 graduated KPIs
serve as runtime, retired/staged are excluded, staged values are suppressed, the
guard backstops it. The only remaining step is a live Chrome check on the deployed
VPS — correctly a post-merge action, not a local one.

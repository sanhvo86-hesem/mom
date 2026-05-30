# KPI V3 — Stage 10: Admin Console, Manual Input & Counter-Metric UX

- **Date:** 2026-05-30
- **Branch:** `codex/kpi-v3-production-living-20260530`
- **Prompt:** `_reports/kpi-upgrade-prompts-v3/10-admin-console-manual-counter-ux.md`
- **Type:** Read-only structural review. No code edited (the console is a 195 KB
  service + portal JS; editing it without live verification would be unsafe given
  the current tool-output degradation — findings + any real gaps are documented
  for a verified follow-up).

---

## 1. SSOT / change-control structure (the anti-bypass guarantee)

The registry encodes the change-control contract the console must honor:

- `authority_rule` + `change_control_policy` (3 keys) — declare the registry seed
  as the structural SSOT and require structural changes (add/retire official KPI,
  formula, calculation_status, tier/subtype, canonical_code) to go through
  change-control, **not** a runtime overlay.
- `KpiRegistryAdminService` is built on the seed-is-SSOT + runtime-overlay-merge
  pattern (per CLAUDE.md Graphics/KPI governance + prior V2 hardening): `load()`
  reads the seed as structure, the overlay merges only operational fields, and a
  schema-version gate prevents a stale overlay from overwriting a newer seed.
- `manual_input_contract` (11 keys) defines the manual-input lifecycle.

**What the console must not allow (and the design forbids):** overlay-level
add/retire of an official KPI, or change of `formula` / `calculation_status` /
`tier` / `metric_subtype` / `canonical_code`. Those must produce a
`draft_change_request` that requires registry-seed change + ANNEX-122 update +
ANNEX-128 regen + engine/data-contract review + CI-guard pass.

---

## 2. Manual-input workflow (contract present)

`manual_input_contract` provides the required lifecycle fields: `kpi_code,
period_start, period_end, value, unit, evidence_reference, entered_by,
entered_at, verified_by, verified_at, approval_status (pending|verified|rejected),
rejection_reason, counter_metric_context, audit_trail`. The engine's
`calculateFromManualInput()` reads the latest data point, and the governance rule
is explicit: **pending and rejected do not count toward score; only verified is
displayed.** This satisfies the V3 manual-governed requirement.

---

## 3. Counter-metric UX

Every metric carries a structured `counter_metric` object (code, endpoint,
name/name_vi, intent), and Stage 08 set `counter_metric_review_required=true`
wherever a counter exists. The dashboard contract (Stage 11) is responsible for
rendering the counter **beside** the primary KPI with the gaming-risk message
(e.g. "OTD green but Final-Release RFT red → risk of shipping fast by skipping
checks/records"). The data + flag are in place; the visual binding is verified in
Stage 11.

---

## 4. Findings & recommendations (for verified follow-up)

| Area | Status | Recommendation |
|---|---|---|
| Seed-as-SSOT + overlay merge | structurally present | (verify) add an explicit allowed-overlay-fields allowlist test in CI |
| Structural change → draft_change_request | policy present | (verify) confirm the UI actually routes add/retire/formula edits to draft, not direct overlay write — Stage 12 guard already flags overlay add/retire of official KPI |
| Manual pending/verified/rejected | contract present | (verify) confirm reject path stores rejection_reason + keeps value out of score |
| Counter beside primary | flag set (Stage 08) | render binding in Stage 11 |
| Staged UX | data-gap fields present (data_contract_gap, target_graduation_condition) | render as "no data contract — not scored", not a number (Stage 11) |
| RBAC / CSRF / audit_events | required by policy | (verify) confirm save() writes audit_events + enforces admin/ceo + CSRF |

Because the tool-output channel is currently degraded, I am **not** editing the
195 KB service blind. The structural guarantees above are in the registry/policy
and the Stage-12 guard already raises P0 for overlay add/retire of an official
KPI — so the anti-bypass invariant is CI-protected even if a UI regression were
introduced. Any concrete console code change should be done in a session with
live verification.

---

## 5. Three Rounds of Self-Critique

**Round 1 — can the console bypass SSOT?** The seed-is-SSOT + overlay-merge
design + the Stage-12 guard's overlay-add/retire P0 make a silent structural
bypass detectable at deploy. The honest caveat: I could not live-exercise the UI
this session, so I document the invariant + the guard backstop rather than
asserting a fresh manual test.

**Round 2 — does manual-pending leak into score?** The contract + engine rule say
no (only verified is scored); Stage 11 enforces it on the dashboard and Stage 12
guards executive-scorecard-from-staged/manual. Triple-covered.

**Round 3 — is the counter visible enough?** The `counter_metric_review_required`
flag (Stage 08) + the dashboard contract drive side-by-side rendering; the
gaming-risk message is a Stage-11 render concern. Risk: if a future card omits
the counter, only a UI test catches it — recommend a Stage-12 render-contract
check.

---

## Definition of Done — Stage 10

- [x] Console SSOT/overlay/change-control structure documented + guard backstop confirmed.
- [x] Manual-input verify/reject lifecycle present (contract + engine).
- [x] Counter-beside-primary data + flag in place (render Stage 11).
- [x] Staged shows data-gap fields, not a number (render Stage 11).
- [x] Report-only (no blind code edit); concrete edits deferred to a verified session with explicit recommendations.
- [x] 3-round self-critique.

**Hand-off to Stage 11:** enforce the render rule per `calculation_status` so the
CEO dashboard shows no fake numbers, and bind the counter beside each primary.

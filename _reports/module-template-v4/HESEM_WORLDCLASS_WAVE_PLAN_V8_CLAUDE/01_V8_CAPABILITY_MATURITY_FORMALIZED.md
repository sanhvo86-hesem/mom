# 01 — V8 Capability Maturity Formalized

```text
purpose:        Bind V7's L0–L7 maturity ladder to executable promotion + demotion gates
predecessor:    V7 §05 (V7_CAPABILITY_MATURITY_MODEL_0_TO_7.md), 40 lines, prose
v8_advance:     Per-level: artifact list + schema reference + automated test +
                 oracle + reproducibility evidence + demotion trigger + quantitative threshold
work_package:   WP-V8-MAT (1 work package)
owner:          Platform Lead + QA Lead
estimate:       3 engineering-weeks (definition + tooling) + ongoing per-slice cost ~0.5 day
```

---

## 1. The 8-level ladder (V7 carry-forward)

V7 names are kept verbatim. The V7 acceptance text becomes the V8 informal description; the V8 normative gate is below.

| L | V7 name | V7 acceptance | V8 normative gate id |
|---|---|---|---|
| L0 | Absent | Backlog record only | `MAT-L0-V8` |
| L1 | Documented / planned | Planning acceptance | `MAT-L1-V8` |
| L2 | Fixture prototype | Fixture parse + static guard | `MAT-L2-V8` |
| L3 | Current-portal-safe E2E prototype | E2E + forbidden guard + rollback | `MAT-L3-V8` |
| L4 | Opt-in live read-only API | OpenAPI + problem details + live/fixture comparison | `MAT-L4-V8` |
| L5 | Controlled mutation | Mutation command tests + audit/evidence tests | `MAT-L5-V8` |
| L6 | Pre-production validation package | URS/RTM/IQ/OQ/PQ/VMP/restore rehearsal | `MAT-L6-V8` |
| L7 | Multi-site / verticalized / productized | Tenant/site rollout package + SRE + support model | `MAT-L7-V8` |

---

## 2. Promotion-evidence matrix (executable)

Each promotion edge requires **all** of the following:

### MAT-L0 → MAT-L1

```yaml
promotion: MAT-L0-to-L1
required_artifacts:
  - artifact_id: ART-L1-001
    name: root_scope_contract
    schema_ref: templates/ROOT_SCOPE_CONTRACT_V8.md
    location: _reports/module-template-v4/<root>/<root>_SCOPE_CONTRACT.md
    mandatory_fields: [root_code, name, domain, authority_class, baseline_maturity, target_maturity, target_wave, intended_use, owner_role, risks_top3]
  - artifact_id: ART-L1-002
    name: planning_record_in_root_backlog
    schema_ref: data/root_backlog_v8.json
    test: jq '.[] | select(.code=="<ROOT_CODE>") | .baseline_maturity == 1'
required_signoff:
  - role: Domain Lead
  - role: Platform Lead
quantitative_thresholds:
  - threshold_id: TH-L1-001
    metric: artifact_completeness_pct
    operator: ">="
    value: 100
    measurement: "fields-filled / mandatory-fields"
demotion_triggers:
  - trigger_id: DT-L1-001
    condition: "scope contract loses any mandatory field"
    severity: SEV-3
test_pack:
  - test_id: T-L1-001
    description: "Scope contract well-formed YAML/MD frontmatter"
    command: "scripts/verify_scope_contract.sh <ROOT_CODE>"
    oracle: "exit 0 + no 'MISSING_FIELD' lines on stdout"
```

### MAT-L1 → MAT-L2

```yaml
promotion: MAT-L1-to-L2
required_artifacts:
  - artifact_id: ART-L2-001
    name: fixture_json
    schema_ref: tests/fixtures/module-template-v4/schemas/<root>.schema.json
    location: tests/fixtures/module-template-v4/<root>/*.json
    mandatory_states: [overview, conflict, degraded, partial_access, audit, rollback]
  - artifact_id: ART-L2-002
    name: route_contract
    schema_ref: schemas/route_contract_v8.json
  - artifact_id: ART-L2-003
    name: screen_contract_html
    location: mom/templates/module-template-v4/<root>/*.html
    mandatory_attrs: [data-route-class, data-authority-class, data-resource-family]
required_tests:
  - test_id: T-L2-001
    description: "All fixture JSON parses with json.loads + schema validate"
    command: "python tools/scripts/validate_fixtures.py --root <ROOT_CODE>"
    oracle: "100% files pass; schema_violations == 0"
  - test_id: T-L2-002
    description: "Node syntax check on hydration/router/renderer"
    command: "node --check mom/scripts/portal/{70,71,72,73,74}-module-template-v4-*.js"
    oracle: "exit 0"
  - test_id: T-L2-003
    description: "Forbidden file diff guard"
    command: "scripts/forbidden_diff_check.sh"
    oracle: "no forbidden files modified"
  - test_id: T-L2-004
    description: "74-fixtures.js NOT loaded by mom/portal.html"
    command: "grep -c '74-module-template-v4-fixtures' mom/portal.html"
    oracle: "result == 0"
quantitative_thresholds:
  - TH-L2-001: fixture_state_coverage_pct >= 80
  - TH-L2-002: schema_violations == 0
  - TH-L2-003: route_grammar_violations == 0
demotion_triggers:
  - DT-L2-001: any fixture file fails JSON.parse → SEV-2
  - DT-L2-002: 74-fixtures.js found in portal.html → SEV-1 (axiom A-INERT-1 break)
  - DT-L2-003: forbidden file modified → SEV-1
```

### MAT-L2 → MAT-L3

```yaml
promotion: MAT-L2-to-L3
required_artifacts:
  - ART-L3-001 e2e_spec
    location: tests/e2e/module-template-v4-<root>.spec.ts
    minimum_test_count: 12
    mandatory_scenarios: [happy_path, partial_access, conflict, degraded, audit_tab, rollback_path]
  - ART-L3-002 visual_regression_baseline
    location: tests/e2e/module-template-v4-visual.spec.ts-snapshots/
    coverage: chromium, firefox, webkit (tri-required from W4 onward)
  - ART-L3-003 a11y_report
    tool: axe-core
    minimum_pass_rate_pct: 100  # zero serious/critical violations
  - ART-L3-004 rollback_runbook
    location: _reports/module-template-v4/<root>/<root>_ROLLBACK_PROCEDURE.md
    mandatory_sections: [feature_flag_revert, fixture_revert, data_rollback, comms_plan]
required_tests:
  - T-L3-001 Playwright E2E full suite GREEN
    command: "cd tests/e2e && npm run test:hmv4 -- --project=chromium <root>"
    oracle: "passed_tests / total_tests >= 1.0; failures == 0"
  - T-L3-002 Visual regression diff
    threshold: "max_diff_pixel_count < 50 per snapshot per browser"
  - T-L3-003 a11y axe-core scan
    oracle: "violations[*].impact != 'serious' && violations[*].impact != 'critical'"
  - T-L3-004 Forbidden diff guard (re-run)
quantitative_thresholds:
  - TH-L3-001: e2e_pass_rate >= 1.00
  - TH-L3-002: visual_drift_pixel_count <= 50/snap
  - TH-L3-003: a11y_serious_violations == 0
  - TH-L3-004: cross_browser_pass_rate (chromium) >= 1.00 (from W4: tri-required)
demotion_triggers:
  - DT-L3-001: chromium baseline FAIL → BLOCK_NEXT (no further promotion or new slice)
  - DT-L3-002: a11y serious violation → SEV-2
  - DT-L3-003: rollback runbook stale > 90d → SEV-3
```

### MAT-L3 → MAT-L4 (live read-only)

```yaml
promotion: MAT-L3-to-L4
preconditions:
  - per_slice_user_approval: "Proceed with <root> Stage 2 live-API graduation"
  - W0.5 platform substrate: ACCEPTED
  - feature flag: HMV4_LIVE_API_<ROOT> exists with default=false
required_artifacts:
  - ART-L4-001 openapi_spec
    location: mom/contracts/openapi/<domain>/<root>.openapi.yaml
    spec_version: 3.1.1
    mandatory_components: [paths.GET_collection, paths.GET_item, components.schemas.<root>_canonical, components.schemas.ProblemDetail, security]
  - ART-L4-002 problem_detail_registry_entries
    location: schemas/problem_registry_v8.json
    minimum_entries: 8 per route family
  - ART-L4-003 live_fixture_adapter
    location: mom/api/Services/HMV4/<Root>LiveApiAdapter.php
    contract: "live response normalized to fixture shape"
  - ART-L4-004 live_vs_fixture_comparison_report
    location: _reports/module-template-v4/<root>/<root>_LIVE_VS_FIXTURE_REPORT.md
    metrics: [shape_diff_pct, latency_p95_ms, error_rate_pct, fallback_invocation_count]
  - ART-L4-005 graduation_adr
    location: docs/adr/ADR-XXXX-<root>-stage2-live-api.md
required_tests:
  - T-L4-001 OpenAPI spec validates against 3.1.1
    command: "openapi-spec-validator <root>.openapi.yaml"
  - T-L4-002 Backward-compat suite
    command: "scripts/contract_diff.sh main..HEAD <root>"
    oracle: "no breaking changes OR major version bump"
  - T-L4-003 Live API contract test
    target: "staging environment + real API"
    oracle: "100% sample requests yield schema-valid responses"
  - T-L4-004 Failure-mode test (no silent fixture fallback)
    scenario: "live API returns 503"
    oracle: "UI shows error UI with problem-detail.title localized; problem-detail.type matches https://hesem.io/problems/live-api/unavailable"
  - T-L4-005 Performance budget
    targets: "p50 < 100ms, p95 < 500ms, p99 < 2s, error rate < 0.5%"
quantitative_thresholds:
  - TH-L4-001: contract_test_green_rate >= 1.00
  - TH-L4-002: silent_fallback_violations == 0
  - TH-L4-003: p95_latency_ms <= 500
  - TH-L4-004: error_rate_pct <= 0.5
demotion_triggers:
  - DT-L4-001: silent fallback to fixture detected → SEV-1 + demote to L3
  - DT-L4-002: contract drift unrescheduled within 30d → SEV-2 + demote
  - DT-L4-003: error_rate > 1% over 7d → SEV-2 + demote
```

### MAT-L4 → MAT-L5 (controlled mutation)

```yaml
promotion: MAT-L4-to-L5
preconditions:
  - per_mutation_user_approval: "Proceed with <root>.<transition_id> Stage 3 controlled mutation per ADR-XXXX"
  - per_mutation_adr: ratified
  - workflow_state_machine: defined in data/workflow_state_machines_v8.json
  - regulated_classification: declared (gxp / non_gxp / iatf / as9100 / itar)
required_artifacts:
  - ART-L5-001 command_envelope_implementation
    schema_ref: schemas/command_envelope_v8.json
  - ART-L5-002 idempotency_replay_table
    schema_ref: schemas/authority_ledger_v8.sql (idempotency_replay_v8 table)
    replay_window_hours: 24
  - ART-L5-003 audit_chain_extension
    test: "every committed mutation produces audit_event with chain extension within 5s"
  - ART-L5-004 evidence_artifacts
    minimum_per_mutation: 1 evidence_record_v8 with WORM target
  - ART-L5-005 e_sign_record (if regulated)
    factor_count: per regulated_classification (1 for non_gxp, 2 for gxp)
  - ART-L5-006 saga_compensation_definition
    location: data/sagas/<root>_<transition>.yaml
  - ART-L5-007 rollback_test_evidence
    test: "saga compensation chain restores prior state in <5min"
required_tests:
  - T-L5-001 Happy path: transition commits with all guards/obligations satisfied
  - T-L5-002 Guard failure: returns 422 + RFC 9457 with failed_guard_id
  - T-L5-003 Missing e-sign (if regulated): returns 401 + factor list
  - T-L5-004 Stale validation evidence (if regulated): returns 451
  - T-L5-005 Idempotent replay: same Idempotency-Key returns identical 200/202
  - T-L5-006 Replay-mismatch: different body with same key returns 409
  - T-L5-007 Version conflict: missing/wrong If-Match returns 412
  - T-L5-008 Audit_event chain extension verified
  - T-L5-009 Workflow_event recorded with from_state, to_state, guards_evaluated[]
  - T-L5-010 OTG event published within 5s
  - T-L5-011 Saga compensation: forced mid-saga failure → state restored
quantitative_thresholds:
  - TH-L5-001: per-test green rate == 1.00 across all 11 tests
  - TH-L5-002: audit_chain extension lag p99 <= 5s
  - TH-L5-003: idempotency replay accuracy == 1.00
  - TH-L5-004: optimistic-lock conflict rate <= 1% (under load)
  - TH-L5-005: saga compensation success rate == 1.00 (chaos test)
demotion_triggers:
  - DT-L5-001: any RULE-2 banned-decision attempt → SEV-0 stop program
  - DT-L5-002: audit chain break → SEV-1 demote + freeze
  - DT-L5-003: tenant boundary leak → SEV-1 demote + incident
  - DT-L5-004: saga compensation failure under chaos → SEV-2 demote
```

### MAT-L5 → MAT-L6 (validation package)

```yaml
promotion: MAT-L5-to-L6
preconditions:
  - regulated_classification: gxp OR iatf OR as9100 OR itar
  - intended_use_statement: published
  - validation_master_plan: published per Annex 11 §4
required_artifacts:
  - ART-L6-001 URS (User Requirements Specification)
  - ART-L6-002 RTM (Requirements Traceability Matrix)
  - ART-L6-003 IQ_script + IQ_record
  - ART-L6-004 OQ_script + OQ_record (per slice)
  - ART-L6-005 PQ_script + PQ_record (per workflow)
  - ART-L6-006 risk_assessment per ICH Q9 / ISO 14971
  - ART-L6-007 backup_restore_drill_record
  - ART-L6-008 disaster_recovery_drill_record (RPO 1h / RTO 4h)
  - ART-L6-009 validation_summary_report (signed)
required_tests:
  - T-L6-001 every URS line has RTM entry → verification report → IQ/OQ/PQ evidence
  - T-L6-002 IQ executes cleanly on customer-equivalent staging
  - T-L6-003 OQ exercises every state-machine transition (positive + negative path)
  - T-L6-004 PQ runs 30-day continuous workflow with no SLO breach
  - T-L6-005 Backup-restore: full restore from PITR snapshot in <4h, integrity verified
  - T-L6-006 DR drill: failover from primary to DR within RTO budget
quantitative_thresholds:
  - TH-L6-001: URS-to-RTM coverage == 1.00
  - TH-L6-002: RTM-to-evidence coverage == 1.00
  - TH-L6-003: IQ_PASS_rate == 1.00
  - TH-L6-004: OQ_PASS_rate >= 0.98 (with classified deferrals)
  - TH-L6-005: PQ duration achieved >= 30d (or contracted period)
  - TH-L6-006: RPO_minutes_observed <= 60
  - TH-L6-007: RTO_minutes_observed <= 240
demotion_triggers:
  - DT-L6-001: validation evidence stale >365d (per Annex 11 periodic review) → SEV-2 demote
  - DT-L6-002: RTM coverage drops below 1.00 → SEV-2 demote + halt regulated mutation
  - DT-L6-003: DR drill fail 2 consecutive quarters → SEV-1 demote
```

### MAT-L6 → MAT-L7 (productized)

```yaml
promotion: MAT-L6-to-L7
preconditions:
  - first_pilot_customer_signoff: ratified (or internal pre-production approval)
  - vertical_pack_compliance: per applicable pack (Pharma / Auto / Aero)
  - multi_tenancy: enabled and tested
required_artifacts:
  - ART-L7-001 customer_onboarding_runbook (per file 28)
  - ART-L7-002 SRE_support_model (24x7, 12x5, business-hours per tier)
  - ART-L7-003 incident_response_runbook
  - ART-L7-004 commercial_pricing_pack (per file 30 ROI model)
  - ART-L7-005 customer_validation_leverage_pack (per V5 ADR-0122)
  - ART-L7-006 release_notes_template
  - ART-L7-007 customer_changelog_template
  - ART-L7-008 SLA_contract
required_tests:
  - T-L7-001 onboarding runbook executes for synthetic tenant in <8h
  - T-L7-002 incident drill: SEV-1 mock incident resolved within ITSM SLA
  - T-L7-003 multi-tenant load: 100 concurrent tenants × baseline traffic, no SLO breach
  - T-L7-004 vertical-pack-compliance: pack-specific audit pack generates within 24h
quantitative_thresholds:
  - TH-L7-001: onboarding_time_hours <= 8 (Core/Pro), <= 80 (Enterprise)
  - TH-L7-002: customer_satisfaction_csat >= 0.85
  - TH-L7-003: incident_MTTR_hours <= 1 (SEV-1), <= 24 (SEV-2)
  - TH-L7-004: SLA_breach_count == 0 in first 90d
demotion_triggers:
  - DT-L7-001: SLA breach material → SEV-1 demote with credit + RCA
  - DT-L7-002: customer audit failure → SEV-1 demote with corrective plan
  - DT-L7-003: multi-tenancy boundary leak → SEV-0 demote + halt sales
```

---

## 3. Demotion gravity

V7 §05 lines 35-40 lists demotion conditions. V8 expands and quantifies:

```yaml
demotion_severity_classes:
  SEV-0:    program-halting; freeze entire wave; CEO + legal + customers
  SEV-1:    immediate demote ≥1 level; on-call paged; customer impact possible
  SEV-2:    plan demote within 7d; team standup; SLO breach probable
  SEV-3:    plan demote within 30d; backlog item; risk register update
  SEV-4:    note in periodic review

demotion_no_skip_rule:
  "Demotion is one level at a time except for SEV-0 (drop to L1)."
  
demotion_audit_record:
  every demotion writes an OTG audit_event with class='demotion'
  every demotion produces a postmortem within SLA per its severity
  
remediation_path:
  every demotion has a named owner + a re-promotion target date
  
re_promotion_evidence:
  re-promotion repeats the original promotion's full test pack
  + a regression-test for the original demotion trigger
```

---

## 4. Maturity score visibility

```yaml
data_product: hesem.maturity_scorecard_v8
location:     data/v8_root_maturity_scorecard.csv (live; refreshed per slice promotion)
source_otg:   otg_node WHERE authority_class='authoritative_root'
              JOIN otg_event WHERE event_type LIKE 'maturity.%'
fields:
  - root_code
  - baseline_maturity (L0–L7)
  - current_maturity (L0–L7, evidence-backed)
  - target_maturity (L0–L7, planned)
  - target_wave (W0–W14)
  - blocking_promotion (artifact id list)
  - last_promotion_at
  - last_demotion_at (if any)
  - demotion_count_lifetime
  - active_demotion_severity (if any)
freshness_sla: 24h
publication: per-tenant maturity dashboard (Grafana)
```

---

## 5. Cross-domain maturity score (V8 advance over V7)

V7 publishes maturity per root only. V8 also tracks maturity per:

| Subject class | Example | Why it matters |
|---|---|---|
| Root | NQCASE | tracked already |
| Module | quality.nonconformance | aggregates child roots |
| Domain | quality_improvement | for executive dashboard |
| Spine | Workflow Spine | platform readiness |
| Data product | quality_kpi_per_period | analytic readiness |
| AI feature | nc.similarity_cluster | governance readiness |
| API family | /api/v1/nqcase | contract readiness |
| Wave | W3 (eQMS Core) | program readiness |
| Vertical pack | Pharma | commercial readiness |
| Tenant | acme-pharma | per-customer readiness |

Each is computed as min/median over its constituent rows; both metrics published. Min governs gating; median governs trend.

V8 ADR-V8-001: per-subject-class maturity scorecard mandatory.

---

## 6. Promotion-evidence file location convention

Every promotion of root R from level Lₙ to Lₙ₊₁ produces a single signed bundle at:

```text
_reports/module-template-v4/promotions/<root>/<root>_L<n>_TO_L<n+1>_BUNDLE_<YYYYMMDD>.zip
```

Bundle contents:
- promotion_record.yaml (machine-readable)
- artifact_index.json (list of artifact files with sha256)
- test_evidence/ (test logs, screenshots, traces)
- signature.txt (ed25519 by Platform Lead + Domain Lead)

V8 ADR-V8-002: Promotion bundle naming + signing mandatory.

---

## 7. Anti-skipping rule (V7 carry-forward + V8 mechanism)

V7 §05 line 19: "A feature cannot skip from L2 to L5 unless intermediate gates are explicitly evidenced."

V8 binds:

```yaml
mechanism: matrix_skip_check
implementation:
  - rule_id: MAT-NO-SKIP-001
    detection: "current_maturity_after_promotion - current_maturity_before_promotion > 1"
    action: "REJECT promotion; emit problem-detail https://hesem.io/problems/maturity/skip-attempt"
  - rule_id: MAT-NO-SKIP-002 (regulated exception)
    detection: "regulated_classification != 'non_gxp' AND target_level > 5 AND validation_package_status != 'present'"
    action: "REJECT promotion; require ART-L6-* artifacts first"
```

---

## 8. Per-wave maturity coverage thresholds

V8 binds per-wave minimum maturity coverage % (the % of in-scope roots that must reach the wave's target maturity for the wave to PASS):

```yaml
W0:    coverage(L1) >= 1.00 for in-scope roots (all 75 in V7's root_backlog)
W0.5:  coverage(L2) >= 0.10 (12 spine substrate readiness)
W1:    coverage(L2) >= 0.40 (slice factory mechanic mature for first 30 roots)
W2:    coverage(L2) >= 0.60 (record factory mechanic mature for 45 roots)
W3:    coverage(L3) >= 0.30 (eQMS+workforce+maintenance core slices E2E green)
W4:    coverage(L4) >= 0.30 (NQCASE/CAPA/CDOC/TRAIN/INSP live read-only)
W4.5:  coverage(L4) >= 0.50 + OTG-cutover-coverage >= 0.80
W5:    coverage(L5) >= 0.10 (10% of roots have Stage 3 mutation)
W6:    coverage(L4) >= 0.60 (MES/OT roots live read-only)
W6.5:  AI advisory coverage >= 3 features in L5 + acceptance_rate KPI tracked
W7:    coverage(L4) >= 0.80 + digital-thread-genealogy-coverage >= 0.90
W8:    DORA Elite tier achieved on 60% of services
W9:    coverage(L6) >= 1.00 for regulated roots
W10:   one vertical pack at coverage(L7) >= 0.80
W11:   first pilot tenant onboarded with full audit-pack
W12:   3+ tenants live with multi-region; SLO compliance >=99.9% / 90d
W13:   multi-jurisdictional regulatory compliance evidence per region
W14:   continuous improvement loop: 4 retrospective cycles complete with ROI deltas
```

---

## 9. Decision phrase

```text
V8_CAPABILITY_MATURITY_FORMALIZED_BASELINE_LOCKED
NEXT_FILE: 02_V8_INVARIANTS_AND_EXECUTABLE_CHECKS.md
WORK_PACKAGES_DEFINED:
  WP-V8-MAT-1   Build promotion evidence harness (scripts + CI)
  WP-V8-MAT-2   Build demotion trigger detection (linter + runtime)
  WP-V8-MAT-3   Build maturity scorecard data product (Grafana + CSV publishing)
  WP-V8-MAT-4   Build per-wave coverage gate (CI required check)
  WP-V8-MAT-5   Author 75 root scope contracts at L1 (one work package per 5 roots)
```

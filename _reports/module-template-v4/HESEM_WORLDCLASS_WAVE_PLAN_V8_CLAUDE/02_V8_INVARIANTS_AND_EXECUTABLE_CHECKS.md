# 02 — V8 Invariants and Executable Checks

```text
purpose:        Bind V7's 11 invariants + V8-INV-12 to executable detection mechanisms
predecessor:    V7 §00 (lines 4-14) prose invariants
v8_advance:     Per invariant: detection mechanism + severity + escalation + automation status
work_package:   WP-V8-INV (12 work packages, one per invariant)
owner:          Platform Lead + Security Lead + Compliance Lead
estimate:       12 engineering-weeks across 12 invariants (1 week mean)
```

---

## 1. Invariant catalog

Each invariant has 8 fields. The `automation_status` is the V8 advance over V7: V7 publishes only the rule, V8 publishes the binding.

### INV-1 — No uncontrolled mutation

```yaml
invariant_id:        INV-1
predecessor:         V7 §00 line 5
rule:                Every state change to authoritative_root must flow through Workflow Mutation Command Bus
detection:
  - linter_id:       FORBIDDEN-DIRECT-WRITE-001
    pattern:         "DB::table('<root_table>')->update|insert|delete outside MOM\\Api\\Workflow\\CommandHandler\\*"
    severity:        BLOCK
  - middleware:      MutationGuardMiddleware (rejects any L4-table-write request not bearing command_envelope_v8)
    runtime_action:  HTTP 422 + problem-detail https://hesem.io/problems/workflow/uncontrolled-mutation-attempt
  - integrity_job:   axiom_A3_audit (nightly; flags root rows updated without preceding audit_event within 5s)
escalation:          SEV-1 → on-call paged + freeze writes for affected root
automation_status:   IMPLEMENTED-IN-V8-W0.5 (linter+middleware+job)
work_package:        WP-V8-INV-1
```

### INV-2 — No hidden authority in workspaces

```yaml
invariant_id:        INV-2
predecessor:         V7 §00 line 6
rule:                A WS (workspace) screen must never mutate; only AR (authoritative record shell) and AC (action) classes may issue commands
detection:
  - linter_id:       WS-MUTATION-FORBIDDEN-001
    pattern_a:       data-route-class="WS" element with onclick that POSTs/PATCHes
    pattern_b:       data-authority-class="projection" with mutation_command attribute
    severity:        BLOCK
  - playwright_test: tests/e2e/v8-ws-no-mutation.spec.ts (asserts no fetch with method≠GET originates from WS DOM tree)
  - middleware:      MutationGuardMiddleware checks request header `X-HESEM-Surface-Class` ∈ {AR, AC} for mutating verbs
escalation:          SEV-1 if hidden mutation reaches production-equivalent staging
automation_status:   IMPLEMENTED-IN-V8-W0.5 (linter+test+middleware triple defense)
work_package:        WP-V8-INV-2
```

### INV-3 — No API without contract

```yaml
invariant_id:        INV-3
predecessor:         V7 §00 line 7
rule:                Every API endpoint must have OpenAPI 3.1.1 spec entry, problem-detail registry binding, and contract test
detection:
  - ci_step:         openapi-spec-validator on mom/contracts/openapi/**/*.openapi.yaml
  - ci_step:         contract_diff.sh main..HEAD (rejects new route without spec)
  - runtime_check:   Every response logs schema-validation result; mismatch → SEV-2 alert
  - integrity_job:   weekly: enumerate live routes vs OpenAPI catalog; report drift
escalation:          BLOCK merge if new route without spec; SEV-2 if drift
automation_status:   IMPLEMENTED-IN-V8-W0.5
work_package:        WP-V8-INV-3
```

### INV-4 — No workflow without guard evidence

```yaml
invariant_id:        INV-4
predecessor:         V7 §00 line 8
rule:                Every workflow_event for a controlled mutation must carry guards_evaluated[] with results, recorded in OTG
detection:
  - schema_check:    workflow_event.payload MUST include "guards_evaluated" array of {guard_id, result, evidence_refs[]}
  - integrity_job:   axiom_A4_workflow_completeness (nightly; flags transitions with empty guards_evaluated[] OR missing audit_event linkage)
escalation:          SEV-1 if any regulated transition committed without guard evidence; immediate freeze
automation_status:   IMPLEMENTED-IN-V8-W0.5
work_package:        WP-V8-INV-4
```

### INV-5 — No e-sign without signature meaning and audit trail

```yaml
invariant_id:        INV-5
predecessor:         V7 §00 line 9
rule:                21 CFR Part 11 §11.50 + §11.70 — every e-signed record displays printed name, datetime, meaning of signature; the link is unbreakable
detection:
  - schema_check:    audit_event with type='e_sign' MUST contain {signer_principal_id, signer_printed_name (snapshot), signature_meaning (from policy_obligation_template), record_canonical_state_hash, factor_count}
  - integrity_job:   axiom_A6_esign (verify e-sign records on regulated transitions ≥ obligated factor_count)
  - merkle_anchor:   daily merkle root commits; tampering invalidates chain
escalation:          SEV-0 if chain broken (program halt per V8-K-1)
automation_status:   IMPLEMENTED-IN-V8-W0.5 (chain) + IMPLEMENTED-IN-V8-W3 (regulated obligations active)
work_package:        WP-V8-INV-5
```

### INV-6 — No AI without human authority boundary

```yaml
invariant_id:        INV-6
predecessor:         V7 §00 line 10
rule:                AI advisory cannot commit any of the 8 banned regulated decisions (per V3 RULE-2)
detection:
  - ci_test:         tests/v8/ai-governance/test_rule2_enforcement.py (scans command handlers; rejects ai_advisory_annotation as input class)
  - runtime_guard:   commit_transition() rejects when actor.kind == 'ai_service_principal'
  - integrity_job:   axiom_A7_ai_no_commit (nightly: zero edges of predicate=COMMITTED whose subject.authority_class='ai_advisory_annotation')
escalation:          SEV-0 if violation detected; halt AI advisory feature
automation_status:   IMPLEMENTED-IN-V8-W6.5
work_package:        WP-V8-INV-6
```

### INV-7 — No live API without fallback

```yaml
invariant_id:        INV-7
predecessor:         V7 §00 line 11
rule:                When live API enabled, error responses must surface problem-detail in UI; never silent fixture fallback
detection:
  - playwright_test: tests/e2e/v8-no-silent-fallback.spec.ts (force live API to 503; assert problem-detail.title rendered, not stale fixture)
  - linter_id:       SILENT-FALLBACK-ANTIPATTERN-001 (detects try/catch returning fixture without UI signal)
escalation:          BLOCK merge if linter trips; SEV-1 if test trips on staging
automation_status:   IMPLEMENTED-IN-V8-W4
work_package:        WP-V8-INV-7
```

### INV-8 — No release without rollback rehearsal

```yaml
invariant_id:        INV-8
predecessor:         V7 §00 line 12
rule:                Every wave gate report must include rollback rehearsal evidence with timestamp + result
detection:
  - ci_step:         release_gate.sh requires ART-L*-rollback_runbook + test_log signed within last 30d
  - integrity_job:   weekly: any release tag without rollback_rehearsal_evidence → SEV-2
escalation:          BLOCK release; SEV-2 if missed weekly
automation_status:   IMPLEMENTED-IN-V8-W0.5
work_package:        WP-V8-INV-8
```

### INV-9 — No branch merge without evidence

```yaml
invariant_id:        INV-9
predecessor:         V7 §00 line 13
rule:                PR to main must carry green CI matrix + reviewer count = 2 + ADR (if architectural) + slice/wave report linked
detection:
  - branch_protection: required checks: unit, contract, e2e, visual, a11y, forbidden_diff, secret_scan, sbom_scan
  - bot_check:       PR must reference a slice/wave artifact via 'Refs:' line
escalation:          BLOCK merge
automation_status:   IMPLEMENTED-IN-V8-W0.5
work_package:        WP-V8-INV-9
```

### INV-10 — No new module/slice while a blocking integration gate is open

```yaml
invariant_id:        INV-10
predecessor:         V7 §00 line 14
rule:                If any decision phrase active in {PHASE2_INTEGRATION_BLOCKED_*, PHASE2_INTEGRATION_FAIL_BLOCK_NEXT}, no new slice planning may begin
detection:
  - cli_tool:        scripts/check_integration_gate.sh (parses _reports/module-template-v4/V21*.md latest decision)
  - planning_prompt_guard: every CODEX_W*_V8.md prompt begins with check_integration_gate verification
escalation:          REJECT slice creation request
automation_status:   IMPLEMENTED-IN-V8-W0
work_package:        WP-V8-INV-10
```

### INV-11 — No production wording until validation evidence in place

```yaml
invariant_id:        INV-11
predecessor:         V3 RULE-3 + V7 line ~21
rule:                Forbidden phrases ("production go-live", "production cutover", "production release", "validated production system") in commit messages, ADRs, README, marketing — until formal release is signed
detection:
  - commit_hook:     .git/hooks/commit-msg-v8 (blocks forbidden phrases unless commit body contains 'release_authority: <signer_id>' for ratified release)
  - ci_step:         scan_for_production_wording.sh on docs/, _reports/, README.md
escalation:          BLOCK merge
automation_status:   IMPLEMENTED-IN-V8-W0
work_package:        WP-V8-INV-11
```

### INV-12 — No invariant without an executable check (V8 META)

```yaml
invariant_id:        INV-12
predecessor:         V8 NEW
rule:                Every invariant in this catalog must have automation_status ∈ {IMPLEMENTED-IN-V8-Wx, PLANNED-FOR-V8-Wx}; never 'manual'
detection:
  - meta_test:       tests/v8/meta/test_invariant_coverage.py (parses 02_V8_INVARIANTS_*.md and asserts every invariant has detection + escalation + automation_status)
escalation:          BLOCK V8 release if any invariant is automation_status='manual'
automation_status:   IMPLEMENTED-IN-V8 (this file is the binding)
work_package:        WP-V8-INV-12
```

---

## 2. Stop rules (V7 §23 lines 19-31 superset)

V7 lists 12 stop rules. V8 keeps and quantifies:

| ID | Stop rule | Detection automation | Severity |
|---|---|---|---|
| STOP-V8-01 | Cross-browser blocker on chromium | playwright job | BLOCK_NEXT |
| STOP-V8-02 | Fixture file 74 loaded by portal | grep CI step | SEV-1 |
| STOP-V8-03 | Forbidden file changed | git diff CI | BLOCK |
| STOP-V8-04 | Workspace mutation found | linter+playwright | BLOCK + SEV-1 |
| STOP-V8-05 | Unknown bridge alias invents record id | bridge_log audit | SEV-2 |
| STOP-V8-06 | Live API became default without approval | feature_flag_audit job | BLOCK + SEV-1 |
| STOP-V8-07 | Backend mutation route without contract | openapi_diff CI | BLOCK |
| STOP-V8-08 | E-sign committed without audit trail | INV-5 detection | SEV-0 |
| STOP-V8-09 | AI committed banned decision | INV-6 detection | SEV-0 |
| STOP-V8-10 | E2E fail rate > 0 chromium | playwright job | BLOCK_NEXT |
| STOP-V8-11 | Rollback rehearsal absent for release | INV-8 detection | BLOCK |
| STOP-V8-12 | Required reports absent for slice/wave | report_index check | BLOCK |
| STOP-V8-13 | OTG axiom A1-A18 violation in prod | nightly integrity | SEV-1 |
| STOP-V8-14 | Audit chain anchor lag >25h | anchor cron metric | SEV-1 |
| STOP-V8-15 | Cross-tenant boundary leak | RLS+middleware | SEV-1 |
| STOP-V8-16 | Validation evidence stale on regulated release | INV-15 (V8) | SEV-1 |
| STOP-V8-17 | Cross-region cost SLA breached | cost_governance | SEV-2 |
| STOP-V8-18 | DR drill failed twice consecutively | quarterly check | SEV-1 |

V7 had 12; V8 has 18.

---

## 3. Severity escalation matrix

```yaml
SEV-0:
  acknowledge: 5 min
  resolve: 1 hour
  inform: CEO + legal + customers
  hotfix: yes
  postmortem: within 7d
SEV-1:
  acknowledge: 15 min
  resolve: 4 hours
  inform: on-call + product + customers (if material)
  hotfix: yes
  postmortem: within 14d
SEV-2:
  acknowledge: 30 min
  resolve: 1 business day
  inform: team standup
  hotfix: optional
  postmortem: within 21d
SEV-3:
  acknowledge: 4 hours
  resolve: within sprint
  postmortem: optional
SEV-4:
  acknowledge: next standup
  resolve: backlog
```

---

## 4. Detection-mechanism inventory

V8 inventories every named detection mechanism so engineers can later code each:

```text
linter rules                  18 (LINT-V8-001..018)
middleware modules             6 (MutationGuardMiddleware, TenantGuardMiddleware,
                                   IdempotencyMiddleware, VersionMiddleware,
                                   ProblemDetailMiddleware, AISurfaceGuardMiddleware)
ci workflow steps             12 (.github/workflows/v8/*.yml)
runtime guards                 8 (in-code Service-layer assertions)
integrity jobs nightly        14 (axiom_A1..axiom_A18 partial mapping; some merged)
playwright tests              25 (tests/e2e/v8-*.spec.ts)
unit tests                    ~200 (per-handler per-guard)
contract tests                ~75 (per-route per-version)
visual regression baselines   ~120 (per-slice tri-browser)
a11y axe scans                ~60 (per route)
load tests                    8 (per critical workflow)
chaos tests                   6 (per saga)
red-team drills               4 (quarterly, per AI feature)
```

Total: ~556 named detection assets.

---

## 5. Work package decomposition

Every invariant maps to a work package with engineer-grade definition:

```yaml
WP-V8-INV-1:
  title: Implement INV-1 detection (no uncontrolled mutation)
  inputs:
    - schemas/command_envelope_v8.json
    - data/authority_ledger_seed_v8.json
  deliverables:
    - mom/api/Linters/ForbiddenDirectWriteLinter.php
    - mom/api/Http/Middleware/MutationGuardMiddleware.php
    - mom/api/Jobs/AxiomA3AuditJob.php
    - tests/v8/middleware/test_mutation_guard.py
    - .github/workflows/v8/inv-1-direct-write-check.yml
  effort_eng_weeks: 1
  dependencies: [WP-V8-LEDGER-1, WP-V8-CMD-1]
  exit_criteria:
    - linter rejects sample violations in CI
    - middleware rejects sample requests with documented problem-detail
    - integrity job runs cleanly on empty + populated ledger
    - tests green
  owner_role: Platform Engineer
  reviewer_role: Security Lead
  artifact_target: WP-V8-INV-1-BUNDLE-<YYYYMMDD>.zip
```

Same shape for WP-V8-INV-2 through WP-V8-INV-12. Total: 12 work packages, ~12 engineering-weeks.

---

## 6. Decision phrase

```text
V8_INVARIANTS_AND_EXECUTABLE_CHECKS_BASELINE_LOCKED
NEXT_FILE: 03_V8_PRODUCT_NORTH_STAR_AND_OPERATING_PRINCIPLES.md
WORK_PACKAGES_DEFINED:
  WP-V8-INV-1 .. WP-V8-INV-12 (12 WPs total)
```

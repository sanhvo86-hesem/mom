# P03 Operational Simulation

Branch: codex/uom-v5-no-guess-20260530
SHA at start: 8574a9c3660eb28d27d2bcc52cf254fb945fdf45

```yaml
case_id: SIM-P03-01
scenario: Rule kg->g active version 2 resolves.
input: Fake DB returns version 2 exact_linear rule with as_of 2026-05-30.
expected_result: rule_version 2 returned and query allows active lifecycle.
actual_result: UomLifecycleResolutionTest passed.
pass_fail: PASS
defect_found: none
repair_applied: resolver lifecycle/effective query patched.
retest_result: focused UoM PHPUnit pass.
residual_risk: actual DB integration still requires integration test environment.
```

```yaml
case_id: SIM-P03-02
scenario: Pending rule does not resolve.
input: Resolver SQL lifecycle predicate.
expected_result: pending_review excluded from resolver.
actual_result: Query is `lifecycle_status IN ('active', 'approved')`.
pass_fail: PASS
defect_found: none
repair_applied: resolver lifecycle predicate patched.
retest_result: grep/test evidence recorded.
residual_risk: legacy approved remains explicitly allowed.
```

```yaml
case_id: SIM-P03-03
scenario: Future rule effective tomorrow does not resolve today.
input: as_of date 2026-05-30.
expected_result: future effective_from is excluded.
actual_result: Query contains `effective_from <= :as_of::date`.
pass_fail: PASS
defect_found: none
repair_applied: as_of predicate added.
retest_result: focused unit test verifies SQL and parameter.
residual_risk: DB integration test still desirable.
```

```yaml
case_id: SIM-P03-04
scenario: Expired rule does not resolve after effective_to boundary.
input: as_of date at or after effective_to.
expected_result: expired row excluded with exclusive upper bound.
actual_result: Query contains `effective_to IS NULL OR effective_to > :as_of::date`.
pass_fail: PASS
defect_found: none
repair_applied: exclusive effective_to predicate added.
retest_result: focused unit test verifies SQL.
residual_risk: endpoint policy must be documented in API later.
```

```yaml
case_id: SIM-P03-05
scenario: Approval status for rule with DB column version returns rule_version in API/service.
input: Fake DB row uses alias `version AS rule_version`.
expected_result: service returns rule_version 2.
actual_result: UomLifecycleResolutionTest passed.
pass_fail: PASS
defect_found: none
repair_applied: workflow SQL alias patched.
retest_result: focused UoM PHPUnit pass.
residual_risk: none in P03 scope.
```

## Common Minimum Simulation Set

- Golden case: active/legacy approved lifecycle policy resolves. PASS.
- Negative case: pending/future/expired are excluded by SQL predicates. PASS.
- Boundary precision/overflow: Existing DecimalString tests passed in focused run. PASS.
- Permission denied: P04 owner; not touched.
- Stale cache/effective date: v5 cache key includes as_of and policy. PASS_WITH_WARNING for TTL-only historic/context invalidation.
- Audit hash replay: not touched; P09 owner.
- External alias quarantine: not touched; P06 owner.
- UI/API parity: not touched; P10/P11 owner.

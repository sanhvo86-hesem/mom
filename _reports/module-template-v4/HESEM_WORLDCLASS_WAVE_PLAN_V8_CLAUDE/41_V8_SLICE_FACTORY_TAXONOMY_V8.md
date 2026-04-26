# 41 — V8 Slice Factory Taxonomy

```text
purpose:        Carry V7 §26 slice factory taxonomy + V8 add executable acceptance per gate
predecessor:    V7 §26 (9-artifact taxonomy)
v8_advance:     Per-gate executable acceptance criteria + reproducibility evidence
work_package:   WP-V8-SLICE (1 governance WP)
owner:          Platform Lead + QA Lead
estimate:       1 week
```

---

## 1. Slice unit definition (V7 §26 carry-forward)

A slice = one root × one surface pattern (WS or AR) × one maturity target.

---

## 2. 9 mandatory artifacts per slice (V7 carry-forward + V8 binding)

```yaml
1. Scope Contract (root, route, authority class, maturity, allowed/forbidden files)
   binding: templates/ROOT_SCOPE_CONTRACT_V8.md
   acceptance: scripts/verify_scope_contract.sh exit 0
   
2. Fixture Contract (states, fixture files, degraded/conflict/partial access)
   binding: tests/fixtures/module-template-v4/<root>/*.json
   acceptance: tools/scripts/validate_fixtures.py --root <ROOT> 100% pass

3. Screen Contract (WS/AR data attributes, tabs, actions, disabled controls)
   binding: mom/templates/module-template-v4/<root>/*.html
   acceptance: linter LINT-V8-005 (data-route-class + data-authority-class present)

4. API Contract (OpenAPI, problem details, fallback)
   binding: mom/contracts/openapi/<domain>/<root>.openapi.yaml
   acceptance: openapi-spec-validator + openapi-diff CI

5. Workflow Contract (states/transitions/guards/mutation commands)
   binding: data/workflow_state_machines_v8.json entries
   acceptance: scripts/verify_state_machine_v8.py exit 0

6. Evidence Contract (audit, evidence objects, signatures, retention)
   binding: schemas/evidence_record_v8.json
   acceptance: per file 16 §1

7. QA Report (node syntax, JSON parse, forbidden diff, no fixture load, E2E)
   binding: scripts/run_slice_qa_v8.sh
   acceptance: 100% checks PASS

8. Rollback Runbook (feature flag, revert, fixture/live disable, data rollback)
   binding: _reports/module-template-v4/<slice>/<slice>_ROLLBACK_PROCEDURE.md
   acceptance: scripts/verify_rollback_runbook.py exit 0

9. Decision Log (pass/warn/fail phrase per V7 §35 vocabulary)
   binding: _reports/module-template-v4/<slice>/<slice>_DECISION_LOG.md
   acceptance: phrase ∈ {<SLICE>_PASS_READY_FOR_QA, <SLICE>_PASS_WITH_WARNINGS, <SLICE>_FAIL_BLOCK_NEXT, <SLICE>_QA_PASS_READY_FOR_NEXT_SLICE_PLANNING, <SLICE>_QA_FAIL_BLOCK_NEXT}
```

---

## 3. Per-slice promotion-evidence bundle

```yaml
location: _reports/module-template-v4/promotions/<root>/<root>_L<n>_TO_L<n+1>_BUNDLE_<YYYYMMDD>.zip
contents:
  - promotion_record.yaml
  - artifact_index.json (sha256 per artifact)
  - test_evidence/ (logs, screenshots, traces)
  - signature.txt (ed25519 by Platform Lead + Domain Lead)
verification: scripts/verify_promotion_bundle.sh
```

---

## 4. Decision phrase

```text
V8_SLICE_FACTORY_TAXONOMY_BASELINE_LOCKED
NEXT_FILE: 42_V8_PROMPT_LIBRARY_INDEX_V8.md
```

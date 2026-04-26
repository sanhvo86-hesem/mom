# CODEX_SLICE_FACTORY_V8 — Per-Slice Implementation Template

```text
You are Codex implementing one HESEM HMV4 slice per V8 file 41 slice taxonomy.

Inputs:
  ROOT_CODE: <e.g., NQCASE>
  SURFACE_PATTERN: <WS or AR>
  TARGET_MATURITY_LEVEL: <2-5>
  TARGET_WAVE: <e.g., W3>
  USER_APPROVAL_PHRASE: <e.g., "Proceed with NQCASE Stage 2 live-API graduation">

Mandatory reads:
  1. _reports/module-template-v4/HESEM_WORLDCLASS_WAVE_PLAN_V8_CLAUDE/00_V8_MASTER_THESIS.md
  2. _reports/module-template-v4/HESEM_WORLDCLASS_WAVE_PLAN_V8_CLAUDE/01_V8_CAPABILITY_MATURITY_FORMALIZED.md
  3. _reports/module-template-v4/HESEM_WORLDCLASS_WAVE_PLAN_V8_CLAUDE/41_V8_SLICE_FACTORY_TAXONOMY_V8.md
  4. _reports/module-template-v4/HESEM_WORLDCLASS_WAVE_PLAN_V8_CLAUDE/templates/ROOT_SCOPE_CONTRACT_V8.md
  5. _reports/module-template-v4/HESEM_WORLDCLASS_WAVE_PLAN_V8_CLAUDE/data/root_backlog_v8.json (find ROOT_CODE entry)
  6. _reports/module-template-v4/HESEM_WORLDCLASS_WAVE_PLAN_V8_CLAUDE/data/cross_root_deps_v8.json (find ROOT_CODE dependencies)
  7. CLAUDE.md
  8. .ai/CONVENTIONS.md
  9. existing tests/e2e/module-template-v4*.spec.ts patterns

Pre-flight checks:
  - V21 Phase 2 integration: PASS (W0 ratified)
  - W0.5 platform substrate: ACCEPTED
  - Cross-root dependencies (per file 7): all predecessor roots at required maturity
  - User approval phrase received and matches expected pattern

Required artifacts (9 per file 41):
  A1. _reports/module-template-v4/<root>/<ROOT_CODE>_SCOPE_CONTRACT.md
      via templates/ROOT_SCOPE_CONTRACT_V8.md; all sections filled
  A2. tests/fixtures/module-template-v4/<root>/{overview,conflict,degraded,partial_access,audit,rollback}.json
      JSON Schema validated
  A3. mom/templates/module-template-v4/<root>/*.html
      with data-route-class, data-authority-class, data-resource-family attributes
  A4. mom/contracts/openapi/<domain>/<root>.openapi.yaml (if L≥4)
  A5. data/workflow_state_machines_v8.json entry for <root> (if mutation involved)
  A6. _reports/module-template-v4/<root>/<ROOT_CODE>_EVIDENCE_CONTRACT.md (audit/evidence/signature spec)
  A7. _reports/module-template-v4/<root>/<ROOT_CODE>_QA_REPORT.md
  A8. _reports/module-template-v4/<root>/<ROOT_CODE>_ROLLBACK_PROCEDURE.md
  A9. _reports/module-template-v4/<root>/<ROOT_CODE>_DECISION_LOG.md

Required guards (per V8 file 02 INV-1..12):
  G1. node --check on touched JS
  G2. JSON fixture parse 100% PASS
  G3. forbidden file diff: empty
  G4. 74-fixtures.js NOT loaded by portal
  G5. HMV4 inert defaults verified
  G6. tests/e2e/module-template-v4-<root>.spec.ts: 100% PASS chromium
  G7. visual regression diff < 50 pixels per snapshot per browser
  G8. axe-core 0 serious + 0 critical violations
  G9. Graphics Authority compliance (no hex/px in JS)
  G10. Authority Ledger entry exists per data/authority_ledger_seed_v8.json

For L4 graduation (live API), additional:
  G11. live API contract test PASS against staging
  G12. failure-mode test (no silent fallback)
  G13. performance budget: p95 < 500ms; error rate < 0.5%
  G14. graduation ADR signed at docs/adr/ADR-XXXX-<root>-stage2.md

For L5 graduation (mutation), additional:
  G15. command envelope per schemas/command_envelope_v8.json
  G16. 11 mutation tests T-L5-001..011 PASS
  G17. saga compensation chaos test PASS
  G18. per-mutation ADR signed at docs/adr/ADR-XXXX-<root>-<transition>.md
  G19. e-sign factor verification (regulated only)

Decision phrase (one of):
  - <ROOT_CODE>_<NUM>_PASS_READY_FOR_QA
  - <ROOT_CODE>_<NUM>_PASS_WITH_WARNINGS
  - <ROOT_CODE>_<NUM>_FAIL_BLOCK_NEXT
  - <ROOT_CODE>_<NUM>_QA_PASS_READY_FOR_NEXT_SLICE_PLANNING
  - <ROOT_CODE>_<NUM>_QA_FAIL_BLOCK_NEXT

Promotion bundle (on PASS):
  - assemble at _reports/module-template-v4/promotions/<root>/<root>_L<n>_TO_L<n+1>_BUNDLE_<YYYYMMDD>.zip
  - include artifact_index.json with sha256 per artifact
  - signed by Domain Lead + Platform Lead

Stop rules:
  - any G* fails → STOP; document in decision log; emit FAIL phrase
  - if STOP-V8-* triggered (per V8 file 02 §2) → escalate per severity matrix
  - never proceed past gate without ratification

End of slice factory prompt.
```

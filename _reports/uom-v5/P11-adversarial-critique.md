# P11 Adversarial Critique

Prompt: P11
Branch: codex/uom-v5-no-guess-20260530
Current SHA before P11 commit: b0b0a2e5d430e633d7bdf6db4a87bfcb05a23a6e
Decision token: UOM_V5_P11_UI_SAFE_PROJECTION_LOCKED

## Required Critique

1. Multi-site, multi-supplier, multi-language risk: REPO_EVIDENCE: widget context includes item/site/policy and source system. CONTROLLED_GAP: supplier/customer-specific UI pickers are not yet first-class controls in P11.
2. Factor-only affine/log/contextual risk: REPO_EVIDENCE: UI does not calculate authoritative conversions except fixture preview for basic kg/g; live conversion delegates to P10 API.
3. Naked number leakage: REPO_EVIDENCE: P11 blocks UoM widget/calculator naked submit. CONTROLLED_GAP: other domain forms still contain legacy quantity fields and are assigned to P12/P15.
4. Canonical/quarantine bypass: REPO_EVIDENCE: alias `M` fixture returns quarantine and live alias path is `/api/v1/uom/aliases/resolve`.
5. AI rule authority: REPO_EVIDENCE: no AI create/approve/e-sign controls were added.
6. Permission weakness: REPO_EVIDENCE: P11 adds no frontend-only permission as authority. Live mutation remains backend-governed.
7. Schema/service drift: REPO_EVIDENCE: UI test locks field names used by the widget and route class markers.
8. Cache expired/future/retired risk: REPO_EVIDENCE: UI delegates live conversion to backend and does not cache approved rules as authority.
9. Rollback feasibility: REPO_EVIDENCE: P11 is localized to two scripts, one test, reports, and regenerated index files.
10. Historical replay evidence: REPO_EVIDENCE: widget feedback shows original and normalized values, and `getValue()` returns MEASVAL/context for downstream replay.

## Adversarial Verdict

PASS_WITH_WARNINGS. P11 makes the UI safer as a projection, but browser-level E2E coverage and domain-wide replacement of legacy quantity inputs remain controlled later work.

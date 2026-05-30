# P10 Adversarial Critique

Prompt: P10
Branch: codex/uom-v5-no-guess-20260530
Current SHA before P10 commit: 7dc20cad369d47ec0a831520427bd38f64d3f674
Decision token: UOM_V5_P10_CONTRACT_FIRST_API_LOCKED

## Required Critique

1. Multi-site, multi-supplier, multi-language risk: REPO_EVIDENCE: API contract now carries site, supplier, customer, source system, external code, and context fields through conversion context. CONTROLLED_GAP: localized human-readable remediation strings are English backend text only; P11/UI or later localization work must render Vietnamese user-facing copy.
2. Factor-only affine/log/contextual risk: REPO_EVIDENCE: P08 contextual handlers and P10 OpenAPI context fields keep density, potency, and packaging explicit. P10 added no factor-only shortcut.
3. Naked number leakage: REPO_EVIDENCE: P09 created the scanner/backlog. P10 does not expand domain-wide remediation; P12/P15 own wider integration/backfill.
4. Canonical/quarantine bypass: REPO_EVIDENCE: alias route documents ambiguous/quarantine outputs and event registry includes `uom.alias.quarantined`.
5. AI rule authority: REPO_EVIDENCE: no AI route is added; no approve/activate UoM route is exposed.
6. Permission weakness: REPO_EVIDENCE: P10 did not add mutation routes. CONTROLLED_GAP: route-level auth semantics rely on existing router/middleware behavior; deeper permission tests require integration harness work.
7. Schema/service drift: REPO_EVIDENCE: P10 uses static parity tests to catch route/spec drift. No schema column mapping change was introduced.
8. Cache expired/future/retired risk: REPO_EVIDENCE: P10 only passes trace/context into existing service path; lifecycle/cache validity remains governed by P03/P05/P13 work.
9. Rollback feasibility: REPO_EVIDENCE: changes are localized to OpenAPI/controller/test/event registry and can be reverted as one commit.
10. Historical replay evidence: REPO_EVIDENCE: P09 measurement evidence is preserved; P10 documents event contracts and trace propagation without deleting historical values.

## Adversarial Verdict

PASS_WITH_WARNINGS. The API contract surface is now locked enough to prevent silent route/spec drift, but production-grade permission/idempotency integration testing remains a controlled later hardening item.

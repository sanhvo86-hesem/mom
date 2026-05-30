# P12 Adversarial Critique

Prompt: P12
Branch: codex/uom-v5-no-guess-20260530
Current SHA before P12 commit: 8923fba6e9253bf130fa993efc7989db3ec99a2b
Decision token: UOM_V5_P12_DOMAIN_INTEGRATION_LOCKED

## Required Critique

1. Multi-site, multi-supplier, multi-language risk: REPO_EVIDENCE: registry includes supplier, customer, item/site/policy, equipment, and analytics roots. CONTROLLED_GAP: actual site/supplier/customer command enforcement remains backlog.
2. Factor-only affine/log/contextual risk: REPO_EVIDENCE: registry routes potency, device readings, and inspection specs to contextual/MEASVAL contracts instead of factor-only shortcuts.
3. Naked number leakage: REPO_EVIDENCE: backlog lists concrete legacy naked-number/free-text-unit files. This is not marked fixed.
4. Canonical/quarantine bypass: REPO_EVIDENCE: authority policy requires `uom_alias_quarantine` for external/free-text aliases.
5. AI rule authority: REPO_EVIDENCE: Analytics/AI root is read-only/advisory and cannot override authoritative measurement.
6. Permission weakness: REPO_EVIDENCE: P12 adds no frontend-only guard or domain mutation; permission enforcement remains in future command patches.
7. Schema/service drift: REPO_EVIDENCE: tests lock registry shape and existing UoM authority service paths.
8. Cache expired/future/retired risk: REPO_EVIDENCE: P12 does not add cache usage; conversion cache validity remains P03/P05/P13 concern.
9. Rollback feasibility: REPO_EVIDENCE: rollback is source-only for registry, backlog, tests, reports, and AI index.
10. Historical replay evidence: REPO_EVIDENCE: every simulation contract requires original and normalized evidence or audit hash/drill-through.

## Adversarial Verdict

PASS_WITH_WARNINGS. P12 correctly avoids pretending domain-wide remediation is complete; it establishes the integration map and backlog gates needed for safe root-by-root work.

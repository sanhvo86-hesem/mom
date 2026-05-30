# P15 Adversarial Critique

Prompt: P15
Branch: codex/uom-v5-no-guess-20260530
Current SHA before P15 commit: 89b07a7cce1eb279a63cd03c08e419e37f4cf240
Decision token: UOM_V5_P15_DOMAIN_ADOPTION_VERTICAL_PACK_READY

## Required Critique

1. Multi-site, multi-supplier, multi-language risk: REPO_EVIDENCE: policy requires explicit unit evidence and supplier alias review; packs include vertical variation. CONTROLLED_GAP: customer-specific data profiling remains future project execution.
2. Factor-only affine/log/contextual risk: REPO_EVIDENCE: vertical packs list contextual rules; pharma IU requires lot potency evidence.
3. Naked number leakage: REPO_EVIDENCE: sampled scan still finds legacy quantity fields; P15 records classification instead of claiming closure.
4. Canonical/quarantine bypass: REPO_EVIDENCE: missing/ambiguous unit goes to quarantine backlog.
5. AI rule authority: REPO_EVIDENCE: onboarding rules forbid AI advisory approval authority.
6. Permission weakness: REPO_EVIDENCE: P15 adds no mutation path or approval bypass.
7. Schema/service drift: REPO_EVIDENCE: test locks registry schema and required classifications.
8. Cache expired/future/retired risk: REPO_EVIDENCE: P15 creates no cache or active conversion rule.
9. Rollback feasibility: REPO_EVIDENCE: rollback policy deletes only shadow proposals.
10. Historical replay evidence: REPO_EVIDENCE: shadow proposals preserve original source and require evidence before MEASVAL.

## Adversarial Verdict

PASS_WITH_WARNINGS. P15 safely prepares adoption without overwriting history, but real data profiling and governed approvals remain future execution work.

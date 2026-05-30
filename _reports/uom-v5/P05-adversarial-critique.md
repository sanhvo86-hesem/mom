# P05 Adversarial Critique

Prompt: P05
Branch: codex/uom-v5-no-guess-20260530
Current SHA before P05 commit: 45f06bd263a6f439d28f118768defc73b5fec3e9
Decision token: UOM_V5_P05_ENGINE_PRECISION_RULE_RESOLUTION_LOCKED

1. Multi-site, supplier, language risk:
   - INFERENCE: The engine is deterministic and site-neutral, but contextual conversions will need site/supplier/material context in P08/P12.

2. Factor-only affine/log/contextual risk:
   - TEST_EVIDENCE: Affine direct and reverse tests prove offset formula usage.
   - REPO_EVIDENCE: Log/contextual categories now guard with `UOM_CATEGORY_NOT_SUPPORTED`.

3. Naked number risk:
   - CONTROLLED_GAP: P05 hardens engine magnitude parsing. UI/form/API naked-number storage remains P09/P10/P11.

4. Canonical unit or alias quarantine bypass:
   - REPO_EVIDENCE: Engine receives canonical unit codes and uses `QuantityKindService`.
   - OUT_OF_SCOPE_BLOCKER: External alias quarantine remains P06.

5. AI create/approve/e-sign risk:
   - REPO_EVIDENCE: P05 does not add AI write authority. AI flags remain evidence-only pass-through.

6. Permission impersonation risk:
   - REPO_EVIDENCE: P05 does not touch permissions or identity mutation.

7. Schema/service drift:
   - REPO_EVIDENCE: Rule descriptor now uses canonical `version` as `rule_version` and includes effective fields.

8. Cache stale rule risk:
   - REPO_EVIDENCE: Engine forwards as-of/context hash.
   - CONTROLLED_GAP: Runtime cache invalidation observability remains P13.

9. Rollback:
   - INFERENCE: Reverting the P05 commit restores prior dispatch behavior. No schema/data migration was added.

10. Historical replay:
   - REPO_EVIDENCE: MEASVAL now records effective window and factor exactness. Full persistence replay remains P09.

Adversarial result: PASS_WITH_WARNINGS.

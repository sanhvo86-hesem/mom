# P08 Adversarial Critique

Prompt: P08
Branch: codex/uom-v5-no-guess-20260530
Current SHA before P08 commit: 856c6c5512bb2e06700ec6683f612c72045e99fd
Decision token: UOM_V5_P08_CONTEXTUAL_CONVERSION_LOCKED

## Reviewer Findings

1. Multi-site/supplier risk: packaging conversion varies by item, site, supplier, customer, and date; P08 uses policy lookup instead of global BOX factor.
2. Factor-only risk: density, potency, and packaging use contextual handlers, not global factors.
3. Naked-number risk: contextual numbers require named fields and evidence refs; free-text units still rely on P06 quarantine.
4. Bypass risk: engine invokes contextual planner before semantic rejection only for governed contextual routes.
5. AI authority risk: P08 has no AI approval or mutation path.
6. Permission shortcut risk: P08 does not approve registry rows; it reads active/effective evidence.
7. Schema/service drift risk: migration 260 field names match service context fields.
8. Cache risk: expired packaging policy is rejected by as-of lookup; contextual outputs are not cached.
9. Rollback risk: migration 260 is additive and includes rollback SQL.
10. Replay evidence risk: contextual evidence is captured in MEASVAL.

## Verdict

PASS_WITH_WARNINGS. Contextual conversions now require specific evidence and reject stale or missing context.

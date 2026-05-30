# P09 Adversarial Critique

Prompt: P09
Branch: codex/uom-v5-no-guess-20260530
Current SHA before P09 commit: 3ac8a1bad7f4e088dd2222641dc4599716395c7a
Decision token: UOM_V5_P09_MEASVAL_DIGITAL_THREAD_LOCKED

## Reviewer Findings

1. Multi-site risk: source system, entered-by, linked records, and digital thread links are explicit but domain repair remains later work.
2. Factor-only risk: factory canonical SI is still from input unit row, not display value.
3. Naked-number risk: scanner/backlog exists; not every domain form is repaired in P09.
4. Bypass risk: MEASVAL factory is strengthened, but P12 must integrate more domains.
5. AI authority risk: advisory refs are evidence only, not approval.
6. Permission shortcut risk: no approval path was added.
7. Schema/service drift risk: P09 is schema-light and uses existing JSON envelope.
8. Cache risk: historical hash replay uses stored envelope values, not live rule cache.
9. Rollback risk: code/test/report rollback is localized.
10. Replay risk: verifier proves same envelope hash and mutation detection.

## Verdict

PASS_WITH_WARNINGS. Evidence envelope is stronger; domain-wide naked-number elimination remains scoped backlog.

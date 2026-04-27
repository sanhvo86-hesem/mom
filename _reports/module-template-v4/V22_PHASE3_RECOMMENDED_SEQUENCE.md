# V22 Phase 3 Recommended Sequence

Date: 2026-04-25

## Recommended Order

1. CI matrix hardening plan.
2. CAPA live API toggle replication plan.
3. Slice 5 CDOC governed document record shell plan.
4. Slice 6 INSP inspection record / inspection lot shell plan.
5. Slice 8 ECO engineering change record shell plan.
6. Slice 7 BREL batch release read-only packet shell plan.

## Rationale

CI matrix hardening should come first because Phase 2 already exposed visual baseline drift as the main integration-risk pattern. The next business-facing shell should not widen fixture and visual surface before browser-gate policy, artifact retention, and snapshot update rules are explicit.

CAPA live API replication should follow because it reuses the already-landed ADR-0011 opt-in live API pattern without adding a new shell family. It is a focused hardening track and keeps current portal safety intact.

CDOC and INSP should precede BREL because batch release depends on controlled document and inspection evidence being represented clearly as read-only packets. ECO can run before BREL because engineering change traceability affects document, item, route, CNC program, and inspection-plan references.

## Branching Recommendation

Use separate planning branches or separate commits per candidate. Do not mix CI matrix policy with business shell scope in the same implementation branch.

Suggested branch names:

```text
codex/phase3-ci-matrix-planning
codex/phase3-capa-live-toggle-planning
codex/phase3-cdoc-shell-planning
codex/phase3-insp-shell-planning
codex/phase3-eco-shell-planning
codex/phase3-brel-shell-planning
```

## Entry Gate For Any Implementation Slice

Before any Phase 3 implementation prompt starts, require:

```text
current main HEAD
clean branch status
source-of-truth boundary statement
exact files allowed
forbidden files list
fixture contract
E2E/axe/visual validation plan
rollback plan
```

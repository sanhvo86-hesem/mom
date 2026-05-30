# P07 Adversarial Critique

Prompt: P07
Branch: codex/uom-v5-no-guess-20260530
Current SHA before P07 commit: 46fe9e0002285b346c8d10ac36616572bd7db369
Decision token: UOM_V5_P07_SEMANTIC_COMPATIBILITY_LOCKED

## Reviewer Findings

1. Multi-site and supplier risk: local business semantics may differ even for the same display symbol. P07 therefore defaults cross-kind to reject and requires an explicit active compatibility rule.
2. Factor-only risk: absolute temperature remains affine; temperature difference remains linear; logarithmic pH remains blocked.
3. Naked-number risk: P07 does not touch transactions/forms. It strengthens conversion entry by rejecting semantically wrong canonical pairs.
4. Canonical/quarantine bypass risk: P07 starts after P06 alias quarantine; it assumes callers pass canonical unit codes, then blocks semantic mismatch before rule resolution.
5. AI authority risk: no AI path can create, approve, or e-sign a compatibility rule.
6. Permission shortcut risk: P07 adds no approval shortcut. `DeltaDegF` rule is pending review, not active.
7. Schema/service drift risk: table and service use the same `from_kind`, `to_kind`, `approval_status`, and effective-window names.
8. Cache risk: compatibility is checked before rule cache lookup, and rule cache still includes as-of/context dimensions from P05.
9. Rollback risk: migration 259 is additive and includes rollback SQL.
10. Replay risk: mismatch errors now include reason/remediation/trace id; successful conversion evidence remains MEASVAL.

## Weak Points Kept As Controlled Gaps

- Conditional compatibility schema evaluation is not implemented in P07.
- Absent Work/Moment/Stress kinds are documented rather than invented.
- Human activation of new standard rules remains governed by P04.

## Verdict

PASS_WITH_WARNINGS. P07 prevents "same dimension equals same meaning" mistakes without adding hidden conversion authority.

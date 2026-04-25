# ADR 0005: Slice-based prototype cycle

## Status

Accepted (2026-04-25)

## Context

Wave 1 has 18 workflow roots × 2 pattern variants (workspace projection
+ authoritative record shell) ≈ 30+ surface variants. Building all at
once (big-bang) would:

- Take 6+ months before first usable surface
- Make rollback hard (everything coupled)
- Fail fast feedback loops
- Block backend prioritization

A slice-based cycle ships one surface at a time, each independently
shippable with rollback granularity at the slice level.

## Decision

Each slice = **one root × one pattern**. Slice cycle has 4 stages:

```text
V_n   = planning prompt        →  S_n  planning artifacts
V_n+1 = approval prompt        →  S_n  approval gate
V_n+2 = implementation prompt  →  S_n  implementation report (PASS_READY_FOR_QA)
V_n+3 = QA prompt              →  S_n  QA report (PASS_READY_FOR_NEXT_SLICE_PLANNING)
```

### Stage 1 — Planning (V_n)

Codex generates ~7 planning artifacts:
- Branch base verification report
- Scope contract (route, authority, tabs, no-mutation rules)
- File change plan
- Fixture and E2E plan
- Rollback plan
- Implementation prompt draft
- Go/no-go decision

No code change.

### Stage 2 — Approval (V_n+1)

User reviews planning artifacts. Says approval phrase:

```text
Approve <slice> planning. Proceed with <slice> prototype implementation.
```

### Stage 3 — Implementation (V_n+2)

Codex writes:
- New renderer in `73-module-template-v4-renderers.js`
- Bridge alias updates in `72-module-template-v4-bridge.js`
- Fixture pages and JSON in `tests/fixtures/module-template-v4/`
- E2E spec extensions in `tests/e2e/module-template-v4*.spec.ts`
- Implementation report

Required quality gates per slice:
1. Node syntax 70-74 PASS
2. JSON fixture parse PASS
3. Forbidden diff guard PASS
4. No fixture production load PASS
5. Portal feature flag inert by default
6. Playwright E2E 100% pass
7. Graphics Authority compliance (no hex/px in JS)

### Stage 4 — QA (V_n+3)

Codex re-runs all quality gates + adds:
- Anti-authority/re-anchor verification
- Accessibility checks (manual or axe-core)
- Current portal regression smoke
- Rollback verification (committed-state)

QA decision phrase: `<SLICE>_QA_PASS_READY_FOR_NEXT_SLICE_PLANNING` |
`PASS_WITH_WARNINGS` | `FAIL_BLOCK_NEXT`.

### Branch convention

One branch per slice: `codex/slice-<N>-<root>-from-<prev-qa>`
Example: `codex/slice-3-train-from-nc-qa`

Each slice merges to `main` via PR after QA pass + GPT Pro review (or
designated reviewer).

## Consequences

### Positive
- Predictable cadence (~1 week per slice for EQMS-backed roots, ~3
  weeks for RED roots)
- Each slice independently shippable
- Granular rollback (revert one slice without affecting others)
- Fast feedback loops

### Negative
- 18 slices over many months — total elapsed time is long
- Per-slice overhead (planning + approval + impl + QA cycles)
- Cross-slice integration debt (each slice fixture is independent;
  cross-fixture interaction limited)

### Neutral
- Slice 0.5 inserted for nav shell and CSS cleanup as needed
- Slice cycle compatible with parallel backend stream

## Alternatives Considered

### Alternative 1: Big-bang Wave 1 release
Build all 18 surfaces in one release. Rejected: unmanageable scope;
delays first usable surface by months.

### Alternative 2: Pattern-grouped releases
Release all WS workspaces, then all AR record shells. Rejected: pattern
diversity too high (governed-quality vs governed-content vs
governed-release vs transactional vs draft); too coupled.

### Alternative 3: Domain-grouped releases
Release all Quality domain surfaces, then Commercial, etc. Rejected:
domain dependency too tangled (CAPA links to NQCASE which links to
INSP); doesn't simplify.

## References

- `STEP11_LIMITED_WAVE1_PLANNING_MASTER.md`
- `_reports/module-template-v4/WAVE1_18_ROOT_SLICE_SEQUENCING_ROADMAP.md`
- `_reports/module-template-v4/UPGRADE_PROMPT_PACK_1_SLICE_3_CYCLE.md`
- V13/V14 (Slice 1 Dispatch), V17/V18/V19 (Slice 2 NC), V20/V21/V22 (Slice 3 TRAIN)

## History

- 2026-04-25: Proposed and Accepted

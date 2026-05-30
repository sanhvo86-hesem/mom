# P11 Operational Simulation

Prompt: P11
Branch: codex/uom-v5-no-guess-20260530
Current SHA before P11 commit: b0b0a2e5d430e633d7bdf6db4a87bfcb05a23a6e
Decision token: UOM_V5_P11_UI_SAFE_PROJECTION_LOCKED

## Required Simulations

| Simulation | Result | Evidence |
|---|---|---|
| SIM-P11-01 user enters `12.5` but no unit | PASS | `validateCalcForm()` disables submit and emits Vietnamese error for missing unit/kind/source. |
| SIM-P11-02 user enters vendor `M` | PASS | fixture alias returns `ambiguous`, `quarantine_id=UOM-Q-FIXTURE-M`, and UI says no automatic mapping. |
| SIM-P11-03 user switches quantity kind Mass | PASS | widget and control center filter unit list by kind and disable non-kind options with reason text. |
| SIM-P11-04 keyboard-only completes kg->g preview | PASS_WITH_STATIC_EVIDENCE | inputs/selects/buttons are native controls with focus styling and ARIA feedback; no custom pointer-only control was added. |
| SIM-P11-05 offline API fallback | PASS | fixture mode is default and fetch failure returns readonly fixture data, not mutation. |

## Broader Scenario Sweep

- Golden case pass: TEST_EVIDENCE: focused UI tests passed.
- Negative case fail correctly: TEST_EVIDENCE: static tests lock disabled naked-number submit and quarantine copy.
- Boundary precision/overflow: REPO_EVIDENCE: UI passes display precision to backend and does not add authoritative arithmetic.
- Permission denied: REPO_EVIDENCE: UI adds no write approval controls; backend remains authority.
- Stale cache/effective date: REPO_EVIDENCE: UI uses fixture/read API and does not cache rules as authority.
- Audit hash replay: REPO_EVIDENCE: widget returns MEASVAL/context and displays original/normalized values.
- External alias quarantine: TEST_EVIDENCE: static tests check alias resolve, ambiguous, quarantine, and no auto-map copy.
- UI/API parity: REPO_EVIDENCE: live paths match P10 API paths for convert, units, kinds, rules, aliases, and health.

## Simulation Result

PASS_WITH_WARNINGS.

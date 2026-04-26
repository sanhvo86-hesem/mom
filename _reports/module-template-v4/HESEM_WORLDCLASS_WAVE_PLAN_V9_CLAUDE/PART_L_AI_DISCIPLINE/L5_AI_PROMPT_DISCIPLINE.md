# L5 — AI Prompt Discipline

```
chapter_purpose: how humans engage AI agents to produce work without losing scope
owner_role:      Head of Engineering (the user) with AI Lead
```

This chapter governs **the prompts humans give AI** to produce HESEM
artifacts (planning, code, tests, documentation). It is the operating
contract that prevents drift between the master plan and what AI
actually emits per turn.

---

## 1. The drift problem

When a human asks an AI to "implement the order workflow," the AI
might produce:
- Code that touches files outside the workflow (frontend bridge,
  style sheet, unrelated controller)
- Decisions that contradict the master plan (different state machine,
  different validation rule)
- Wording that violates the pre-production posture (uses words like
  "production launch" forbidden by V3 RULE-3)
- Topic creep (starts on D1 Order to Cash, ends commenting on D2)

The fix is not to prompt better in the moment. The fix is to enforce
**three-layer prompt discipline**.

---

## 2. The three layers

```
Layer 1  CONTEXT          mandatory pre-flight reading per task class
Layer 2  SCOPE            explicit allowed files / forbidden files
Layer 3  CHECK            decision phrase + verification step
```

Every AI prompt must contain all three. A prompt missing any layer is
rejected and rewritten before AI execution.

---

## 3. Layer 1 — CONTEXT (pre-flight reading)

For every task class, the AI must read specific Parts of this V9
package before producing output. The reading list is enforced at
prompt time, not by AI judgment.

Example reading lists (from READING_DISCIPLINE.md task taxonomy T1-T15):

```
T1  Add a new state to a state machine
    READ: A1, B6 OTG, B7 state machines, D<workflow>, M4 state directory

T2  Add a new API endpoint
    READ: B7 API design, E0 overview, E<family>, F8 binding rules

T3  Add a new evidence class
    READ: H4 evidence taxonomy, H5 retention, B6 OTG, E8 evidence API

T4  Add a vertical pack feature
    READ: J0 overview, J<pack>, H1 regulatory landscape, M8 standards

T5  Adjust an SLO
    READ: I2 observability, M5 SLO directory, B9 observability

T6  Add an AI feature
    READ: L0..L4, plus the feature's home Part C domain

T7  Adjust validation lifecycle
    READ: H2 validation lifecycle, D14 validate to qualify, J<pack>
```

---

## 4. Layer 2 — SCOPE (allowed and forbidden files)

The prompt must declare which files the AI may write or edit, and
which it may not. For HMV4 slice work, the forbidden list per
ADR-0004 is non-negotiable:

```
Forbidden in HMV4 slice work:
mom/portal.html (only feature flag insertion allowed)
mom/styles/portal.main.css
mom/styles/eqms-suite.css
mom/styles/density-darkmode.css
mom/scripts/portal/01-module-router.js
mom/scripts/portal/02-state-auth-ui.js
mom/scripts/portal/40-eqms-shell.js
```

Allowed list per HMV4 slice (canonical):
```
mom/scripts/portal/70-module-template-v4-hydration.js
mom/scripts/portal/71-module-template-v4-routes.js
mom/scripts/portal/72-module-template-v4-bridge.js
mom/scripts/portal/73-module-template-v4-renderers.js
mom/scripts/portal/74-module-template-v4-fixtures.js
mom/styles/module-template-v4.tokens.css
mom/styles/module-template-v4.css
mom/templates/module-template-v4/module-template-v4.html
tests/e2e/module-template-v4*.spec.ts
tests/fixtures/module-template-v4/**
```

For non-HMV4 work, the prompt declares scope explicitly per task.

---

## 5. Layer 3 — CHECK (decision phrase + verification)

Every AI task must close with:
1. A decision phrase the AI emits when complete (e.g.
   `D1_ORDER_TO_CASH_BASELINE_LOCKED`).
2. A verification command the human runs to confirm the work
   (Playwright spec, syntax check, fixture parse, etc.).
3. A NEXT_FILE pointer indicating the next prompt to run.

Without all three, the AI's output cannot be accepted into the
ledger. This forces every AI session to terminate at a known state,
not at an arbitrary stopping point.

---

## 6. Anti-patterns (what AI must not do)

```
- Skip pre-flight reading and "infer" the spec
- Add files outside the allowed list "for completeness"
- Re-state earlier decisions instead of pointing to them (no duplicate)
- Use forbidden vocabulary ("production go-live", "production cutover")
- Refactor unrelated code while doing the assigned change
- Add features beyond the task scope ("while I was here I also...")
- Write its own decision phrase without the required structure
- Mark a task complete before verification commands pass
```

---

## 7. Anti-pattern enforcement

Pull request review checks:
- File diff is subset of declared allowed list
- No introduction of forbidden vocabulary (CI grep)
- Decision phrase line present in commit message or task summary
- NEXT_FILE pointer documented

A PR failing any of these is rejected without further review.

---

## 8. The 7 mandatory elements of a HESEM AI prompt

Every prompt to an AI agent for HESEM work must contain:

```
1. TASK CLASS         (T1..T15 from READING_DISCIPLINE.md)
2. PRE-FLIGHT READING (which Parts/Chapters of V9 to read)
3. CURRENT TASK       (one sentence: what to produce)
4. ALLOWED FILES      (explicit list)
5. FORBIDDEN FILES    (explicit list, including ADR-0004)
6. DECISION PHRASE    (what to emit on success)
7. VERIFICATION       (how human confirms it worked)
```

A prompt missing any of these is malformed and must be rewritten.

---

## 9. Example: good prompt vs bad prompt

```
BAD PROMPT
"Implement the order to cash workflow."

GOOD PROMPT
TASK CLASS: T1 (state machine update)
PRE-FLIGHT READING: A1, B6, B7, D1, M4
CURRENT TASK: extend SM-1 with new "OnHold" state per D1 §6 (do not
              change other states)
ALLOWED FILES: mom/api/services/Order/StateMachineService.php
FORBIDDEN FILES: mom/portal.html, *.css, *.js (ADR-0004)
DECISION PHRASE: SM_1_ONHOLD_STATE_ADDED
VERIFICATION: phpunit tests/State/SM1Test.php
NEXT_FILE: PROMPT_PACK_<N>_QA.md
```

---

## 10. Decision phrase

```
L5_AI_PROMPT_DISCIPLINE_BASELINE_LOCKED
NEXT: PART_M_REFERENCE/M0_PART_M_OVERVIEW.md
```

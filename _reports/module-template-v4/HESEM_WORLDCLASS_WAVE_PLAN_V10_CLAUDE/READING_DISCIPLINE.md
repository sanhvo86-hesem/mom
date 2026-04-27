# V9 — READING DISCIPLINE (kỷ luật đọc và viết)

This file specifies how every contributor — human teammate or AI agent —
engages with the V9 plan. The discipline below exists so that work is never
duplicated, never off-topic, never out of context, and always traceable.

If you skip this discipline, your work will likely overlap or contradict
existing planning. Do not skip it.

---

## 1. The pre-flight protocol (mọi AI hoặc người đọc đều phải thực hiện)

Before any AI agent or human contributor begins a task related to HESEM, the
agent or person performs this exact sequence:

```
STEP 1.  Read README_START_HERE.md          (3-5 minutes)
STEP 2.  Read MASTER_OVERVIEW.md             (8-12 minutes)
STEP 3.  Read this READING_DISCIPLINE.md     (5-7 minutes)
STEP 4.  Identify the task class             (see §3 below)
STEP 5.  Read the Part / Chapter list        for that task class
STEP 6.  Confirm scope alignment              (see §4 below)
STEP 7.  Begin work
```

Average pre-flight cost: 30-45 minutes for a new agent. Subsequent tasks for
the same agent need only steps 4 through 7 if the agent's working memory has
preserved the master context.

---

## 2. Why this discipline matters

V8 (the predecessor) showed two problems repeatedly when AI agents wrote
without pre-flight:

- **Topic drift**: an agent asked to write the inventory module's API
  description ended up rewriting parts of the inventory data model and the
  inventory UI mockup, three Parts at once, with overlap and contradiction.
- **Scope inflation**: an agent asked for a 1-page summary of one workflow
  produced a 30-page treatise that covered five workflows — none of them
  thoroughly.

Both behaviors cost real time to undo. The discipline below prevents both.

---

## 3. The task-class taxonomy

Every HESEM task falls into exactly one of these classes. Pick one before
you start.

```
CLASS T1  Architecture or layer review
            (PART_B chapters; cross-cutting concerns)
CLASS T2  Domain capability scoping
            (PART_C chapter; one domain at a time)
CLASS T3  Workflow scoping
            (PART_D chapter; one workflow at a time)
CLASS T4  API design
            (PART_E chapter; one API family at a time)
CLASS T5  Frontend surface design
            (PART_F chapter; one UI surface at a time)
CLASS T6  Wave planning
            (PART_G chapter; one wave at a time)
CLASS T7  Quality / compliance posture
            (PART_H chapter; one standard or program at a time)
CLASS T8  Operations posture
            (PART_I chapter; one operational concern at a time)
CLASS T9  Vertical pack scoping
            (PART_J chapter; one pack at a time)
CLASS T10 Business model
            (PART_K chapter; one business question at a time)
CLASS T11 AI discipline
            (PART_L chapter; one AI feature or governance question at a time)
CLASS T12 Reference catalog update
            (PART_M chapter; one catalog at a time)
CLASS T13 Slice planning (slice = one root × one surface × one maturity)
            (per-slice document below the V9 root, in customer / engineering
            project space; references V9 chapters)
CLASS T14 Implementation
            (NOT in V9; happens in mom/... in actual code; references V9 for spec)
CLASS T15 Master plan amendment
            (rare; requires explicit user approval; updates V9 itself)
```

If your task does not fit any of these classes, your task is not yet
properly scoped. Re-scope before you write.

---

## 4. Scope-alignment confirmation

Before producing any output, the agent (human or AI) writes down:

- Task class identifier (T1 - T15)
- Specific Part and Chapter affected
- One-sentence purpose of the work
- Forbidden Parts (which Parts are explicitly out of scope for this task)
- Expected output size (pages or paragraphs)
- Decision phrase that closes the task

Example of a properly scoped scope-alignment for a real task:

```
TASK_CLASS:  T4
PART:        PART_E
CHAPTER:     E4 (Record API per Domain — Quality Improvement domain)
PURPOSE:     Author the description of the Nonconformance Case API endpoints,
             listing each endpoint, its purpose, audience, request shape (in
             plain English), success result (in plain English), and failure
             modes referencing the problem registry.
FORBIDDEN_PARTS: PART_C (do not redescribe NQCASE business scope), PART_F (do not
             describe UI), PART_D (do not redescribe workflow), PART_M2 (do not
             rewrite root catalog).
SIZE:        approx 200 lines of plain text
DECISION_PHRASE: NQCASE_API_DESCRIPTION_DRAFTED_FOR_REVIEW
```

This 6-line declaration takes 30 seconds to write and saves hours of
duplicative work.

---

## 5. The "do not duplicate" rule

V9 is structured so that any topic has exactly one home. If the topic has
multiple aspects, those aspects are split across Parts but a topic's
**definition** lives in exactly one chapter.

- The definition of "Nonconformance Case" lives in PART_C7.
- The workflow that NCs participate in lives in PART_D6 (NC to CAPA).
- The API that exposes NCs lives in PART_E (relevant chapter).
- The UI that renders NCs lives in PART_F.
- The state machine that governs NCs lives in PART_M3.
- The validation evidence the NC root carries lives in PART_H4.

When you need to mention NCs in any of those chapters, you reference PART_C7
for the definition. You do not redefine NC.

This is enforced by sentence:

> "When a topic could fit in multiple Parts, follow the explicit owner
> reference in the existing chapter; do not duplicate."

If you find that a topic has no explicit owner, that is a planning gap;
record it in PART_M (planning gap log) and ratify with the user before you
start writing in any Part.

---

## 6. The "no code" rule

V9 contains no code, no SQL DDL, no JSON Schema, no YAML configurations, no
source files of any language. When you describe an entity that will become
code, you describe:

- What the entity needs to hold (in plain words, not column names)
- Why it exists
- Who owns it
- How it relates to other entities
- What constraints apply (described, not enforced by SQL CHECK)
- What evidence proves it works

Example:

```
NOT V9 STYLE:
  CREATE TABLE nqcase (
    id UUID PRIMARY KEY,
    lot_id UUID NOT NULL REFERENCES lot(id),
    severity TEXT CHECK (severity IN ('critical','major','minor','cosmetic')),
    ...
  );

V9 STYLE:
  Each Nonconformance Case carries a unique identifier, the lot on which the
  defect was observed (always exactly one lot, with mandatory linkage to the
  Lot root), a severity classification (one of: critical, major, minor,
  cosmetic), the defect description, the discoverer's identity, the
  discovery timestamp, and a status that follows the NC state machine
  defined in PART_M3. Severity is frozen at creation time; escalation
  requires a formal review (described in PART_C7 §nc-escalation). The lot
  link is the primary join into the Material genealogy described in PART_C8.
```

The first form is implementation. The second form is plan. V9 contains the
second form only.

---

## 7. The "no production wording" rule

Until Wave 8 plus the cutover gate, the following phrases never appear in
any V9 chapter, any commit message, any code comment, any customer
communication, or any internal document:

```
- "production go-live"
- "production cutover"
- "production release"
- "validated production system"
- "production-validated"
- "production-ready" (without explicit qualifier)
- "fully validated production deployment"
```

Allowed substitutes:

```
- "development / prototype"
- "current portal safety"
- "pre-production readiness"
- "first-slice prototype"
- "limited Wave N implementation"
- "controlled pre-production"
- "release-candidate-grade" (after Wave 8 only)
```

This rule comes from V3 RULE-3 and is reaffirmed here because some V8
content drifted toward production wording prematurely.

---

## 8. The AI prompt scoping rule

When a human writes a prompt for an AI agent (Codex / Claude / GPT) to do
HESEM work, the prompt MUST include:

1. **Mandatory reads** — the V9 files the agent must read first.
2. **Task class** (T1 - T15 from §3 above).
3. **Specific Part and Chapter** the work belongs to.
4. **Forbidden Parts** — explicit list of Parts the agent must not touch.
5. **Required outputs** — explicit list of files or sections to produce.
6. **Acceptance criteria** — explicit definition of done.
7. **Decision phrase** — exact phrase the agent emits when finished.

A prompt missing any of these seven elements is malformed. The agent should
either refuse to work or request clarification. This single rule prevents
the topic-drift and scope-inflation problems that plagued V7 and V8 work.

---

## 9. The "ratify before extending" rule

If, while doing your task, you discover that V9 has a gap (a missing chapter,
a missing Part, an undefined term, an unspecified workflow), you do NOT fill
the gap inline. Instead:

1. Stop your current task at a clean checkpoint.
2. Write a one-paragraph "planning gap" entry in PART_M (Planning Gap Log).
3. Send the gap entry to the user for ratification.
4. After the user ratifies, the gap is filled in the appropriate Part by
   the appropriate person, then your task resumes.

This rule prevents content sprawl. The user's intent in commissioning V9 was
to have one clean planning master, not a thicket of ad-hoc additions.

---

## 10. Per-task pre-flight template

Copy and fill this template as the first thing the agent (or you) writes
when starting a task:

```
TASK PRE-FLIGHT (V9)
=====================
date:                 <YYYY-MM-DD>
agent_or_person:      <name or model>
task_class:           T<N> (one of T1-T15)
part_owned:           PART_<X>
chapter_owned:        <chapter id>
purpose:              <one sentence>
mandatory_reads_done: README, MASTER_OVERVIEW, READING_DISCIPLINE, [other parts]
forbidden_parts:      [list of parts not to touch]
expected_size:        <pages or paragraphs>
decision_phrase:      <exact phrase to emit when done>

CONFIRM ALIGNMENT (yes/no): yes
PROCEED:                    yes
```

If "CONFIRM ALIGNMENT" is no, do not proceed; resolve scope first.

---

## 11. Boundary with the actual repo

V9 lives in `_reports/module-template-v4/HESEM_WORLDCLASS_WAVE_PLAN_V9_CLAUDE/`.
It is planning. It does not modify code, schemas, or infrastructure.

Implementation lives in:

- `mom/...` (server, services, frontend, schemas, tests)
- `.ai/...` (repo conventions and indices)
- `docs/adr/...` (architecture decision records)
- `_reports/module-template-v4/V<N>_*.md` (per-wave reports)

V9 references these locations by purpose, not by file path. When V9 says
"the Authority Ledger is implemented in the repo," the reader knows the
implementation lives in `mom/...` somewhere; V9 does not name the file
because file paths can change.

---

## 12. Maintenance of V9

V9 is not frozen. It evolves as planning matures. But every change to V9
follows this discipline:

```
- One change at a time.
- One Part at a time.
- Pre-flight scoped per §10 template.
- Decision phrase emitted at end.
- User ratification for any structural change (new Part, new Chapter,
  removed Chapter, renamed Part).
- Cosmetic / typographic / clarification edits do not need ratification.
```

A "structural change" is any change that another reader of V9 would have to
re-orient around. Adding a new chapter to PART_C is structural. Fixing a
typo in the Master Overview is not.

---

## 13. Decision phrase

```
V9_READING_DISCIPLINE_BASELINE_LOCKED
NEXT: open PART_A_VISION_AND_SCOPE/A0_VISION.md
```

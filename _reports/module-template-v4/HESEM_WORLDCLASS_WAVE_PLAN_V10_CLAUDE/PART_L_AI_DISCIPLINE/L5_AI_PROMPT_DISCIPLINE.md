# PART_L — L5 — AI Prompt Discipline (V10)

```
chapter_id:     L5
version:        V10
owner_role:     AI Lead + all HESEM contributors using AI agents
wave_target:    applies from W0 onward — every AI-agent session
applies_to:     every human who uses an AI agent (Claude, GPT, Gemini,
                or any LLM tool) to produce HESEM artifacts, code,
                documentation, governance records, or migration scripts
dependencies:   L0 (task classes), L1 (boundary reminder in every prompt),
                L2 (feature in scope), CLAUDE.md (forbidden file list +
                ADR-0004), ADR-0001 through ADR-0011
```

L5 governs the prompts humans write when using AI agents to produce
HESEM artifacts. A malformed prompt — one that is vague about scope,
omits regulatory context, skips the boundary reminder, or lacks a
verification step — produces output that fails HESEM quality gates
and requires rework. L5 exists to make "one-shot quality" the norm
rather than the exception, and to give regulators a traceable record
that AI-assisted work was bounded and verified by a competent human.

---

## 1. The Fundamental Principle

AI agents are fast and capable at drafting, searching, refactoring,
and reasoning — but they do not know which HESEM commitments are locked,
which files are forbidden, which regulatory constraints apply to a given
domain, or what the current pre-production posture requires. A human
who writes an imprecise prompt transfers the burden of inference to the
agent. That inference is unreliable: the agent may generate plausible
output that violates ADR-0004, touches a frozen file, uses a banned
pattern, or drafts a decision that crosses the L1 human authority
boundary.

The three-layer discipline (CONTEXT / SCOPE / CHECK) forces the human
to articulate all of this before the agent executes. A prompt that
passes all three layers is not just better quality — it is the evidence
that a competent human bounded the task. That evidence is what
regulators, auditors, and cross-team reviewers need to trust
AI-assisted output.

---

## 2. The Three-Layer Structure

Every HESEM AI prompt MUST contain all three layers, in order.
Omitting any layer renders the prompt malformed. A malformed prompt
must be rewritten before the agent executes.

```
LAYER 1: CONTEXT
  Who you are, what session this is, what the current state is,
  which part of HESEM is in scope, and what regulatory framework
  governs the work. Also includes the mandatory L1 boundary reminder.

LAYER 2: SCOPE
  Exactly what you want the agent to produce. Which files may be
  touched, which files are forbidden. What output format is expected.
  What constraints (word count, schema, decision phrase) apply.

LAYER 3: CHECK
  What verification the agent must run before declaring done.
  What decision phrase the agent must emit when complete.
  What the NEXT step is (next file, next gate, next prompt class).
```

---

## 3. Layer 1 — CONTEXT: Full Specification

### 3.1 Mandatory CONTEXT fields

```
CONTEXT block must include ALL of the following:

C1  Role declaration
    "I am [role: AI Lead / QMS Analyst / Dev Engineer / etc.] working
    on HESEM V10 upgrade, session [session-id or date]."

C2  Pre-production posture reminder
    "HESEM is in pre-production / prototype posture per ADR-0001.
    No production go-live language. No fixture promotion to
    mom/qms-data without explicit approval."

C3  L1 boundary reminder (MANDATORY in every prompt)
    "L1 Human Authority Boundary is in effect. The agent must not
    draft output that would commit a banned decision (BD-1..BD-36)
    autonomously or that removes the human override path."

C4  Domain / part declaration
    "This task is in PART [X], domain [domain slug], wave [W#]."

C5  Current state summary
    "The current state of [file or section] is: [brief summary or
    'not yet written' or 'V9 baseline exists at [path]']."

C6  Regulatory frame (if applicable)
    "Applicable standards: [e.g., EU AI Act Art 14, NIST AI RMF
    MAP, ISO 42001 §8, ICH Q9(R1), FDA PCCP Draft 2023]."

C7  Dependency declaration
    "This output depends on: [list files already read, decisions
    already locked, constraints from previous prompts]."
```

### 3.2 Why each CONTEXT field is mandatory

**C1 — Role declaration**: The agent adjusts technical depth based
on the role. An AI Lead prompt for L4 should receive adversarial
probe specifications; a QMS Analyst prompt for a CAPA root-cause
section should receive regulatory citation depth, not ML theory.

**C2 — Pre-production posture reminder**: Without this, the agent
may draft "production cutover" or "go-live" language. This language
appears reasonable in isolation but violates ADR-0001. The posture
reminder prevents this in every session.

**C3 — L1 boundary reminder**: The most critical field. It prevents
the agent from drafting content that routes a banned decision through
an automated path. The agent cannot know the full BD-1..BD-36 list
from training data; the reminder forces it to apply the constraint
consciously and flag ambiguities rather than resolve them silently.

**C4 — Domain / part declaration**: HESEM has 12 domains and 5
vertical packs. The same term means different things in different
domains (e.g., "lot release" in Pharma J1 is BD-5; in Food J5 it is
governed by BD-26). The domain/part declaration disambiguates.

**C5 — Current state summary**: Prevents the agent from writing as
if the section does not exist when it does, or assuming V9 content
is current when it has been upgraded. Always say whether a file
exists and what version it is at.

**C6 — Regulatory frame**: Anchors output to the correct standards.
Without this, the agent may apply generic ISO language when the prompt
requires FDA PCCP specifics, or vice versa.

**C7 — Dependency declaration**: Prevents the agent from contradicting
locked decisions. If L1 is locked and L2 references BD numbers, the
L2 prompt must include C7: "L1 V10 is locked; BD-1..BD-36 schema is
fixed. Do not renumber or redefine."

---

## 4. Layer 2 — SCOPE: Full Specification

### 4.1 Mandatory SCOPE fields

```
SCOPE block must include ALL of the following:

S1  Task type (from T1-T15 classification — see §5)
    "Task class: T[N] — [task class name]."

S2  Output artifact declaration
    "Produce: [filename, section, schema type, or code unit]."
    "Format: [markdown / JSON / PHP / SQL / TypeScript]."

S3  Content requirements
    "Required sections: [list]."
    "Minimum substance: [word count OR schema field count OR test
    count — whichever applies to the task class]."
    "Do NOT pad to reach minimum. Every sentence must add substance."

S4  Allowed files (exhaustive list)
    "The agent MAY read and modify ONLY the following files:
    [exhaustive list]. No other files."

S5  Forbidden files (from ADR-0004 + task-class restrictions)
    "The agent MUST NOT touch the following files:
    [list including all ADR-0004 forbidden files plus any
    task-class-specific restrictions]."

S6  Schema and structural constraints
    "Output must conform to: [schema reference or inline schema]."
    "Decision phrase MUST appear verbatim: [phrase]."

S7  Anti-patterns to avoid (from §9 — select applicable)
    "Do not: [list applicable anti-patterns for this task]."
```

### 4.2 Allowed vs forbidden files — baseline (ADR-0004)

The following files are forbidden in ALL HMV4 slice work prompts.
They must be listed in S5 of every T5/T6/T7/T8 task-class prompt:

```
FOREVER FORBIDDEN (ADR-0004):
  mom/portal.html                   (only feature-flag insertion allowed)
  mom/styles/portal.main.css
  mom/styles/eqms-suite.css
  mom/styles/density-darkmode.css
  mom/scripts/portal/01-module-router.js
  mom/scripts/portal/02-state-auth-ui.js
  mom/scripts/portal/40-eqms-shell.js
```

HMV4 source files (allowed for slice work):

```
ALLOWED IN HMV4 SLICE WORK:
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

### 4.3 Scope creep prevention

The SCOPE layer is where scope creep is eliminated before work begins.
If the prompt does not enumerate exactly which files may be touched,
the agent will expand scope based on its best judgment. That judgment
may be wrong, may trigger forbidden-file violations, or may introduce
regressions in adjacent systems.

Rule: if a file is not in the S4 allowed list, the agent must not
read or modify it. If the agent determines it needs a file not listed,
it must halt and request scope expansion from the human. It must not
proceed by inferring permission.

---

## 5. Task Class Catalog (T1-T15)

Each task class has a designated reading list, allowed file scope,
a decision phrase pattern, and specific verification requirements.

### T1 — Governance document authorship

```
definition:   Writing or upgrading a PART document (A-M chapters),
              plan section, or policy chapter.
reading_list: L0 (overview for the part), L1 (always), relevant
              part overview, V9 baseline of the target file.
allowed_files: target _reports/.../*.md file ONLY.
forbidden_files: all ADR-0004 list; mom/docs/ (read-only for reference);
              any source code file.
decision_phrase_pattern: "[FILENAME_NO_EXT]_V10_LOCKED"
verification: wc -w target >= declared minimum; grep for decision phrase;
              grep for any forbidden pattern (production go-live, etc.);
              cross-check BD numbers are consistent with L1 if BD referenced.
```

### T2 — Regulatory mapping or standards annotation

```
definition:   Adding regulatory citations, cross-references, or
              compliance mappings to existing governance documents.
reading_list: the target document; the relevant standard text
              (EU AI Act article, NIST AI RMF function, ISO clause);
              H4 evidence class catalog.
allowed_files: target _reports/.../*.md file; _reports/ read-only references.
forbidden_files: all source code; all migration SQL; mom/docs/ write.
decision_phrase_pattern: "[FILENAME]_REG_MAPPING_V[N]_COMPLETE"
verification: every citation must resolve to a real standard clause;
              no hallucinated clause numbers; cross-check with
              regulatory alignment summary in L0.
```

### T3 — AI feature governance contract

```
definition:   Writing or revising a feature governance contract entry
              in L2 AI Feature Catalog (AI-01..AI-36 or new entries).
reading_list: L0, L1, L2 (full current catalog), L3 (lifecycle stage
              referenced), L4 (red-team cadence referenced).
allowed_files: L2_AI_FEATURE_CATALOG.md ONLY.
forbidden_files: all ADR-0004 list; all source code; L1, L3, L4 (read-only).
decision_phrase_pattern: "AI_FEATURE_[ID]_CONTRACT_V[N]_LOCKED"
verification: 28-field governance contract fully populated; tier assigned;
              banned-decision paths verified against L1 (none routed);
              KPI catalog entry added; red-team cadence referenced;
              sub-processor fields completed if applicable.
```

### T4 — Red-team probe design

```
definition:   Designing new probes, extending the probe pack, or
              writing per-pack probe extensions in L4.
reading_list: L1 (BD list), L2 (feature contracts), L4 (current probe pack),
              OWASP LLM Top 10 2024, MITRE ATLAS.
allowed_files: L4_AI_RED_TEAM.md ONLY.
forbidden_files: all source code; all other L-files (read-only).
decision_phrase_pattern: "L4_PROBE_EXTENSION_[PACK]_V[N]_LOCKED"
verification: probe has goal, HESEM context, probe count, pass criteria;
              severity class assigned; no probe permits autonomous banned
              decision (L1 check); pack extension is additive only.
```

### T5 — HMV4 slice implementation (frontend)

```
definition:   Implementing a slice of the HMV4 prototype (one root x
              one pattern): hydration, bridge, renderer, fixture.
reading_list: STRATEGIC_MASTER.md, WAVE1_18_ROOT_SLICE_SEQUENCING_ROADMAP.md,
              ADR-0001..ADR-0009, 70-73 current state, fixture schemas.
allowed_files: 70-module-template-v4-hydration.js,
              71-module-template-v4-routes.js,
              72-module-template-v4-bridge.js,
              73-module-template-v4-renderers.js,
              74-module-template-v4-fixtures.js,
              mom/styles/module-template-v4.tokens.css,
              mom/styles/module-template-v4.css,
              mom/templates/module-template-v4/module-template-v4.html,
              tests/e2e/module-template-v4*.spec.ts,
              tests/fixtures/module-template-v4/**
forbidden_files: ALL ADR-0004 forbidden list (non-negotiable);
              mom/qms-data/** (no promotion without approval);
              any production config file.
decision_phrase_pattern: "SLICE_[ROOT]_[PATTERN]_IMPL_COMPLETE"
verification: node --check on 70-74; JSON fixture parse; forbidden-diff
              guard; fixture-not-in-portal guard; feature flag inert check;
              Playwright E2E 100% chromium; Graphics Authority compliance
              (no hex/px in JS).
anti_patterns: no hardcoded colors; no direct HmTheme.saveAdminConfig calls;
              no live API calls from fixture mode; no 74 loaded in portal.html.
```

### T6 — HMV4 test authorship

```
definition:   Writing or extending Playwright E2E specs for HMV4 slices.
reading_list: existing spec files for the root; fixture JSON for the root;
              bridge contract schema; ADR-0005.
allowed_files: tests/e2e/module-template-v4*.spec.ts;
              tests/fixtures/module-template-v4/**
forbidden_files: all ADR-0004 list; 70-74 source (read-only);
              tests/fixtures/module-template-v4/** (may write new fixtures,
              not modify root schemas without explicit approval).
decision_phrase_pattern: "SPEC_[ROOT]_[SUITE]_AUTHORED_COMPLETE"
verification: npm run test:hmv4 -- --project=chromium passes 100%;
              axe-core accessibility tests pass; visual snapshot baseline
              committed; bridge contract coverage >= declared percentage.
```

### T7 — Database migration authorship

```
definition:   Writing a new SQL migration (PostgreSQL) for HESEM tables.
reading_list: .ai/db-map/<domain>.json; existing migrations in
              mom/db/migrations/; .ai/contracts-map.json for the resource.
allowed_files: mom/db/migrations/[N]_[name].sql (new file ONLY);
              .ai/ index files (read-only).
forbidden_files: existing migration files (never modify a shipped migration);
              all ADR-0004 list; all HMV4 source files.
decision_phrase_pattern: "MIGRATION_[N]_[NAME]_AUTHORED"
verification: SQL parses cleanly (psql --dry-run or equivalent);
              no DROP TABLE without explicit user approval;
              no modification of existing rows without explicit approval;
              rollback section present; 4-mode strategy compatibility verified.
```

### T8 — API controller / service authorship

```
definition:   Writing or extending a PHP controller, service, or
              middleware unit.
reading_list: .ai/route-map.json; .ai/symbols.json; .ai/repo-map.json;
              .ai/db-map/<domain>.json; existing controller for the domain.
allowed_files: the specific controller or service file being modified;
              new files in mom/api/controllers/ or mom/api/services/;
              relevant migration files (read-only for schema reference).
forbidden_files: all ADR-0004 list; all HMV4 source files;
              mom/api/index.php middleware pipeline (read-only unless
              explicitly approved).
decision_phrase_pattern: "API_[CONTROLLER]_[ACTION]_IMPL_COMPLETE"
verification: php -l on all modified files; no SQL injection patterns
              (parameterized queries only); no auth bypass; audit trail
              write confirmed; 4-mode strategy compatibility; no hardcoded
              credentials.
```

### T9 — QMS document authorship (DCC-controlled)

```
definition:   Writing or editing a controlled QMS document under
              mom/docs/**.
reading_list: mom/contracts/objects/quality_improvement--document-control/
              dcc-document-header.standard.md; a recent peer document for
              the DCC bootstrap pattern.
allowed_files: the specific mom/docs/**/*.html file being authored;
              DCC migration for new document (if creating new).
forbidden_files: all ADR-0004 list; all HMV4 source files;
              11-dcc-header-renderer.js (read-only);
              data-dcc-bootstrap JSON inline (never edit directly).
decision_phrase_pattern: "DCC_[DOC_CODE]_AUTHORED_[DATE]"
verification: php mom/tools/dcc-batch/audit.php passes for the doc;
              DCC header pattern present; filename matches doc code;
              no legacy form-header / title / meta blocks;
              DB row exists in dcc_document_header.
```

### T10 — AI lifecycle gate record authorship

```
definition:   Drafting a stage gate record, model card, lifecycle
              completion certificate, or governance ledger entry for
              an AI feature transition (L3 §§3, 5, 9, 10).
reading_list: L2 (feature governance contract), L3 (stage gate criteria
              for the target stage), L4 (red-team gate if S4 or S8).
allowed_files: the specific governance ledger document or model card
              being created; _reports/ destination only.
forbidden_files: all source code; all migration SQL; L3 itself (read-only
              for gate criteria).
decision_phrase_pattern: "GATE_[FEATURE_ID]_S[N]_TO_S[N+1]_SIGNED"
verification: all mandatory exit criteria for the gate present;
              red-team gate reference included if S4;
              model card fully populated if S3 output;
              signing authority declared; evidence class references correct
              (EC-6 for retraining, EC-7 for red-team, EC-23 for model card).
```

### T11 — Adversarial probe execution record

```
definition:   Documenting the results of a red-team probe session
              (L4 §§5-8): probe category, findings, severity, remediation.
reading_list: L4 (probe pack for the feature); L2 (feature governance
              contract); L1 (BD list for banned-decision probe results).
allowed_files: the specific red_team_event governance ledger entry;
              _reports/ destination.
forbidden_files: all source code (agent documents, does not patch);
              L4 source itself (read-only).
decision_phrase_pattern: "RED_TEAM_[FEATURE_ID]_[CADENCE]_[DATE]_RECORDED"
verification: red_team_event schema fully populated; findings list includes
              severity class for each finding; SEV-1 findings have 24h SLA
              start confirmed; remediation owner assigned; evidence class
              EC-7 tag present.
```

### T12 — Fixture data authorship

```
definition:   Writing or extending JSON fixture data for HMV4 slices
              or test suites.
reading_list: tests/fixtures/module-template-v4/README.md;
              bridge-fixtures.json schema; record-fixtures.json schema;
              the slice spec for the root being fixture-extended.
allowed_files: tests/fixtures/module-template-v4/**/*.json;
              tests/fixtures/module-template-v4/README.md.
forbidden_files: all ADR-0004 list; 70-74 source files (read-only
              to understand expected fixture shape);
              mom/qms-data/** (no production data promotion).
decision_phrase_pattern: "FIXTURE_[ROOT]_[TYPE]_EXTENDED_COMPLETE"
verification: Python json.loads passes on all modified JSON files;
              fixture shape matches bridge contract schema;
              no live-data PII present in fixtures;
              74-fixture not referenced in portal.html.
```

### T13 — Reference material authorship (M-part)

```
definition:   Writing glossary entries, domain model diagrams, root
              catalogs, state machine directories, SLO entries, or
              bibliography entries (M-part chapters).
reading_list: M-part overview; existing entries in the target file;
              the domain source documents for factual grounding.
allowed_files: the specific M-part target file ONLY.
forbidden_files: all source code; all migration SQL; all other
              reference files (read-only for cross-reference).
decision_phrase_pattern: "[MFILE_ID]_[SECTION]_AUTHORED_V[N]"
verification: every term/root/SLO entry complete per declared schema;
              no orphan cross-references (all NEXT/SEE pointers resolve);
              no hallucinated standard clause numbers;
              state machine entries include all states, transitions,
              and guard conditions.
```

### T14 — ADR authorship or amendment

```
definition:   Writing a new Architectural Decision Record or
              amending a frozen ADR (requires explicit human sign-off).
reading_list: docs/adr/ existing ADRs; CLAUDE.md; relevant PART chapters
              that the decision affects.
allowed_files: docs/adr/ADR-[N]-[slug].md (new only; amendments require
              explicit user approval before agent writes).
forbidden_files: all source code; ADR-0001..ADR-0011 (FROZEN — agent
              may NOT amend without explicit human sign-off in prompt).
decision_phrase_pattern: "ADR_[N]_AUTHORED" or "ADR_[N]_AMENDMENT_SIGNED"
verification: ADR format complete (title, status, context, decision,
              consequences, supersedes/superseded-by if applicable);
              if amending frozen ADR, human sign-off phrase present in
              prompt; cross-references to affected PART chapters updated.
```

### T15 — Cross-cutting quality gate verification

```
definition:   Running a full quality gate pass across an entire part,
              stream, or wave: checking consistency, completeness,
              cross-references, and regulatory alignment.
reading_list: all documents in scope; L0 (overview); L1 (BD list);
              the relevant quality gate checklist.
allowed_files: the agent reads all files; it may write ONLY a quality
              gate report file in _reports/.
forbidden_files: all source files; all source code (agent reads, does not
              modify — findings are reported for human action).
decision_phrase_pattern: "QA_GATE_[SCOPE]_[DATE]_COMPLETE"
verification: findings list includes each file checked; each finding
              includes severity (BLOCKER / WARN / INFO);
              BLOCKER findings must be resolved before the stream
              completion phrase is emitted.
```

---

## 6. Layer 3 — CHECK: Full Specification

### 6.1 Mandatory CHECK fields

```
CHECK block must include ALL of the following:

K1  Verification commands (executable)
    "Run the following before declaring done:
    [list of commands: node --check, wc -w, grep, python -c, etc.]"

K2  Decision phrase (verbatim)
    "Emit the following decision phrase at the END of output,
    on its own line, verbatim:
    [DECISION_PHRASE]"

K3  Conflict guard
    "If any output would: touch a forbidden file / cross an L1
    banned decision / use a forbidden vocabulary term / produce a
    schema-invalid structure — HALT, describe the conflict, and
    wait for human resolution. Do not proceed."

K4  NEXT pointer
    "After this task is complete, the next task is:
    [next file / next prompt class / 'await human instruction']."

K5  Escalation condition
    "If you find that completing this task correctly requires
    information or permissions not in this prompt, halt and list
    exactly what is missing. Do not infer or expand scope."
```

### 6.2 Why the decision phrase is non-negotiable

The decision phrase is the machine-readable completion signal in every
HESEM AI-assisted workflow. It serves three functions:

1. **Audit trail anchor**: When the governance ledger records an
   AI-assisted artifact, the decision phrase is logged as the
   completion attestation. It links the artifact to the specific
   task class and version.

2. **Prompt-chain control**: Sequential prompt execution (S4-11,
   S4-12, etc.) gates the next prompt on the previous phrase. An
   absent or misspelled phrase means the chain broke.

3. **Quality signal**: An agent that produces a decision phrase
   has at minimum processed the CHECK layer. An absent phrase is
   a strong signal the agent exited early or hit an error it did
   not surface.

---

## 7. The Seven Mandatory Elements

A HESEM AI prompt is malformed unless all seven elements are present.
Reviewers and AI Leads use this checklist before approving any
AI-assisted artifact.

```
ELEMENT 1 — Role and session identity (C1)
  Present: "I am [role], session [id]..."
  Absent: REJECT — agent cannot calibrate depth or accountability.

ELEMENT 2 — Pre-production posture reminder (C2)
  Present: ADR-0001 language, prototype/development wording.
  Absent: REJECT — risk of production-release language in output.

ELEMENT 3 — L1 boundary reminder (C3)
  Present: explicit BD mention and override-path preservation.
  Absent: REJECT — highest-risk omission; may produce content that
          routes a banned decision autonomously.

ELEMENT 4 — Explicit task class (S1)
  Present: "Task class: T[N] — [name]."
  Absent: REJECT — agent cannot apply correct reading list, allowed
          file scope, or verification requirements.

ELEMENT 5 — Allowed and forbidden file lists (S4, S5)
  Present: exhaustive lists; forbidden list includes ADR-0004 baseline.
  Absent: REJECT — scope creep and forbidden-file violations are the
          single most common failure mode in AI-assisted HMV4 work.

ELEMENT 6 — Executable verification commands (K1)
  Present: runnable commands the agent can execute and report.
  Absent: REJECT — unverified output ships; gate failures discovered
          downstream.

ELEMENT 7 — Decision phrase (K2)
  Present: verbatim phrase declared.
  Absent: REJECT — prompt-chain control breaks; governance ledger
          cannot record completion.
```

---

## 8. Per-Layer Reading List by Task Class

| Task Class | CONTEXT reading | SCOPE filing | CHECK phrase pattern |
|---|---|---|---|
| T1 Governance | L0, L1, part overview, V9 baseline | _reports/.../*.md | [FILENAME]_V10_LOCKED |
| T2 Reg mapping | target doc + standard text | _reports/.../*.md | [FILE]_REG_MAPPING_COMPLETE |
| T3 AI contract | L0-L4 full | L2 only | AI_FEATURE_[ID]_CONTRACT_LOCKED |
| T4 Red-team | L1, L2, L4, OWASP | L4 only | L4_PROBE_EXTENSION_[PACK]_LOCKED |
| T5 HMV4 impl | STRATEGIC_MASTER, ADRs | 70-74 + styles + tests | SLICE_[ROOT]_[PATTERN]_IMPL_COMPLETE |
| T6 HMV4 test | spec files + fixtures | tests/e2e + tests/fixtures | SPEC_[ROOT]_[SUITE]_COMPLETE |
| T7 Migration | db-map/<domain>, contracts-map | new .sql file only | MIGRATION_[N]_[NAME]_AUTHORED |
| T8 API | route-map, symbols, repo-map | controller/service file | API_[CONTROLLER]_[ACTION]_COMPLETE |
| T9 QMS doc | DCC standard + peer doc | mom/docs/**/*.html | DCC_[CODE]_AUTHORED_[DATE] |
| T10 AI gate | L2, L3, L4 | governance ledger entry | GATE_[FEATURE_ID]_S[N]_SIGNED |
| T11 Red-team rec | L4, L2, L1 | ledger entry | RED_TEAM_[ID]_[DATE]_RECORDED |
| T12 Fixture | fixture README + schemas | tests/fixtures/** | FIXTURE_[ROOT]_[TYPE]_COMPLETE |
| T13 Reference | M-part overview + sources | M-part file only | [MFILE]_[SECTION]_V[N] |
| T14 ADR | existing ADRs + CLAUDE.md | docs/adr/ | ADR_[N]_AUTHORED |
| T15 QA gate | all in-scope docs | report file in _reports/ | QA_GATE_[SCOPE]_[DATE]_COMPLETE |

---

## 9. Anti-Patterns: The Prohibited Prompt Failures

### AP-1 — The Unscoped Instruction

```
BAD:  "Write the AI governance section."

WHY:  No domain, no version, no file path, no reading list,
      no forbidden-file list, no decision phrase. The agent
      will produce something plausible and wrong.

FIX:  Specify which PART, which chapter, which version, which
      V9 baseline exists, what sections are required, what the
      minimum substance is, what files are forbidden, and what
      decision phrase to emit.
```

### AP-2 — The Missing L1 Boundary Reminder

```
BAD:  Prompt that describes a BD-adjacent feature design without
      stating "L1 boundary is in effect; no autonomous banned
      decision path."

WHY:  The agent may design an automated workflow that commits
      a BD-adjacent decision without a human override step,
      because it does not know the BD list or why it matters.

FIX:  Include C3 in every prompt that touches AI features,
      compliance workflows, or regulated decision points.
```

### AP-3 — The Implied File Scope

```
BAD:  "Update the hydration module to add the TRAIN slice."

WHY:  "Update" implies the agent may read and write any related
      file. It may touch 01-module-router.js (forbidden) or
      portal.html (forbidden).

FIX:  List every file the agent may touch (S4) and every
      forbidden file (S5) explicitly. Never rely on the agent
      to infer which files are off-limits.
```

### AP-4 — The Unverifiable Claim

```
BAD:  "Write the migration and make sure it's correct."

WHY:  "Make sure it's correct" is not an executable verification.
      The agent will assert correctness without checking.

FIX:  Provide K1 with specific commands:
      "Run: psql --dry-run < migration.sql; verify no DROP TABLE
      present; verify rollback section exists; verify no
      hardcoded credentials."
```

### AP-5 — The Missing Decision Phrase

```
BAD:  Any prompt that does not state the required decision phrase.

WHY:  The agent produces output; the output is used downstream;
      the governance ledger has no completion record; the next
      prompt in the chain cannot verify the previous completed.

FIX:  Always include K2 with the verbatim phrase and instruction
      to emit it at the end of output.
```

### AP-6 — The Scope Expansion Request

```
BAD:  "Also update the related service if you think it needs it."

WHY:  The phrase "if you think it needs it" grants the agent
      unbounded discretion to expand scope. This is the most
      common source of forbidden-file violations and regressions.

FIX:  Never grant discretionary scope expansion. If adjacent
      files need updates, enumerate them in S4 with explicit
      allowed actions, or issue a separate prompt.
```

### AP-7 — The Production Language Slip

```
BAD:  "Prepare this feature for production deployment."

WHY:  Violates ADR-0001 pre-production posture. The agent may
      draft production-readiness checklists, remove feature flags,
      or use go-live language in documentation.

FIX:  Use correct vocabulary: "pre-production readiness,"
      "prototype posture," "development/fixture mode."
      Include C2 in every prompt.
```

### AP-8 — The Regulatory Anchor Omission

```
BAD:  "Write the compliance section for the food vertical."

WHY:  HESEM food pack involves FSMA §204, HACCP, FDA Part 117,
      GFSI, EU EC 852/2004, BD-26/27/28, and FSVP. Without
      regulatory anchoring in C6, the agent may apply generic
      ISO food safety language that does not satisfy the required
      standards.

FIX:  List the specific standards in C6. The agent cannot know
      which standards apply from the task description alone.
```

### AP-9 — The Confidence Collapse

```
BAD:  "Just do your best and fill in any gaps with reasonable
      assumptions."

WHY:  Authorizes hallucination. In HESEM governance documents,
      "reasonable assumptions" about BD numbers, evidence class
      codes, or standard clause references are factual errors
      that may reach regulators.

FIX:  Include K5: if information is missing, halt and report
      exactly what is missing. Do not infer or fill gaps.
```

### AP-10 — The Batch Collapse

```
BAD:  Running two or more prompts simultaneously (e.g., asking
      the agent to write L3 and L4 in the same prompt, or
      issuing L3 and L4 as parallel agent tasks).

WHY:  L4 depends on L3 lifecycle stages for cadence alignment.
      L3 depends on L2 feature contracts. Dependencies exist
      between every chapter. Parallel execution produces
      inconsistent cross-references, contradictory schemas,
      and governance gaps that are expensive to repair.

FIX:  One prompt at a time. Complete, verify, emit decision
      phrase, then proceed to next. Sequential discipline is
      non-negotiable.
```

---

## 10. Worked Examples

### 10.1 Good prompt: T1 governance document authorship

```
CONTEXT
  I am the AI Lead working on HESEM V10 upgrade, session 2026-04-15.
  HESEM is in pre-production / prototype posture per ADR-0001.
  No production go-live language. No fixture promotion.
  L1 Human Authority Boundary is in effect: BD-1..BD-36 are locked;
  no autonomous banned decision path may appear in this output.
  This task is in PART L, AI Discipline, Wave W7.
  Current state: L2_AI_FEATURE_CATALOG.md exists at V9 baseline.
  Dependencies: L1 V10 is locked; BD-1..BD-36 schema fixed.
  Regulatory frame: EU AI Act Art 13/14/15; NIST AI RMF MAP;
  ISO/IEC 42001 §8; 21 CFR Part 11 §11.10(j).

SCOPE
  Task class: T1 — Governance document authorship.
  Produce: L2_AI_FEATURE_CATALOG.md (in-place upgrade of V9 baseline).
  Path: _reports/module-template-v4/HESEM_WORLDCLASS_WAVE_PLAN_V9_CLAUDE/
        PART_L_AI_DISCIPLINE/L2_AI_FEATURE_CATALOG.md
  Required sections:
    §1 Feature inventory table (AI-01..AI-36 minimum)
    §2 Governance contract specification (28-field schema)
    §3 Sample full governance contracts (AI-01, AI-09, AI-19, AI-18)
    §4 RAG grounding discipline (G1..G10)
    §5 Confidence tier definitions
    §6 KPI catalog (12 KPIs) with behavioral rules
    §7 Per-pack overlays J1-J5
    §8 Calibration methodology (ECE, Brier, anti-Goodhart)
    §9 Deployment cadence and retirement procedure
    §10 Pre-deployment gate checklist (16 items)
    §11 Failure modes (10)
    §12 RACI
  Minimum substance: genuine technical content throughout.
  Do NOT pad. Every sentence must add substance.
  Allowed files: L2_AI_FEATURE_CATALOG.md ONLY.
  Forbidden files:
    mom/portal.html
    mom/styles/portal.main.css
    mom/styles/eqms-suite.css
    mom/styles/density-darkmode.css
    mom/scripts/portal/01-module-router.js
    mom/scripts/portal/02-state-auth-ui.js
    mom/scripts/portal/40-eqms-shell.js
    [all source code files]
  Structural constraint: features AI-33..AI-36 are new in V10
    (added for J5 Food and J4 Med Device).
  Anti-patterns: no hallucinated clause numbers; no Tier-3 features;
    no KPI target that encourages Goodhart gaming.

CHECK
  Run: grep "AI-36" L2_AI_FEATURE_CATALOG.md → verify present
  Run: grep -i "production go-live\|production release\|production cutover"
       L2_AI_FEATURE_CATALOG.md → verify NO MATCH
  Run: grep "BD-" L2_AI_FEATURE_CATALOG.md → verify all BD references
       resolve to L1 BD list (no invented BD numbers)
  Conflict guard: if any feature would commit a banned decision
    autonomously, HALT and describe the conflict.
  Decision phrase: emit verbatim at end of output:
    L2_AI_FEATURE_CATALOG_V10_LOCKED
  NEXT: L3_AI_LIFECYCLE.md authorship prompt.
  Escalation: if a feature definition requires information not in
    this prompt, halt and list exactly what is missing.
```

### 10.2 Bad prompt: contrast

```
BAD PROMPT:
  "Upgrade the L2 AI feature catalog to V10. Add new food features.
   Make sure it meets regulatory requirements and is comprehensive."

FAILURES:
  - Missing C1 (role/session)
  - Missing C2 (pre-production posture)
  - Missing C3 (L1 boundary reminder) — CRITICAL
  - No task class declared (S1)
  - No file path declared (S2)
  - No section list (S3)
  - No allowed file list (S4)
  - No forbidden file list (S5) — HIGH RISK
  - "Comprehensive" is not a measurable substance target (S3)
  - No verification commands (K1)
  - No decision phrase (K2) — CRITICAL
  - No NEXT pointer (K4)
  - No escalation condition (K5)
  - 0 of 7 mandatory elements present

LIKELY OUTCOME:
  Agent produces a plausible-looking catalog with hallucinated
  feature IDs, invented regulatory clause numbers, missing BD
  checks, and no decision phrase. The output requires full rework.
```

### 10.3 Good prompt: T5 HMV4 slice implementation

```
CONTEXT
  I am the Dev Engineer implementing HMV4 Slice 3 (TRAIN root,
  Training Matrix Workspace pattern), session 2026-04-20.
  HESEM is in pre-production / prototype posture per ADR-0001.
  All surfaces feature-flagged INERT by default.
  HMV4_PREVIEW_ENABLED=false, HMV4_FIXTURE_MODE=false.
  L1 boundary in effect: no live API calls from fixture mode;
  no banned decision automation in training assignment logic.
  Current state: 70-74 contain Slice 1 (DISP) and Slice 2 (NQCASE)
    implementations. Slice 3 TRAIN not yet started.
  ADR-0001 through ADR-0009 apply.

SCOPE
  Task class: T5 — HMV4 slice implementation.
  Produce: TRAIN workspace projection slice in 70-74 files.
  Required:
    70-hydration.js: registerHMV4Root('TRAIN', ...) call
    71-routes.js: TRAIN route entry
    72-bridge.js: TRAIN bridge transform (fixture to domain model)
    73-renderers.js: TRAIN WorkspaceProjection renderer
    74-fixtures.js: TRAIN fixture data (training matrix records)
    tests/e2e/module-template-v4-train.spec.ts: E2E spec
    tests/fixtures/module-template-v4/train-fixtures.json: fixture JSON
  Allowed files (ONLY):
    mom/scripts/portal/70-module-template-v4-hydration.js
    mom/scripts/portal/71-module-template-v4-routes.js
    mom/scripts/portal/72-module-template-v4-bridge.js
    mom/scripts/portal/73-module-template-v4-renderers.js
    mom/scripts/portal/74-module-template-v4-fixtures.js
    mom/styles/module-template-v4.tokens.css
    mom/styles/module-template-v4.css
    mom/templates/module-template-v4/module-template-v4.html
    tests/e2e/module-template-v4-train.spec.ts (new)
    tests/fixtures/module-template-v4/train-fixtures.json (new)
  Forbidden files:
    mom/portal.html (feature-flag insertion only, not in scope)
    mom/styles/portal.main.css
    mom/styles/eqms-suite.css
    mom/styles/density-darkmode.css
    mom/scripts/portal/01-module-router.js
    mom/scripts/portal/02-state-auth-ui.js
    mom/scripts/portal/40-eqms-shell.js
    mom/qms-data/** (no promotion)
  Anti-patterns: no hardcoded hex colors (use GraphicsAuthority
    tokens); no direct HmTheme.saveAdminConfig calls;
    no live API calls in fixture mode; 74 must NOT be referenced
    in portal.html.

CHECK
  Run: node --check mom/scripts/portal/70-module-template-v4-hydration.js
  Run: node --check mom/scripts/portal/72-module-template-v4-bridge.js
  Run: node --check mom/scripts/portal/73-module-template-v4-renderers.js
  Run: python3 -c "import json; json.load(open('tests/fixtures/module-template-v4/train-fixtures.json'))"
  Run: git diff --name-only | grep -E "portal\.main\.css|eqms-suite|01-module-router|02-state-auth|40-eqms" → NO MATCH
  Run: grep "74-module-template-v4-fixtures" mom/portal.html → NO MATCH
  Run: grep -rE "#[0-9a-fA-F]{3,6}|[0-9]+px" mom/scripts/portal/7*.js → NO MATCH
  Decision phrase: SLICE_TRAIN_WS_IMPL_COMPLETE
  NEXT: npm run test:hmv4 -- --project=chromium; then proceed to
    Slice 4 CAPA planning prompt.
  Escalation: if TRAIN domain model schema is not determinable from
    existing fixtures and the route-map, halt and request the schema.
```

---

## 11. Prompt Discipline Enforcement

### 11.1 Who enforces

```
PRIMARY ENFORCER:  The human issuing the prompt.
                   Self-check against 7-element checklist before sending.

SECONDARY ENFORCER: Peer reviewer or AI Lead reviewing AI-assisted
                    artifacts before merge. Reviewers check:
                    a) Prompt log (if available) for all 7 elements.
                    b) Output for forbidden vocabulary, forbidden files,
                       BD boundary violations.
                    c) Decision phrase present in output.

TERTIARY ENFORCER: Quality gate audit (T15 task) at stream/wave
                   boundaries. Auditor flags all AI-assisted artifacts
                   where prompt log shows missing elements.
```

### 11.2 Enforcement outcomes

```
MISSING ELEMENT 1-2 (role/posture):
  Finding: WARN
  Action: rewrite prompt; re-execute; document in audit log.

MISSING ELEMENT 3 (L1 boundary reminder):
  Finding: BLOCKER
  Action: re-execute with corrected prompt; full L1 re-check of output.
  Rationale: highest-risk omission; may have produced BD-adjacent content.

MISSING ELEMENT 4 (task class):
  Finding: WARN
  Action: rewrite prompt; re-execute.

MISSING ELEMENT 5 (file scope):
  Finding: BLOCKER if forbidden files were touched;
           WARN if only omitted.
  Action: if forbidden files touched — revert output; rewrite prompt;
          re-execute; add to ADR-0004 violation log.

MISSING ELEMENT 6 (verification):
  Finding: WARN
  Action: run verification retroactively; document finding.

MISSING ELEMENT 7 (decision phrase):
  Finding: BLOCKER for governance ledger purposes.
  Action: re-execute check-only prompt to extract/confirm phrase;
          add to governance ledger manually with auditor attestation.
```

### 11.3 Governance ledger record for AI-assisted artifacts

Every AI-assisted artifact MUST have a governance ledger entry:

```
ai_assisted_artifact:
  artifact_id:             <file path or artifact id>
  task_class:              T[N]
  session_id:              <date or session hash>
  human_author:            <principal_id>
  prompt_elements_verified: [1,2,3,4,5,6,7]  # all 7 or list missing
  decision_phrase_emitted: <phrase>
  verification_passed:     true | false
  findings:                []
  evidence_class:          EC-38  # AI advisory generic
  created_at:              <ISO-8601>
```

For T1 governance document authorship, evidence class EC-38 is
supplemented by the locked decision phrase as the completion record.
For T10 lifecycle gate records, the gate signing event uses EC-6 or
EC-7 as the primary evidence class.

---

## 12. Pack-Specific Prompt Extensions

### 12.1 J1 Pharma prompts

Add to C6 (regulatory frame) for any prompt touching J1 domains:

```
"Additional J1 regulatory frame:
  EU GMP Annex 11 (computerised systems);
  FDA 21 CFR Part 11 (electronic records/signatures);
  ICH Q9(R1) (quality risk management);
  ICH Q10 (pharmaceutical quality system);
  EU MDR Art 15 PRRC accountability (if AI-assisted).
  BD-9..BD-15 apply (lot release, batch disposition, APR,
  PSUR, stability, impurity, process validation). Every
  AI advisory in J1 is EC-25; every override is EC-24."
```

### 12.2 J2 Automotive prompts

Add to C6 for J2 domain prompts:

```
"Additional J2 regulatory frame:
  IATF 16949:2016 (QMS for automotive);
  AIAG FMEA 4th Ed (failure mode risk analysis);
  AIAG MSA (measurement system analysis);
  VDA 6.3 (process audit);
  OEM CSR compliance (customer-specific requirements).
  BD-16..BD-20 apply (PPAP final signoff, FMEA RPN classification,
  IATF NCR disposition, warranty cost, OEM supplier status).
  AI advisories must not commit PPAP signoff autonomously."
```

### 12.3 J3 Aerospace prompts

Add to C6 for J3 domain prompts:

```
"Additional J3 regulatory frame:
  AS9100 Rev D (QMS for aviation/space/defense);
  AS9102 (first article inspection);
  NADCAP (special process accreditation);
  ITAR 22 CFR 120-130 (export control — no AI output
    may suggest an export determination autonomously);
  GIDEP (government-industry data exchange program).
  BD-21..BD-25 apply (NADCAP nonconformance, counterfeit
  suspect, ITAR export determination, AS9100 major NC,
  first article rejection). All J3 prompts must include
  ITAR sensitivity check in the CHECK layer."
```

### 12.4 J4 Med Device prompts

Add to C6 for J4 domain prompts:

```
"Additional J4 regulatory frame:
  EU MDR 2017/745 (medical device regulation);
  EU IVDR 2017/746 (in vitro diagnostic regulation);
  FDA 21 CFR Part 820 (QSR / QMSR);
  FDA AI/ML SaMD Action Plan 2021 + PCCP Draft 2023;
  ISO 13485:2016 (QMS for medical devices);
  ISO 14971:2019 (risk management for medical devices);
  IEC 62304 (software lifecycle for medical devices).
  BD-15 (510(k)/PMA decision) and BD-16 (PPAP) are
  primary banned decisions. Vigilance reportability
  (AI-19) is Tier-2; any advisory must not commit a
  regulatory report autonomously."
```

### 12.5 J5 Food prompts

Add to C6 for J5 domain prompts:

```
"Additional J5 regulatory frame:
  FDA FSMA 2011 (Food Safety Modernization Act);
  FDA 21 CFR Part 117 (HARPC);
  FDA FSMA §204 (food traceability — high-risk food list);
  EU Reg 2073/2005 (microbiological criteria);
  EU EC 852/2004 (food hygiene);
  GFSI benchmarked schemes (BRCGS, SQF, FSSC 22000);
  Codex Alimentarius HACCP (CAC/RCP 1-1969 Rev 4-2003).
  BD-26 (mock recall approval), BD-27 (HACCP CCP critical
  limit violation disposition), BD-28 (FSVP approved supplier
  determination) are the primary banned decisions.
  CCP false-positive is a quality risk; CCP false-negative
  is a food safety risk — AI-09 must prioritize sensitivity
  over specificity in the J5 extension."
```

---

## 13. Failure Modes

```
FM-L5-01  Prompt missing L1 boundary reminder
  Effect: AI output may autonomously route a banned decision.
  Detection: peer review; T15 QA gate audit.
  Mitigation: element-3 check before send; blocked prompts require
    L1 re-check and full re-execution.

FM-L5-02  Forbidden file touched due to missing S5
  Effect: ADR-0004 violation; potential regression in production portal.
  Detection: forbidden-diff guard (git diff | grep forbidden patterns).
  Mitigation: revert output; rewrite prompt with explicit S5; re-execute.

FM-L5-03  Hallucinated regulatory clause
  Effect: governance document contains false standard reference;
    may mislead auditors.
  Detection: T2/T15 regulatory verification pass.
  Mitigation: remove hallucinated clause; replace with grounded citation;
    add K5 escalation condition to source prompt.

FM-L5-04  Missing decision phrase prevents chain progression
  Effect: next prompt cannot verify previous completed; governance
    ledger missing completion record.
  Detection: missing phrase in output.
  Mitigation: re-execute check-only prompt to extract phrase; add
    to ledger with auditor attestation.

FM-L5-05  Scope expansion touches adjacent files
  Effect: unreviewed changes in adjacent systems; potential regression.
  Detection: git diff --name-only compared to S4 allowed list.
  Mitigation: revert unauthorized changes; add explicit S4/S5 to prompt.

FM-L5-06  Batch prompt collapses sequential dependencies
  Effect: L4 written before L3 lifecycle stages are locked; cross-
    references inconsistent.
  Detection: cross-reference consistency check in T15.
  Mitigation: enforce one-prompt-at-a-time discipline; add dependency
    declaration (C7) to each prompt.

FM-L5-07  Production posture language in governance document
  Effect: ADR-0001 violation; document implies production readiness
    prematurely.
  Detection: grep for forbidden vocabulary ("production go-live",
    "production cutover", "production release").
  Mitigation: replace with pre-production vocabulary; add C2 to prompt.

FM-L5-08  Prompt lacks executable verification
  Effect: unverified artifact ships; quality gate failures discovered
    downstream at higher cost.
  Detection: element-6 check in peer review.
  Mitigation: retroactively run verification; document gap; add K1 to
    all future prompts of the same task class.

FM-L5-09  AI agent expands scope based on "best judgment"
  Effect: files modified beyond S4 scope; inconsistent state.
  Detection: git diff compared to allowed list.
  Mitigation: remove AP-6 language from prompts; add explicit K5
    escalation condition.

FM-L5-10  Pack-specific regulatory frame omitted
  Effect: J1-J5 domain output uses generic baseline frame; misses
    pack-specific banned decisions, evidence classes, or cadence.
  Detection: T15 QA gate; regulatory alignment review.
  Mitigation: add pack C6 extension to all prompts touching J-domain
    content; enforce via task-class reading list.
```

---

## 14. RACI

```
RESPONSIBLE:
  Human issuing the prompt — writes all 3 layers, verifies 7 elements
  before sending, runs K1 verification commands.

ACCOUNTABLE:
  AI Lead — approves prompt discipline policy updates in L5;
  reviews T15 QA gate findings related to prompt discipline;
  signs off on AI-assisted artifact governance ledger.

CONSULTED:
  Compliance Lead — reviews C6 regulatory frame accuracy for
  pack-specific prompts; advises on new standard citations.
  QMS Analyst — reviews T9 DCC document prompts for header
  compliance.

INFORMED:
  All HESEM contributors using AI agents — notified of L5
  updates at each V revision; trained on 7-element checklist
  and T1-T15 task class catalog before first AI-agent session.
  External auditors — L5 policy available as evidence of
  AI governance discipline; AI-assisted artifact ledger
  entries reference task class and decision phrase.
```

---

## 15. Decision phrase

```
L5_AI_PROMPT_DISCIPLINE_V10_LOCKED
NEXT: S4-12_L_AI_DISCIPLINE_DEEP_UPGRADE_COMPLETE
      then load S4-13_K_BUSINESS.md
```

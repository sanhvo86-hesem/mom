# 26. WI Archetypes and QA Guide

> Version: v1 | Date: 2026-03-30 | Owner: QMS Engineer

---

## 1. Purpose

This document extends `08-document-types.md` to lock the WI archetype standard.

`08-document-types.md` locks the 7 base WI sections.
This document additionally locks:

- which WI types are allowed to exist;
- which content must stay in the SOP;
- which content must move to an ANNEX;
- the QA checklist that prevents mini-SOPs, mini-ANNEX documents, and WI files that are detached from the field.

Practical outcome targets:

- operators can read it, execute it, and use it at point of use;
- gate performers get an execution checklist instead of re-reading SOP gate architecture;
- dashboard/control-tower users read by operating cadence instead of through long narrative;
- digital documents have a fallback when systems are disrupted.

---

## 2. Foundation Principles

1. A WI should exist only when `without the WI, the performer is likely to do it wrong`.
2. Gate definition, authority matrix, KPI definition, high-level RACI, and system-level hold/release logic stay in the SOP.
3. Machine-family data, lookup tables, acceptance criteria, formulas, and reference maps stay in an ANNEX.
4. A WI may keep only one layer of logic:
   - point-of-use execution;
   - gate execution;
   - control-tower operation;
   - digital-system operation.
5. Every WI must explicitly state:
   - who uses it;
   - where it is used;
   - when it is used;
   - what it must not replace.
6. The published WI header must stay locked at the family level and must not inject archetype, series, or domain wording into the subtitle:
- required subtitle: `T?i li?u v?n h?nh ? C?ng vi?c h??ng d?n`;
   - required meta labels: `M?`, `Phi?n b?n`, `Ng?y hi?u l?c`, `Ch? s? h?u`, `Ph? duy?t`;
   - archetypes such as `POU-WI`, `Gate-Execution WI`, `Control-Tower WI`, `Digital-Operation WI` belong only in core standards, decision logs, and working notes.
7. The WI header must keep document code and document title as two separate runtime fields; the title block shows `doc-name` and `sub-vn`, while the document code stays in the meta row. Portal runtime must not concatenate `WI-xxx` and the title into one plain-text string.

---

## 3. Decision Test

Use the following question chain before creating or rewriting a WI:

1. Does the document give concrete action guidance?
2. Does the user read it at the machine, at the workbench, at a checkpoint, on a dashboard, or at a desktop?
3. Is the content mainly:
   - execution steps;
   - gate logic;
   - matrix/reference content;
   - governance?
4. If the WI were removed, would the SOP alone still prevent error?
5. Is any acceptance criteria, machine matrix, lookup glossary, or role map being stuffed into the WI?

If question 3 or 5 shows wrong-layer content, the document must be `SPLIT`, `RECLASSIFIED`, or `REBUILT`.

---

## 4. Four Allowed WI Archetypes

| Archetype | Used for | Not used for | Correct signal |
|---|---|---|---|
| `POU-WI` | Machine-side, bench-side, clean-bench, packing-area operating instruction | Gate matrix, dashboard governance, formulas, specification tables | Short, visual-first, 1 action per step, evidence visible at point of use |
| `Gate-Execution WI` | Execution checklist for a gate already defined in the SOP | Defining new gates, new system-level RACI, KPI dictionary | Clear trigger, clear evidence, clear stop condition, clear signer |
| `Control-Tower WI` | Daily management, tier meetings, readiness review, dashboard review cadence | Enterprise management-review SOP, KPI dictionary, worked examples | Clear cadence, clear audience, clear data source, clear escalation |
| `Digital-Operation WI` | M365, SharePoint, Epicor, online/offline forms, sync, backup, fallback | Architecture rule-pack, metadata dictionary, authority matrix | Click-by-click, clear permissions, clear fallback, clear SoR/SSOT |

---

## 5. POU-WI

### 5.1 When to use it

- The performer uses it directly at the machine, bench, cleanroom, warehouse, or inspection point.
- Execution error can create defect, escape, FOD, contamination, traceability failure, or release failure.
- The reader needs a cue card, not a long SOP narrative.

### 5.2 When not to use it

- When the document mainly defines a gate or authority.
- When the document is mainly a machine-family lookup table.
- When the document is mainly acceptance criteria or specification content.

### 5.3 Mandatory structure

The WI still keeps the 7 sections from `08-document-types.md`, but Section 5 must follow these rules:

- maximum 12 steps for one main flow;
- one main action per step;
- a short `reason` line for high-risk points;
- PASS/FAIL or evidence cue for each step;
- usable on A4 print and on mobile.

Default copy-paste template for POU-WI:

- `templates/wi-pou-template.html`
- It locks the section wrapper, `step-block`, PASS/FAIL/EVIDENCE cues, and HTML wrapper.
- The published header still stays at the family-level subtitle and must not be renamed to `POU-WI`.
- The template must not be used to bypass archetype choice, user research, or boundary split.

### 5.4 QA checklist

- Is it truly used at point of use?
- Is the layout visual-first?
- Does it exceed 12 steps?
- Has machine matrix, formula, or specification content been pushed into it?
- Does any step combine multiple actions?
- Do sensitive steps clearly state PASS/FAIL or stop points?
- Is there a `Reason` line for steps that carry scrap, escape, safety, or cleanliness risk?

---

## 6. Gate-Execution WI

### 6.1 When to use it

- The SOP already defines the gate, hold point, owner, and minimum evidence.
- The checkpoint user needs an execution checklist and clear open/close criteria.
- Examples: FAI execution, pre-run verification, ship-release handoff, incoming gate execution.

### 6.2 When not to use it

- When the document is creating a new G0-G7 gate matrix.
- When the document is defining system-level KPI or authority.
- When the document is merging QPL matrix, escalation ladder, and worked examples into one file.

### 6.3 Mandatory structure

Sections 4 and 5 must answer these 4 points:

- Trigger: when the WI is opened.
- Evidence: which records are required to pass.
- Stop condition: when it goes to hold.
- Release authority: who signs or who is allowed to close the checkpoint.

Default copy-paste template for Gate-Execution WI:

- `templates/wi-gate-execution-template.html`
- It locks the trigger/evidence table, input criteria, execution steps, stop/release logic, and record-of-decision block.
- The published header still stays at the family-level subtitle and must not be renamed to `Gate-Execution WI`.
- The template must not be used to insert gate architecture, QPL matrix, or system-level authority matrix into the WI body.

### 6.4 QA checklist

- Does it repeat gate architecture that already belongs in the SOP?
- Is any G0-G7 matrix or hold-code dictionary sitting inside the body?
- Are `input criteria` and `execution steps` clearly separated?
- Is the record-of-decision form/workbook Clearly named?
- Does any step try to replace both the SOP and ANNEX at the same time?

---

## 7. Control-Tower WI

### 7.1 When to use it

- The users are workshop manager, shift lead, quality lead, planner, or readiness board.
- The document supports review cadence, data freeze, escalation, daily tier review, or high-risk readiness review.

### 7.2 When not to use it

- When the document is an enterprise-level management review, internal-audit program, or broad CAPA-governance SOP.
- When the document is primarily a KPI dictionary, threshold table, or dashboard example pack.

### 7.3 Mandatory structure

Must include:

- audience;
- cadence;
- data source;
- review inputs;
- escalation path;
- records after review.

Default copy-paste template for Control-Tower WI:

- `templates/wi-control-tower-template.html`
- It locks audience/cadence, review inputs, review flow, escalation, and post-review record sections.
- The published header still stays at the family-level subtitle and must not be renamed to `Control-Tower WI`.
- The template must not be used to turn the WI into a management-review SOP, KPI dictionary, or dashboard example pack.

### 7.4 QA checklist

- Is dashboard logic mixed together with the KPI dictionary?
- Is it clear which report is the source data and which report is the evidence pack?
- Is the cadence explicit by shift / day / week?
- Is it clear who decides and who only updates?

---

## 8. Digital-Operation WI

### 8.1 When to use it

- The user operates in M365, SharePoint, Epicor, portal runtime, backup, or sync workflows.
- The document needs click-path, permission, SoR/SSOT, and offline fallback guidance.

### 8.2 When not to use it

- When the content is file plan, metadata dictionary, site topology, or authority map.
- When the content is an architecture rule-pack.

### 8.3 Mandatory structure

Must include:

- the system/object being operated;
- allowed role;
- action steps;
- expected result;
- offline fallback;
- record/link after the action.

### 8.4 QA checklist

- Is SoR and SSOT explicitly stated?
- Is offline fallback described?
- Does the WI repeat architecture/metadata-dictionary content?
- Does it use the correct JD-linked owner/role chip?

---

## 9. WI - SOP - ANNEX Boundary

| Content | Stays in SOP | Stays in WI | Moves to ANNEX |
|---|---|---|---|
| Gate definition | Yes | No | No |
| Authority / RACI / KPI definition | Yes | No | Dictionary/matrix support only |
| Point-of-use execution step | No | Yes | No |
| Gate execution checklist | No | Yes | Supporting evidence matrix if needed |
| Machine-family matrix | No | No | Yes |
| Formula, sampling table, method note | No | No | Yes |
| Acceptance criteria / specification table | No | Only minimal operator cue when needed | Yes |
| Worked examples | No | Very limited | Yes |

---

## 10. Rewrite Execution Rules

1. Split SOP-shaped content out first.
2. Split ANNEX-shaped content out first.
3. Reduce the WI until it fits the real user and real context.
4. Re-lock the links to the parent SOP, related ANNEX, and execution workbook/FRM.
5. Run archetype QA before release.

---

## 11. Read Together With

- `08-document-types.md`
- `11-html-structure-guide.md`
- `19-role-boundary-jd-linking-and-role-codes.md`
- `21-unicode-and-encoding-governance.md`
- `25-glossary-canonical-abbreviation-standard.md`
- `28-pou-visual-and-machine-side-rules.md`
- `29-wi-annex-research-redraft-method.md`
- `30-wi-annex-translation-role-bundle-rules.md`
- `templates/wi-pou-template.html`
- `templates/wi-gate-execution-template.html`
- `templates/wi-control-tower-template.html`


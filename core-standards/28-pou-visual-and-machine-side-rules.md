# 28. POU Visual and Machine-Side Rules

> Version: v1 | Date: 2026-03-30 | Owner: QMS Engineer

---

## 1. Purpose

This document locks how `POU-WI` documents are presented and written so users can read them directly at point of use:

- beside a CNC machine;
- at a setup bench;
- at an inspection table;
- at a cleaning or packing area;
- in a cleanroom or vacuum area;
- at receiving or warehouse locations.

This is a rule set for execution at point of use, not a rule set for SOPs or ANNEX documents.

---

## 2. Design Principles

1. The reader must immediately see `what to do right now`.
2. Visual hierarchy has priority over long paragraphs.
3. Every step must make PASS/FAIL visible.
4. The content must stay readable when printed and carried into the operating area.
5. The document must not force the user to go back and read an 8-page mini-SOP just to perform one task.

---

## 3. POU-WI Size Limits

- Prefer a maximum of 2 A4 pages for one main flow.
- Maximum 12 steps for one main flow.
- Maximum 2 short lines per step.
- Maximum 25 words per sentence.
- Each step should contain only 1 main action.
- Every high-risk step must include one `Reason` line.

If the document exceeds these limits, you must:

- split it into multiple WIs;
- move matrix/specification content into an ANNEX;
- move gate logic back into the SOP.

---

## 4. Mandatory Layout

### 4.1 Top of page

Must include:

- WI code;
- WI title;
- who uses it;
- when it is used;
- where it is used;
- links to the most important SOP/ANNEX/FRM references.

### 4.2 Step area

Each step should contain 4 elements:

- `Action`;
- `Reason` for sensitive steps;
- `PASS when`;
- `FAIL then`.

### 4.3 Warning area

Use distinct color/callout treatment for:

- `STOP`;
- `HOLD`;
- `CAUTION`;
- `EVIDENCE`.

Do not use one generic note style for every warning type.

### 4.4 Copy-paste template

Default template for POU-WI:

- `templates/wi-pou-template.html`

This template locks:

- section `wi-s1` -> `wi-s7`;
- `step-block`;
- the cues `Reason`, `PASS when`, `FAIL then`, `Evidence`.

The template does not replace:

- archetype selection;
- real user research;
- separation of wrongly layered matrix/spec/governance content.

---

## 5. Images, Diagrams, and Visual Aids

1. High-risk steps should use a photo, sketch, or diagram.
2. Show only the details the operator must actually see:
   - datum;
   - fixture orientation;
   - clamp zone;
   - no-touch zone;
   - label placement;
   - bagging direction;
   - gowning order.
3. Visuals must support in-place decision making, not decoration.

---

## 6. Rules for Point-of-Use Text

1. Start the sentence with an imperative verb.
2. Do not use long, vague paragraphs.
3. Do not use unnecessary half-English phrasing.
4. Units, direction, datum, tool ID, lot, and revision must be easy to see.
5. In cleanroom/vacuum/clean handling contexts, the text must prioritize cues such as:
   - clean / not clean;
   - open / do not open;
   - change gloves / do not touch with bare hands;
   - bag 1 / bag 2;
   - cap / do not cap;
   - dry / not dry.

---

## 7. `What - How - Why` Rule

Following standardized-work benchmarks, a POU-WI should help the reader see:

- `What`: what must be done;
- `How`: how it must be done;
- `Why`: why the step matters.

At HESEM, `Why` must stay very short:

- 1 sentence;
- no more than 12-15 words;
- directly tied to the risk.

Examples:

- `Reason: prevent wrong rev before Cycle Start.`
- `Reason: prevent contamination inside the vacuum chamber.`
- `Reason: preserve lot traceability after cutting into bars.`

---

## 8. Machine-Side STOP/GO Rule

Every sensitive POU-WI must clearly show:

- GO signal;
- STOP/HOLD signal;
- who is allowed to release the hold, if applicable.

Do not write vague phrases such as:

- `report upward`;
- `handle according to regulations`;
- `notify the related department`

unless the specific actor is explicitly named.

---

## 9. Rule Set for Machine-Side WI

### 9.1 CNC / setup / pre-run

Must prioritize:

- program/revision;
- tool/offset/WCS;
- fixture orientation;
- first-piece checkpoint;
- restart checkpoint.

Do not place the following inside a POU-WI:

- full machine-family matrix;
- full QPL matrix;
- full escalation ladder;
- KPI dictionary.

### 9.2 Inspection-side

Must prioritize:

- what to measure;
- method/gage;
- acceptance cue;
- reaction when failed.

Full formulas and sampling tables belong in an ANNEX.

### 9.3 Receiving / storage

Must prioritize:

- receipt document;
- lot/heat traceability cue;
- label cue;
- put-away cue;
- hold cue.

Migration notes, mapping matrices, and source policy belong in ANNEX/SOP documents.

### 9.4 Cleanroom / vacuum / helium

Must prioritize:

- cleanliness precondition;
- glove/gown order;
- no-touch / no-mix / no-reuse cue;
- acceptance cue derived from a released specification;
- evidence after the operation.

The original acceptance criteria must stay in the `Specification Annex` or in drawing/spec/PO sources.
If the acceptance cue references an outside standard, the released source must be explicit, for example a customer CSR or an applicable standard such as SEMI F20 / SEMI S2. Do not invent numeric limits inside a POU-WI.

---

## 10. Print and Field-Use Rules

1. Printed copies must remain readable on black-and-white A4.
2. Do not place important information only in faint colors that are hard to read.
3. Leave enough white space for pen marks when the workflow requires marking.
4. Mobile view must not break the layout.

---

## 11. QA Checklist

1. Can the user at point of use read it within 60-90 seconds?
2. Does each step clearly show PASS/FAIL?
3. Is there a `Reason` for important steps?
4. Has matrix/spec/governance content been pushed into the WI body?
5. Is there a photo/diagram for the easiest-to-miss point?
6. Is the print version usable in the field?

---

## 12. Read Together With

- `26-wi-archetypes-and-qa-guide.md`
- `29-wi-annex-research-redraft-method.md`
- `30-wi-annex-translation-role-bundle-rules.md`
- `templates/wi-pou-template.html`


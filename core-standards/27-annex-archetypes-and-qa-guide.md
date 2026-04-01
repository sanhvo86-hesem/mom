# 27. ANNEX Archetypes and QA Guide

> Version: v1 | Date: 2026-03-30 | Owner: QMS Engineer

---

## 1. Purpose

This document extends `08-document-types.md` to lock the ANNEX archetype standard.

An ANNEX is a flexible reference document, but it must not become a miscellaneous dump.
The purpose is to ensure that:

- an ANNEX is a lookup table, matrix, method, map, specification, or worked example;
- an ANNEX does not turn into SOP narrative;
- an ANNEX does not steal work from a WI;
- each ANNEX keeps one clear logic domain.

---

## 2. Foundation Principles

1. An ANNEX is a `lookup and control support` document, not a storytelling document.
2. An ANNEX must contain at least one structured table, matrix, map, or specification block.
3. An ANNEX must not be used to hide an SOP/WI that has not yet been written.
4. If the reader must follow step-by-step action at point of use, the document is a WI.
5. If the document defines gates, role authority, or system-level process boundaries, the document is a SOP.
6. The published ANNEX header must stay locked at the family level and must not inject archetype, series, or domain wording into the subtitle:
- required subtitle: `T?i li?u v?n h?nh ? Annex`;
   - required meta labels: `M?`, `Phi?n b?n`, `Ng?y hi?u l?c`, `Ch? s? h?u`, `Ph? duy?t`;
   - archetypes such as `Method`, `Rule-Pack`, `Dictionary`, `Specification` belong only in core standards, decision logs, and working notes.
7. The ANNEX header must keep document code and document title as two separate runtime fields; the title block shows `doc-name` and `sub-vn`, while the code stays in the meta row. Portal runtime must not concatenate `ANNEX-xxx` and the title into one plain-text string.

---

## 3. Seven Allowed ANNEX Archetypes

| Archetype | Used for | Preferred format |
|---|---|---|
| `Matrix Annex` | RACI, authority, access, deputy, cross-reference | 2D table |
| `Method Annex` | Sampling, formula, calculation, method logic, reaction method | Table + formula + short example |
| `Rule-Pack Annex` | A domain-specific rule set | Rule list + consequence |
| `Dictionary Annex` | KPI dictionary, data dictionary, term/code table | Lookup table |
| `Map/Topology Annex` | Process map, system topology, org map, route map | Diagram + legend + table |
| `Worked Example Annex` | Example evidence pack, sample case, sample packet | Example pack with explanation |
| `Specification Annex` | Acceptance criteria, material/surface/package/spec limits | Parameter-target-method-source table |

---

## 4. Matrix Annex

### When to use it

- Role x authority.
- Role x gate.
- Department x interface.
- Deputy x absence coverage.

### When not to use it

- When step-by-step action explanation is needed.
- When the document needs long governance narrative.

### QA checklist

- Do rows and columns have clear meaning?
- Is there one clear authority source?
- Does the document need more than 2-3 opening narrative sentences? If yes, the type is probably wrong.

---

## 5. Method Annex

### When to use it

- AQL, MSA, SPC-lite, calculation rule, or decision tree.
- Measurement/classification methods that require formulas, lookup tables, or reaction rules.

Default copy-paste template:

- `templates/annex-method-template.html`
- It locks method logic, formula/table blocks, decision rules, short examples, and the note that sends the reader back to WI/SOP when execution is required.
- The published header still stays at the family-level subtitle and must not be renamed to `Method Annex`.

### When not to use it

- Machine-side or bench-side action steps.
- Pure acceptance target tables with no method logic.

### QA checklist

- Does it contain formulas, lookup tables, sample input/output, or decision rules?
- Is it mixed with an execution checklist?
- Does it tell the reader when to go back to the WI/SOP?

---

## 6. Rule-Pack Annex

### When to use it

- Domains with many dispatch, FIFO, packaging, receiving, FOD, or governance rules.

### Minimum structure

Each rule should include:

- condition;
- action;
- owner or enforcing actor;
- consequence when violated.

Default copy-paste template:

- `templates/annex-rule-pack-template.html`
- It locks `Rule ID`, `Condition`, `Action`, `Owner`, and `Consequence`, and prevents the ANNEX from becoming a step-by-step procedure.
- The published header still stays at the family-level subtitle and must not be renamed to `Rule-Pack Annex`.

### QA checklist

- Is rule numbering clear?
- Are action and result clear?
- Is a step-by-step procedure being dumped into the rule pack?

---

## 7. Dictionary Annex

### When to use it

- KPI dictionary.
- Metadata/data-field list.
- SSCC data dictionary.
- Code mapping.

### QA checklist

- Is the lookup key clear?
- Is every field/code clearly defined?
- Is unnecessary governance narrative being added?

---

## 8. Map/Topology Annex

### When to use it

- Org chart.
- Site/library topology.
- CNC operating model.
- Process map.

### QA checklist

- Is there a diagram, legend, and explanation table?
- Is it clear `what is mapped` and `what is not mapped`?
- Is the ANNEX drifting into handbook-style narrative?

---

## 9. Worked Example Annex

### When to use it

- Example evidence pack.
- Poka-yoke example library.
- Sample shipment packet.

### QA checklist

- Is the content clearly marked as an `example`, not a primary rule?
- Are there criteria that show when the content is illustrative only?

---

## 10. Specification Annex

### When to use it

- Surface finish.
- Vacuum compatibility.
- Packaging class requirements.
- Leak acceptance criteria.
- Cleanliness thresholds.

### Important rules

1. The specification table is where `parameter`, `target`, `tolerance`, `unit`, `method`, and `source` belong.
2. If original values come from a customer spec, drawing, PO, paid standard, or processor certificate, the ANNEX must cite that source and must not invent numbers.
3. A WI may only repeat the minimum cue needed for execution and must not become the master store of acceptance criteria.

Default copy-paste template:

- `templates/annex-specification-template.html`
- It locks the `parameter-target-tolerance-unit-method-source` table and the `source-controlled requirement` note when the original source has not yet been released into the system.
- The published header still stays at the family-level subtitle and must not be renamed to `Specification Annex`.

### QA checklist

- Is there a parameter-target-method-source table?
- Are measurement units and original source visible?
- Has step-by-step method content been pushed into the ANNEX?

---

## 11. Canonical Location and Duplicate Rule

1. Every ANNEX must live in its official `series-folder`.
2. Do not create a duplicate root copy with the same basename.
3. If backward compatibility is required, only a temporary controlled alias is allowed and it must have a removal backlog.
4. Canonical path priority is:
   - path inside the functional subfolder;
   - file with full HTML wrapper;
   - file with valid header/meta;
   - newest QA-approved content.

---

## 12. ANNEX - WI - SOP Boundary

| Content | SOP | WI | ANNEX |
|---|---|---|---|
| Authority / approval control | Yes | No | Matrix support only |
| Execution steps | No | Yes | No |
| Formula / lookup table / spec | No | No | Yes |
| Example packet | No | Limited | Yes |
| Topology / map | Limited | No | Yes |

---

## 13. Pre-Release QA Gate

Before releasing an ANNEX, you must answer:

1. Which archetype is it?
2. Is the table/matrix/spec/map structure already clear?
3. Is any narrative doing the job of a SOP/WI?
4. Is there a duplicate basename or a legacy alias?
5. Does it link to the right SOP/WI/FRM context?
6. Does it have complete HTML wrapper, title/header/meta, and stable anchors?

---

## 14. Read Together With

- `08-document-types.md`
- `11-html-structure-guide.md`
- `26-wi-archetypes-and-qa-guide.md`
- `29-wi-annex-research-redraft-method.md`
- `30-wi-annex-translation-role-bundle-rules.md`
- `templates/annex-method-template.html`
- `templates/annex-rule-pack-template.html`
- `templates/annex-specification-template.html`


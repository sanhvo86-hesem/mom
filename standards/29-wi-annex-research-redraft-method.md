# 29. WI/ANNEX Research and Redraft Method

> Version: v1 | Date: 2026-03-30 | Owner: QMS Engineer

---

## 1. Purpose

This document locks the research and rewrite method for WI and ANNEX documents on a document-by-document basis.

The purpose is to prevent 5 common errors:

- rewriting many WI files from one generic mold without studying the real user;
- pushing SOP logic, matrix content, or specification content into a WI;
- pushing long procedure narrative into an ANNEX;
- guessing acceptance criteria when the true source is a customer specification or paid standard;
- polishing appearance before the document boundary is actually resolved.

---

## 2. Mandatory Principles

1. Every WI and ANNEX must be researched individually.
2. One content mold must not be forced across an entire series.
3. Standardization is only allowed at these layers:
   - header;
   - HTML wrapper;
   - archetype QA;
   - visual rules;
   - role/bundle rules.
4. Header normalization may only affect:
   - title tag;
   - family subtitle;
   - meta labels;
   - `.doc-code` hook for the document code;
   - UTF-8-safe text handling.
5. Do not use header cleanup as an excuse to inject archetype, series, or domain wording into the published subtitle.
6. Operational content must be finalized according to the specific user, risk, and evidence of that document.
7. If acceptance criteria do not come from an official source, do not invent numbers.

---

## 3. Eight-Step Sequence

### Step 1. Read the old document

At minimum, review:

- title;
- section/h2 structure;
- links to SOP/WI/ANNEX/FRM documents;
- any hidden phase residue;
- which parts are doing the job of another SOP/WI/ANNEX.

### Step 2. Identify the real user

You must answer:

- who uses it;
- where it is used;
- when it is used;
- what decision it supports.

### Step 3. Lock the document type

Choose one of the following:

- POU-WI;
- Gate-Execution WI;
- Control-Tower WI;
- Digital-Operation WI;
- or one of the 7 ANNEX archetypes.

If the type is still unclear, pause and resolve the boundary first.

### Step 4. Split out the wrong layer

Push content back to the correct layer:

- gate definition / RACI / KPI definition -> SOP;
- matrix / method / spec / map / worked example -> ANNEX;
- point-of-use execution steps -> WI.

### Step 5. Research outside sources

Use only official sources or primary sources.

Minimum benchmark stack for this repository:

| Domain | Preferred source | Why it is used |
|---|---|---|
| QMS flexibility | ISO 9001:2015 official page | Confirm that ISO requires QMS controls and documented information, but does not force a WI for every activity |
| Standardized work | Public OEM CSR documents from IATF-related sources | Confirm `what-how-why`, operator instruction, and visual-standard logic |
| Acceptance sampling | ISO 2859-1 official page + released internal controlled table | Lock the boundary between AQL method and WI execution, and avoid copying copyrighted tables into ANNEX documents |
| FAI | SAE AS9102 + IAQG official FAQ/forms | Lock the boundary for WI-302 and the form stack |
| Logistic label | GS1 Logistic Label Guideline + GS1 General Specifications + ISO/IEC 15416 official page | Lock SSCC, GS1-128, placement, print-quality logic, and verification method for linear symbols |
| Digital resilience | NIST SP 800-34 Rev.1 | Lock BIA, contingency, recovery priority, and offline fallback logic |
| Media sanitization | NIST SP 800-88 Rev.2 | Lock sanitization program, validation, and storage-media handling |
| Semiconductor safety/cleanliness | SEMI public standard pages, standard notices, customer specs | Lock S2, purity/particle/surface/material context, and prevent guessed acceptance limits |

### Step 6. Lock the acceptance-criteria source

Priority order:

1. drawing / spec / PO / customer note;
2. released customer CSR;
3. official standard / public appendix;
4. approved processor source or internal released specification annex.

If the acceptance number lives in a paid standard that is not publicly available:

- do not guess;
- mark it clearly as `source-controlled requirement`;
- move the master limit into a Specification Annex after the owner provides the source.

### Step 7. Rewrite

For WI:

- write for the actual user who performs the task;
- keep it short, clear, and PASS/FAIL-oriented.

For ANNEX:

- write in table/matrix/spec/map form;
- do not turn it into a long story.

### Step 8. QA and release

Check:

- is the archetype correct;
- is the source correct;
- are role/bundle rules correct;
- is any phase residue still present;
- are there duplicate/alias/fragment HTML issues left.

---

## 4. Benchmark Rules That Must Be Recorded in Working Notes

The editor must keep these items outside the released document body:

- source link;
- lookup date;
- which benchmark factor was used;
- which part is fact;
- which part is internal inference.

Recommended template:

- `templates/wi-annex-research-working-notes-template.md`

Do not place these editorial notes or reasoning traces inside the released WI/ANNEX body.

---

## 5. Rule for Inference From Benchmarks

Inference is allowed only when:

- the source confirms the operating direction;
- the HESEM context requires a tighter internal target;
- the inference is explicitly labeled in the working notes.

Inference is not allowed for:

- acceptance numbers;
- mandatory fields from standards or paper forms;
- barcode symbology;
- sanitization/disposal claims;
- customer-specific release rules.

---

## 6. Practical Rule for Semiconductor/Vacuum Work

1. Cleanroom/vacuum WI documents have high priority when the business target is semiconductor/vacuum work.
2. Method and task execution stay in the WI.
3. Surface/leak/cleanliness acceptance criteria stay in a Specification Annex.
4. Do not hardcode leak/surface/particle numbers unless the source has already been released into the system.

---

## 7. Completion Checklist

1. Have you read the old document?
2. Have you locked the real user?
3. Have you locked the archetype?
4. Have you split out wrong-layer content?
5. Have you used official external sources?
6. Have you confirmed the acceptance-criteria source?
7. Have you run HTML/archetype/phase-residue QA?

---

## 8. Read Together With

- `13-sop-research-redraft-method.md`
- `26-wi-archetypes-and-qa-guide.md`
- `27-annex-archetypes-and-qa-guide.md`
- `28-pou-visual-and-machine-side-rules.md`
- `30-wi-annex-translation-role-bundle-rules.md`
- `templates/wi-annex-research-working-notes-template.md`


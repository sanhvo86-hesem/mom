# 13. Research method and rewrite SOP according to each document

> Version: v1 | Date: 2026-03-27 | Owner: QMS Engineer

---

## 1. Purpose

This document locks down the required method when updating any SOP in the HESEM QMS system.

The purpose is to prevent this type of mechanical update:
- force all SOPs to the same control port number,
- force all SOPs to the same number of detailed steps,
- rewrite Section 6 and Section 7 in an iterative format that is not based on the actual operating scope of that SOP,
- write headers, roles, inputs/outputs and exceptions according to the same content template for all SOPs,
- Mixing half English and half Vietnamese makes the operating terminology lose its standard.

---

## 2. Mandatory principle

1. Each SOP must be studied separately.
2. Do not use one step model or gate model for the entire set of SOPs.
3. The number of control gates and detailed steps must be determined by the scope of operations, number of handovers, number of HOLD/RELEASE points, risks and evidence to be kept.
4. Flowchart of Section 7 must match absolutely with the number of detailed step headings in the same Section 7.
5. Section 6 and Section 7 are two different classes:
   - Section 6 answers: where to keep it, who opens the gate, what conditions must be followed before moving on.
- Section 7 answers: in what order does real work take place?
6. Section 6 can only be rewritten after clearly defining the control architecture of that SOP.
7. Section 7 can only be rewritten after the actual work flow of that SOP has been finalized.
8. Don't reuse step numbers or IG numbers just because they "look good", "even", or "easy to mass produce".
9. Standardizing graphics, palettes, HTML structures, tables and checklists at a core-standard level is allowed; But upgrading SOP content must be done document by document.
10. Do not bulk upgrade many SOPs at the same time if the changed content touches the operational logic; Batch only with technical, graphic, CSS, linking, markup or structural hygiene errors.
11. Before editing the role, leader, authority, RACI or owner cell of the SOP, you must compare `JD thật -> role registry -> benchmark chính thức bên ngoài` and then finalize the mapping.
12. Labels such as `Process Owner`, `Department Head`, `Responsible Person`, `Data Owner`, `Lead Auditor`, `Incident Commander` should not be retained if they are acting as real authority; Must resolve to base role, governance hat or explicit role bundle.

---

## 3. Required research sequence for each SOP

### Step 1. Read old documents

Must read at least:
- SOP range,
- Section 3 terminology,
- Section 4 roles,
- Section 5 input/output,
- Old Section 6,
- Old Section 7,
- Section 8 exceptions,
- Section 9 data/records.

Purpose:
- retain correct operating logic,
- recognize mechanically compressed parts or missing handover points,
- avoid new writing cut out of the HESEM context.

### Step 2. Research external official sources

Must use official or original sources:
- official documents of the regulatory authority,
- public standards of technical organizations,
- official documentation of industrial ERP/MES/QMS systems,
- Technical handbook or official statistics.

Do not rely on:
- blog marketing has no process value,
- general article without original source,
- Deductive content without supporting documents.

### Step 2C. Finalize role boundaries before writing Section 4 / 6 / 8

Before editing any owner/authority cell, answer:
- who keeps the data;
- who decides;
- who release;
- who only execute;
- who has the right to stop;
- Is that role a real JD position or just a governance hat?

If the role does not have a real JD but is still repeated in multiple SOPs:
1. decide whether it is a new hat or base role;
2. update JD/registry first;
3. then update the SOP.

### Step 2A. Finalize KPI benchmarks before writing Section 6

Before finalizing the KPI of each IG, you must answer:
- which official external benchmark is used as a reference,
- what thresholds are standard/customer/legal hard requirements,
- which threshold is the tighter internal design target for the HESEM risk level,
- What data in the system can actually measure that KPI?

If there is no direct benchmark for the right situation, you must:
1. Use the most recent benchmark with administrative value,
2. clearly state that this is **internal target inferred from benchmark + risk level**,
3. Avoid writing generic KPIs without numbers.

### Step 2B. Keep the benchmark rationale outside the body of the SOP

After finalizing the benchmark, you must clearly state in the working note, script profile or editing profile:
- which benchmark source is used,
- which number is the reference benchmark,
- Which number is the internal target inferred according to risk,
- reason for tightening or loosening compared to benchmark.

Do not include these notes in the SOP body as editorial notes.

### Step 3. Finalize the control architecture

Before writing Section 6, you must answer:
- how many real HOLD/RELEASE points are there,
- who has the right to open each gate,
- which port is the pre-boot condition,
- which port is the condition before handover,
- which port is the pre-release condition,
- Which KPI measures the effectiveness of each port?
- Which KPI has a benchmark or design threshold capacity of operating, not just enough form?

### Step 4. Finalize the actual work sequence

Before writing Section 7, you must answer:
- which roles change where,
- which systems or records change where,
- Where to change machine/tool/program/fixture/material/gage,
- which points need revalidation,
- Which point creates suspect range,
- Which points are required to be handed over?

### Step 5. Rewrite Section 6 and Section 7

Only after completing the above four steps can it be rewritten.

### Step 5A. Retract Sections 1, 2, 3, 4, 5, 8 from Section 6 and Section 7

After locking the gate and real flow:

- rewrite `Section 1` from risk blocked, decision held and output locked,
- rewrite `Section 2` from start/end boundary and real handoff,
- rewrite `Section 3` from terms that actually appear in gate/step,
- rewrite `Section 4` from gate owner and role with block/unhold permission,
- rewrite `Section 5` from the state before the first step and after the last step,
- rewrite `Section 8` from the actual hold, restart, revalidation, waiver, partial release or change path points.

Do not extrapolate these sections from the old template if the old template no longer matches the finalized operational logic.

---

## 4. Section 6 and Section 7 replacement rules

### 4.1 Section 6

- Delete all content between `p6` and `p7`.
- Do not delete heading `p6` by mistake.
- Do not delete heading `p7` by mistake.
- Section 6 must use IG table.
- Each IG must have:
  - port name,
  - description of control objectives,
  - preside,
  - mandatory stops,
  - KPI or minimum evidence.
- Each IG's KPI must have a numerical threshold or SLA, a standard data source and a reaction trigger.
- KPI must be read according to real operating logic, for example: `100% ... trước ...`, `<= 24 giờ`, `= 0 escape`, `>= 99%`.

### 4.2 Section 7

- Delete all content between `p7` and `p8`.
- Do not delete heading `p7` by mistake.
- Do not delete heading `p8` by mistake.
- Section 7 must be completely rewritten if the old flow or step no longer reflects the actual operation.
- The number of flowchart steps must be equal to the number of detailed step headings.
- Must not have the following conditions:
  - 7 step flowchart but 10 detailed steps,
  - 5-step flowchart but detailed description of 8 steps,
  - flowchart is just an abridged version that does not match the execution content.
- With automatically generated SOPs, it is necessary to check that the bubble flowchart has the correct color palette according to the step index, not just the correct quantity.

---

## 5A. Hygiene rules for pre-release drafts

- Documents that have not been officially released for the first time always keep `V0`.
- Do not write in the SOP body sentences like `bổ sung theo note`, `liên kết note`, `khác bản trước`, `điểm mới`, `quy tắc dùng thuật ngữ`.
- If you need to save editing traces, use DCR, review log, script output or commit log.
- Do not retain benchmark notes, AI reasoning or editorial comments in the operational document body.

---

## 5. Rules for writing terminology

### 5.1 Term name column

The term name column in Section 3 must be written in the following form:

`English term (thuật ngữ tiếng Việt chuẩn)`

For example:
- `Traceability (truy xuất nguồn gốc)`
- `First Article Inspection - FAI (kiểm tra mẫu đầu tiên)`
- `Process Capability (năng lực quá trình)`
- `Lockout/Tagout - LOTO (khóa và gắn thẻ năng lượng)`

### 5.2 Usage in document content

After being defined in Section 3:
- In the document body, priority is given to using the Vietnamese version,
- don't write half English and half Vietnamese,
- keep abbreviations only when they are truly common operating standards and do not obscure the meaning.

Correct example:
- `truy xuất nguồn gốc`
- `kiểm tra mẫu đầu tiên`
- `năng lực quá trình`
- `khóa và gắn thẻ năng lượng`

Incorrect example:
- `trace`
- `first-piece release` if the document has selected the Vietnamese version as `mở sản lượng sau chi tiết đầu tiên`
- `mixed source kiểm soát`
- `job close tài chính`

---

## 6. Signs that SOP has been mechanically updated

An SOP is considered mechanically updated when there are two or more signs:
- Mass repeating IG numbers not due to real range,
- the number of detailed steps to repeat in series is not due to the actual range,
- many SOPs use the same set of descriptive sentences only replacing nouns,
- Section 6 only changes the port name but the owner/hold/KPI does not change its nature,
- Section 7 has no role changes, status changes or handovers but still divides steps equally,
- Terminology mixed between English and Vietnamese lacks standardization,
- the content does not explain why that gate must be kept or why that step must be separated.

---

## 7. Checklist for approval before considering complete

An SOP is only considered updated when it answers all of the following:

1. Have you read the old documents yet?
2. Have you used official outside sources?
3. Have you finalized the IG number according to the actual SOP?
4. Have you finalized the number of steps according to the actual SOP?
5. Do the flowchart and detailed steps match exactly?
6. Does Section 6 have owners, holds and measurable KPIs?
7. Does Section 7 demonstrate sufficient handover, revalidation, restart or containment?
8. Has Section 3 used the form `English (Việt)`?
9. Is the content of the document itself prioritized in standard Vietnamese?
10. Have you replaced the correct parts `p6→p7` and `p7→p8` without deleting the next section by mistake?
11. Have you cleaned the editorial notes and "compared to previous version" traces from the body?
12. With automatically generated SOP, have you checked flowchart color bubbles and numeric KPIs with script?

---

## 8. Applicable regulations

This document applies to:
- write new SOP every time,
- every time you rewrite Section 1, 2, 3, 4, 5, 6, 7 or 8,
- all scripts automatically change sections of the SOP,
- any batch normalization project in `core-standard`.

If any script or template conflicts with this document, this document takes precedence.

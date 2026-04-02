# 17. SOP Sections 1, 2, 3, 4, 5, 8 Alignment Guide

> Version: v1 | Date: 2026-03-27 | Owner: QMS Engineer

---

## 1. Purpose

This document locks the spelling of `Section 1, 2, 3, 4, 5, 8` to these parts:

- not written as a decorative introduction,
- do not separate the control logic latched at `Section 6`,
- does not separate the execution sequence locked at `Section 7`,
- do not repeat the term half-English, half-Vietnamese,
- do not create roles, inputs, or exceptions that do not exist in real operations.

If `Section 6` and `Section 7` are:
- `control architecture`,
- `operating sequence`,

then `Section 1, 2, 3, 4, 5, 8` is:
- `operating frame`,
- `authority boundary`,
- `activation / exception logic`

is deduced from those two parts.

---

## 2. Principle of immutability

1. Do not write `Section 1, 2, 3, 4, 5, 8` before you have finalized the actual logic of `Section 6` and `Section 7`.
2. Do not use a common set of descriptive sentences and then replace nouns in bulk between SOPs.
3. Each section must correctly answer a separate, non-overlapping operational question.
4. Any role, trigger, data, hold point or exception stated in `Section 1, 2, 3, 4, 5, 8` must be traceable back to the actual gate or step.
5. When the document has not been released for the first time, the entire body still retains `V0`, without editorial notes, notes different from the previous version or benchmark notes.
6. Standardizing formats and graphics can be done at core-standard level; Upgrading the content of `Section 1, 2, 3, 4, 5, 8` must be done according to each SOP, not in mechanical batches.

---

## 3. Dependency map between sections

| Section | Questions must be answered | Where to infer from? |
|---|---|---|
| 1. Purpose | What risks does this process exist to block, what outputs to generate, what decisions to protect? | `focus`, last gate, last step, failure mode blocked |
| 2. Scope | Where does the process start, where does it end, and what SOP is handed over? | first step, last step, trigger, handoff, related SOP |
| 3. Terminology | What operational concepts are readers required to understand correctly? | The term actually appears in gate/step |
| 4. Role | Who keeps the gate, who does it, who has the right to block it, who has the right to reopen it? | owner in IG + handover role in step |
| 5. Input/output | What is needed to start, what is created when finished, what conditions enable or disable progress? | before IG1/B1, after last IG/last B, trigger restart/change |
| 8. Exceptions | When should I stop, redo, revalidate, waive or escalate? | hold point, restart point, change point, release exception |

---

## 4. Detailed rules by section

### 4.1 Section 1 — Purpose

Section 1 must be written after answering:

- Which gate is protecting the most important decision,
- What is the biggest error this SOP is blocking,
- Which output of this SOP determines whether the downstream can proceed or not.

Section 1 should have:

- A very short opening sentence, describing the actual operating mechanism of the SOP,
- 3 to 5 bullets,
- Each bullet states one of the following axes:
  - prevent any risks,
  - Which decision key?
  - Which output is guaranteed?
  - Which downstream to connect to?

Section 1 cannot:

- just says “set up the process” without saying what the process is used to block,
- Copy the entire gate title into the bullet,
- Use empty sentences like `nhằm nâng cao`, `góp phần bảo đảm`, `tăng cường phối hợp`.

Required Checklist:

- mention a real risk or bug that is being blocked,
- mention actual output or release state,
- When reading, you must immediately understand how this SOP is different from neighboring SOPs.

### 4.2 Section 2 — Scope

Section 2 must adhere to:

- The actual operating starting point is the first step,
- actual operational end point at the last step,
- handoffs to other SOPs,
- re-entry or restart conditions if SOP has them.

`Có bao phủ` must answer:

- What type of job, data type, activity type or event type does the SOP apply to?
- Which activities are within the scope from the first step to the last step,
- Are changeover, restart, transfer, partial release, waiver or similar situations within scope?

`Không thay thế / không được vượt quyền` must answer:

- Which neighboring SOP is holding the upstream or downstream part,
- which decision this SOP is not allowed to legitimize itself,
- Which boundary must be pushed to another SOP?

Section 2 cannot:

- listing irrelevant material just to fill the section,
- Use “not replace” as a decorative link list,
- omit re-entry scope if Section 7 has restart, transfer, revalidation or change path.

### 4.3 Section 3 — Terminology & principles

Keep only the terms absolutely necessary for the correct reading of `Section 6` and `Section 7`.

Required rules:

- usually just use `3–6` line,
- The term name column must follow the form `English term (thuật ngữ tiếng Việt chuẩn)`,
- Definitions must describe usage in this SOP, not general dictionary definitions.
- After definition, in the SOP body, priority is given to using the finalized Vietnamese version.

Impossible:

- Copy the entire system glossary into one SOP,
- create terms that do not appear in gate/step,
- Write `mixed source kiểm soát`, `job close tài chính`, `control plan tại point-of-use` if there is a standard Vietnamese version,
- Repeat brackets like `Epicor Kinetic (Epicor) (Epicor)`.

Required Checklist:

- Each term appears or is a premise to understand gate/step,
- no jargon lines just to explain how to write the document,
- The SOP body does not repeat English for the same concept.

### 4.4 Section 4 — Roles, authorities & RACI

Section 4 must adhere to the actual authority of the SOP.

Must cover at least:

- All owners are holding IG in `Section 6`,
- all roles received or handed over at key steps in `Section 7`,
- The role has permissions `HOLD`, `RELEASE`, `REVALIDATE`, `ESCALATE`, `APPROVE EXCEPTION`.

Two formats are allowed:

1. 3-column table `Vai trò | Trách nhiệm chính | Quyền / điểm chặn`
2. RACI matrix when the SOP has many inter-departmental interfaces and the matrix helps to see authority more clearly

If using RACI matrix, there must still be a column or description showing:

- Who has the right to block?
- Who has the right to remove the hold?
- Who can only be consulted, not released.

Section 4 cannot:

- has a "ghost" role that does not appear at gate/step,
- Use a general authority sentence like `chịu trách nhiệm chung`,
- remove the role of real decision-making authority in `Section 6`.

### 4.5 Section 5 — Inputs, outputs & prerequisites

Section 5 is a summary of `điều kiện mở quy trình` and `điều kiện hoàn tất`.

Must infer from:

- `IG1` and `B1`,
- final gate and final step,
- Trigger state change, restart, change, escalation in the process.

Writing rules:

- `Đầu vào bắt buộc`: data, records, resources or decisions that must be present before the initial step is allowed to run,
- `Đầu ra bắt buộc`: output generated when SOP is completed or when the last gate is closed,
- `Điều kiện tiên quyết`: readiness condition before starting,
- The fourth cell is used to describe `Trigger`, `Điều kiện kích hoạt`, or `Điều kiện không cho phép chuyển bước` depending on the nature of the SOP, but must be directly tied to the actual control logic.

Impossible:

- list ambiguous input/output of type `theo yêu cầu`, `tài liệu liên quan`, `hồ sơ cần thiết`,
- record the output does not appear at the last gate or last step,
- Use the generic trigger `khi cần`,
- Ignore trigger restart, transfer, waiver, complaint, change or incident if the SOP has a corresponding flow.

### 4.6 Section 8 — Exceptions, changes & redo

Section 8 must be derived from the actual `HOLD / RESTART / REVALIDATE / EXCEPTION` points.

Standard format:

- 5 column table:
  - `Tình huống`
  - `Quy tắc xử lý bắt buộc`
  - `Chủ trì`
  - `Người gỡ hold / phê duyệt tiếp`
- `Hồ sơ`

Replacement of tables with bullet lists is only allowed when all 4 conditions are met at the same time:

- SOP is narrow governance, few exception branches and not transaction/shop-floor flow.
- The number of actual situations is small, stable and does not exceed the level that needs to be monitored with a table.
- There are no multiple owners or multiple takedowns that vary from situation to situation.
- Bullet presentation does not take away the ability to audit decisions, escalations, and records.

Scenario sources must come from:

- missing or incorrect input,
- changes after release,
- restart after hold or crash,
- transfer between human/machine/cell,
- partial release / urgent request / waiver,
- system down / evidence conflict / data mismatch,
- specific situation of that SOP.

Section 8 cannot:

- Use decorative scenarios that do not come from the real flow,
- Write a label with a wrong meaning or bad translation like `ngắt / nghỉ-kính / thủy tinh admin`,
- just write a general action without saying who removed the hold,
- Skip the record that needs to be saved for the exception.

---

## 5. Signs the section is written in the wrong direction

Section 1 is in the wrong direction when:

- After reading it, I still don't know what risks the SOP is preventing.
- Any bullet can be used for other SOPs.

Section 2 is in the wrong direction when:

- don't see the start/end boundary,
- `Không thay thế` is just a list of links unrelated to the actual handoff.

Section 3 is in the wrong direction when:

- the term does not appear in the flow,
- The SOP itself is in English, different from the finalized Vietnamese version.

Section 4 is in the wrong direction when:

- owner holding gate is not in the role table,
- The person with blocking authority is not specified.

Section 5 is in the wrong direction when:

- input/output cannot be mapped to flow,
- trigger does not say why the SOP started or why it had to be reopened.

Section 8 is in the wrong direction when:

- The exception does not reach the actual hold/restart/release,
- does not indicate who decides and who removes the hold.

---

## 6. Checklist QA before considering it as passed

- [ ] Section 1 correctly says the risk is blocked and the output needs to be blocked.
- [ ] Section 2 starts and ends exactly according to the first/last step.
- [ ] Section 2 correctly states the neighbor SOP at the real boundary.
- [ ] Section 3 only keeps the terminology actually used in gate/step.
- [ ] Term names follow the form `English (Việt)`.
- [ ] The SOP body prioritizes the use of Vietnamese language as finalized in Section 3.
- [ ] Every gate owner in Section 6 appears in Section 4.
- [ ] The permission to block/remove hold in Section 4 follows the logic of Section 6.
- [ ] Section 5 correctly reflects input before IG1/B1 and output after last gate/last B.
- [ ] Section 5 does not have a generic "when needed" or "on request" box.
- [ ] Section 8 covers all real hold/restart/change/waiver scenarios.
- [ ] Section 8 clearly states the chairperson, the person removing the hold, and the records.
- [ ] If Section 8 does not use a 5-column table, there is a clear reason according to narrow governance rules and does not lose the decision trace.
- [ ] No more half-English, half-Vietnamese jargon, broken translation labels or editorial traces.

---

## 7. Relationship with other core-standard documents

- Read together with `07-content-writing-guide.md` to learn the tone and rules for using terminology.
- Read along with `12-sop-section-6-7-guide.md` to pin down the correct control architecture and flow.
- Read together with `13-sop-research-redraft-method.md` to follow the correct research order before writing.
- Read along with `16-sop-graphics-kpi-and-redraft-quality.md` to lock in KPIs, draft hygiene, and technical QA.

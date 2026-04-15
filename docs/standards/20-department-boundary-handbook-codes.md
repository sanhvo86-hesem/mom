# 20. Department Boundary, Handbook Codes and Coverage Gaps

> Version: v3 | Date: 2026-03-28 | Owner: QMS Engineer

---

## 1. Purpose

This document is a mandatory standard for the entire system when it comes to:
- departments;
- Stable subsystem in departments;
- function-level ownership;
- interdepartmental handoff;
- scope of work gaps not covered by JD or handbook.

The purpose is to prevent 7 system errors:
- Using JD for a responsibility is actually a mandate for the entire department;
- using a department name to obscure a decision that should be traced back to an individual with authority;
- use generic phrases such as `Department`, `bộ phận liên quan`, `các phòng chức năng`, `các phòng liên quan`, `line manager`, `line owner`, `bộ phận chuyên môn`, `all functions`, `team lead/supervisor` without indicating the actual range;
- mixing `department`, `subfunction` and `role` in the same RACI/owner cell causes misunderstanding of authority;
- Let departments lack actual scope of work but not record it as a gap;
- create departmental handbooks such as SOP summaries, without clarifying boundaries and handover points;
- mass update mechanics without reading the documentation context, JD and real operating model.

---

## 2. The three entity classes must be separate

### 2.1 Role code

`Role code` is the actual JD-linked role whose individual holds the role, for example:
- `CS`, `EST`
- `ENGM`, `DFM`, `PE`, `CAM`
- `PPL`, `WKM`, `SL`, `SET`, `OPR`, `MNT`, `CPS`, `DBL`
- `QA`, `QMS`, `QE`, `QCL`, `QC`, `MCS`
- `SCM`, `BUY`, `WAR`, `TOOL`, `LOG`
- `FIN`, `APAR`, `GLP`
- `HR`, `EHS`, `ITA`, `ESA`

Only use `role code` when the document needs:
- indicate the decision maker;
- HOLD/RELEASE rights holder;
- approver;
- owner personal KPI;
- specific handover recipient;
- The person responsible for an exception, escalation or sign-off.

### 2.2 Department code

`Department code` has the form `D-XXX`, which is a stable department or subsystem level mandate, for example:
- `D-SCS`, `D-ENG`, `D-PROD`, `D-QUAL`, `D-SCM`, `D-FIN`, `D-HR`, `D-EHS`, `D-IT`
- `D-PPC`, `D-MNT`, `D-PUR`, `D-WHS`, `D-TCR`, `D-LOG`, `D-ERP`

Only use `department code` when the document is talking about:
- scope of collective responsibility of the entire department;
- handoff line between two functions;
- The place where inter-departmental requests arise or are received;
- owner of department handbook;
- The owner grants the function of a data or operating rhythm but has not yet reached a personal decision;
- a stable subsystem organized repeatedly, with clear inputs/outputs and boundaries.

### 2.3 Governance bundle

`Governance bundle` is an explicit group of many code roles defined in `19-role-boundary-jd-linking-and-role-codes.md`.

Bundle is only used when the actual responsibility is an actor class that shares multiple roles. Bundle cannot replace both `department code` and `role code`.

---

## 3. Rules for choosing the right class

### 3.1 Use role code when

- there is a clear individual or line of authority that must sign or make the decision;
- cell is talking about `phê duyệt`, `giữ`, `nhả`, `xác nhận`, `ủy quyền`, `disposition`, `sign-off`;
- KPIs have individual owners;
- The action plan, escalation or containment needs to be traced to the person ultimately responsible.

### 3.2 Use department code when

- The cell is describing the department-level interface;
- the document is indicating the entity that must be involved or must provide input;
- It is a departmental handbook or a table describing functional boundaries;
- A task is a shared responsibility of the entire department, not a decision to sign off;
- Stable subsystems need to be seen independently of JD, for example `D-PPC`, `D-MNT`, `D-WHS`, `D-LOG`, `D-ERP`.

### 3.3 Do not use department code to replace role code

- refers to exception approval;
- make an accept/reject decision;
- open/close gate or release shipment;
- sign-off change control;
- Specify the handler owner in the exception table;
- Designate individual Deputy/back-up.

### 3.4 Do not use role code to replace department code

- The document describes the mandate of the entire department;
- refers to interdepartmental meeting rhythms or required input from a function;
- refers to `department handbook owner`;
- describes a stable subsystem in which many JDs participate but the functional boundaries must appear independently.

### 3.5 Placeholder must be resolved before writing

In a departmental handbook, organizational matrix, ANNEX summary or SOP with a functional interface box, the following phrases are considered placeholders and MUST be resolved before release:
- `các phòng liên quan`, `các phòng chức năng`, `bộ phận chuyên môn`
- `line manager`, `line owner`, `department head`, `trưởng bộ phận`
- `support`, `operations`, `all functions` if D-code list or role code is not specified

Rule resolve:
- If the sentence is talking about mandate/functional transfer, change to `D-code` specifically;
- If the sentence is talking about sign-off/authorization/final decision, change to `role code` specifically;
- If it cannot be resolved because the system lacks scope or lacks a decision-maker, classify it as a gap according to Section 5 instead of keeping a placeholder.

---

## 4. Standard Department code for CNC job-order model

### 4.1 Departments

- `D-SCS` — Sales and Customer Service Department
- `D-ENG` — Engineering Department
- `D-PROD` — Production Department
- `D-QUAL` — Quality Department
- `D-SCM` — Supply Chain Department
- `D-FIN` — Finance Department
- `D-HR` — Human Resources Department
- `D-EHS` — EHS Department
- `D-IT` — IT Department

### 4.2 Subfunctions

- `D-PPC` — Production Planning and Control Function
- `D-MNT` — Maintenance Function
- `D-PUR` — Purchasing Function
- `D-WHS` — Warehouse Function
- `D-TCR` — Tool Crib Function
- `D-LOG` — Logistics and Shipping Function
- `D-ERP` — ERP Administration Function

### 4.3 Data-content vs platform ownership in job-order CNC

In the metrics / KPI / ERP / M365, you must take note of:
- `D-IT` = IT infrastructure, endpoint, network, backup, access lifecycle.
- `D-ERP` = ERP, workflow, transaction integrity, BAQ/reporting governance.
- `D-MNT` = functional level repeatable maintenance scope in `D-PROD`: PM, breakdown response, machine health evidence, readiness and restart support; does not automatically mean a separate maintenance management JD.
- The `D-code` functions such as `D-SCS`, `D-ENG`, `D-PROD`, `D-QUAL`, `D-SCM`, `D-FIN`, `D-HR`, `D-EHS` = address the business content, transaction rules and data usage rules within the scope of the document.

Loan:
- If the question is talking about `noi dung du lieu nghiep vu`, use `D-code` to represent the function or role in `FUNC_OWNERS` / `OPS_SCOPE_OWNERS`;
- If the request is talking about `nen tang he thong`, use `D-IT` / `D-ERP` or role `ITA` / `ESA`;
- Do not write code of type `IT chu du lieu`, `bo phan lien quan`, `system owner`, `data owner`.

Only create new `D-` code when all 4 conditions are met:
- stable repeat work;
- have clear input/output and handover points;
- scope should not be confused with a single JD;
- There is a need for repeated use in handbooks/SOPs/ANNEX/RACI.

---

## 5. Coverage Gap must be locked

When reading a document that actual work exists but is not clearly covered by any:
- role codes,
- department code,
- subfunction code,
- or current handbook,

then the person editing the document MUST stop and classify the gap in one of 3 types:

1. `Department gap`
2. `Subfunction gap`
3. `JD gap`

### 5.1 How to handle each type of gap

- `Department gap`: update department handbooks, dictionaries and, if necessary, the registry.
- `Subfunction gap`: create new `D-` code, update registry, handbook, dictionary and related system documents.
- `JD gap`: not covered by `department code` or a generic cluster; Must update or create JD, then update registry, handbook and associated documents.

### 5.2 Record gaps in the handbook

Every department handbook must have a separate callout or paragraph stating:
- which spaces are temporarily locked in the current version;
- who is holding temporary authority;
- Which conditions will force the creation of JD or separation of separate subsystems?

Valid example:
- `Hiện chưa có JD Commercial Manager; các cam kết vượt khung giá/chính sách do CEO giữ. Nếu tần suất ngoại lệ tăng hoặc xuất hiện khách chiến lược phải mở JD riêng.`
- `EHS hiện do EHS Specialist dẫn dắt; dừng công việc không an toàn là quyền hiện trường, nhưng quyết định đóng mở diện rộng vẫn phải escalated lên CEO/PD.`

### 5.3 Mandatory update sequence when a gap is detected

Once `Department gap`, `Subfunction gap` or `JD gap` has been determined, the document editor MUST update according to the following sequence:
1. edit handbook or source JD first;
2. update `tools/data/role-registry-job-order-cnc.json` if `D-code` is added or the published boundary is changed;
3. Update workbook `tools/data/qms-terminology-dictionary.xlsx`, minimum 2 sheets:
   - `Phong ban`
   - `Department code & handbook link`
4. Update related system documents such as organizational matrix, ANNEX, SOP with interface/owner box to reuse that boundary;
5. Only then can editing of the downstream document be considered complete.

### 5.4 Rule about division according to department vs. JD

If a person is talking about:
- function mandate, interface, queue, handoff, ownership department cap: use `D-code`;
- faction, hold/release, sign-off, deputy, escalation decision: use `role code`;
- The actor class repeats the movie: use `bundle`.

Do not keep text anymore than buying type:
- `Engineering`, `Sales`, `Planning`, `Warehouse`, `Purchasing`, `Operations`;
- `truong bo phan`, `line manager`, `supervisor`, `team lead`;
- `phong lien quan`, `cac phong chuc nang`, `bo phan chuyen mon`.

If you need to gather a group of `D-code` to extract:
- must create `department bundle` or `mixed bundle` table in the registry;
- Must have bundle name, component, content scope and package must not be damaged at `02-Tai-Lieu-He-Thong/03-Organization/04-RACI-Authority/role-and-department-bundles.html`;
- Text of type `Support`, `Operations`, `all functions`, `back office`, `site support` cannot be placed in actor cell, owner cell, audience cell, matrix row or org summary.

When a new security element appears in the SOP/WI/ANNEX/JD body, the editor must investigate the risk it is talking about:
1. one department/subfunction;
2. a role that has JD;
3. or a non-business concept.

If it is (1), move to `D-code`.
If it is (2), move to `role code`.
If it is (3), writing again in Vietnamese still has the meaning, do not repeat the hybrid sentence again.

---

## 6. Content standards for Department Handbook

The department handbook is not a summary of SOPs. It must answer 6 questions:

1. What risks does this department exist to lock in and what outputs do it produce?
2. Which scopes belong to this department and which do not?
3. What code roles and subfunctions are there in the department?
4. Where is the inter-departmental handover point located?
5. Are there any gaps that are temporarily locked?
6. When there is an incident, who holds the action at the department level and who holds the decision at the individual level?

A minimum department handbook must have:
- title and header with `department code`;
- `ISO/operating intent` 2-4 lines;
- list of role codes belonging to the department;
- if so then list `subfunction code` in scope;
- departmental goals;
- scope includes/does not exceed authority;
- mandatory liability;
- functional-level authority;
- output/record;
- KPIs have real combat value;
- inter-departmental interface;
- related documents;
- operating models and role boundaries;
- operating cadence/data/evidence;
- capacity/deputy;
- risks and escalations;
- coverage gap callout if any.

In addition to the above list, the handbook MUST clearly show:
- Which task is the mandate of the entire department;
- Which tasks are kept only at the role code level;
- boundary with adjacent upstream/downstream handbook in CNC job-order model;
- The system is temporarily assigning certain tasks because there is no JD or the subfunction has not been separated.

---

## 7. Graphics and formatting rules for handbooks

- Header owner uses `department code` chip, does not use long sentences.
- Approver must still be a valid `role code` or bundle; Do not use `department code`.
- Roles in the same room are displayed as `role chip` with a JD link.
- The subsystem displayed by `department chip` has the corresponding handbook link.
- In the interface table:
  - The “receive from / deliver to” column can use `department code` if we are talking about functional interfaces;
  - The decision or escalation owner column must use `role code`.
- In the output/KPI/data table:
  - The functional-level owner column uses `department code` if we are talking about department-level ownership;
  - column decision/sign-off/escalation uses `role code`;
  - Do not include `department code` in the column that is defined as a personal decision.
- Do not use half-English, half-Vietnamese text like `Customer Dịch vụ`, `Quy trình Owner`, `all functions`, `Department Head`.
- Do not put placeholders like `các phòng liên quan`, `các phòng chức năng`, `line manager`, `line owner`, `bộ phận chuyên môn` in the release handbook.
- Do not include editorial notes, migration notes, or "this version replaces the previous version" notes in the handbook.
- Handbook links in the index, TOC, preface, notes, legend or reference list MUST display the `D-code` canonical of the target handbook.
- Subfunction codes like `D-PPC`, `D-MNT`, `D-WHS`, `D-LOG`, `D-PUR`, `D-TCR`, `D-ERP` are only visible in owner/RACI/interface when the context is actually a subfunction.
- Do not use `D-PPC` as the label for the department-summary link to the production handbook, and do not use `D-LOG` as the label for the supply-chain handbook summary.
- `ALL_DEPTS` when used as an enterprise scope bundle MUST include all `department code` and `subfunction code` published in the current registry; Do not omit published subfunctions such as `D-PPC`, `D-MNT`, `D-PUR`, `D-WHS`, `D-TCR`, `D-LOG`, `D-ERP`.

---

## 8. Forced update method

When editing handbooks or documents related to department boundaries, the required order is:

1. read current handbook, adjacent upstream/downstream handbook, related JD, SOP/WI/ANNEX where boundary is being used;
2. compare with the CNC job-order model and international benchmarks to determine the actual boundaries of the function;
3. clearly determine which is `role`, which is `department`, which is `subfunction`, which is `gap`;
4. Finalize separate content for each document, each department, do not make mechanical corrections at the same time;
5. update handbook/JD source;
6. Update dictionary and registry workbooks if scope has changed;
7. Review the organizational matrix, SOPs and associated ANNEX before updating the downstream HTML.

Additional logic benchmarks:
- Must compare with the actual `job-order CNC` model: `Sales / Customer Service`, `Engineering`, `Production`, `Quality`, `Supply Chain`, `IT / ERP`, `Finance`, `HR`, `EHS`.
- If the document develops a stable repetition range that is not covered by the current handbook/JD, the gap must be marked and the handbook/JD updated before changing the chip in SOP/ANNEX.

Impossible:
- mass search/replace department names to abbreviations without reading the context;
- Use the same bullet/authority/KPI set for every handbook;
- “patching words” on a misstructured handbook instead of closing the role boundary first;
- use machine translation or hybrid English/Vietnamese phrases in release documents;
- Edit SOP/RACI before editing handbook/source JD;
- adding a new `D-code` just to compact the table if the job is still the responsibility of a single JD.

---

## 9. QA Checklist before release

- Is `department code` the correct department/subfunction type?
- Has the decision role been traced back to JD?
- Is the functional level interface box using role code in the wrong place?
- Does the handbook clearly state what areas are not within the department's responsibility?
- Does the handbook clearly state the existing coverage gap?
- Does the KPI have an owner, numeric threshold, and source data?
- Does every chip department link to the correct handbook?
- Is the handbook link showing the correct `D-code` canonical of the target handbook?
- Does the subfunction chip appear in the correct subfunction context, not disguised as a department summary?
- Are all chip roles linked to the correct JD?
- Are workbooks `Phong ban` and `Department code & handbook link` synced?
- Has the associated matrix/ANNEX/SOP been updated according to the new boundary?
- Are there any remaining clusters `Department`, `Process Owner`, `Customer Dịch vụ`, `all functions`, `team lead/supervisor`, `các phòng liên quan`, `các phòng chức năng`, `line manager`, `line owner` or hybrid letters?

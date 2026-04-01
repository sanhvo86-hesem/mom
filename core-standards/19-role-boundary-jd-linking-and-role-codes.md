# 19. Role Boundary, JD Linking, and Role Codes

> Version: v4 | Date: 2026-03-28 | Owner: QMS Engineer

---

## 1. Purpose

This document locks the mandatory standard for the whole QMS system whenever we define:

- job titles;
- owning roles;
- authority;
- RACI actors;
- KPI owners;
- data owners;
- hold/release authority;
- actors in exceptions and escalation.

The purpose is to prevent 6 system-level errors:

- using floating titles that do not match a real JD;
- using ambiguous placeholders such as `Process Owner`, `Department Head`, `Data Owner`, `QA/QMS`;
- assigning authority to a role that does not actually exist in the JD library;
- mechanically replacing actors with an overly broad role phrase that does not fit the SOP context;
- writing long prose role descriptions in headers/RACI cells so readers cannot recognize who truly holds authority;
- leaving vague role residue in enterprise-level documents for the `job-order CNC` operating model.

This document locks standards for `role code`, `governance hat`, and `bundle` actors.
Rules for `department code`, `subfunction code`, and `coverage gap` are locked separately in `20-department-boundary-handbook-codes.md`.

---

## 2. Source of Truth

Role truth is organized in 3 layers, in order of priority:

1. `02-Tai-Lieu-He-Thong/03-Organization/03-Job-Descriptions/`
2. `tools/data/role-registry-job-order-cnc.json`
3. `tools/data/qms-terminology-dictionary.xlsx`

If the 3 layers conflict:

- the actual JD is the first source used to confirm whether a role truly exists;
- the role registry is the canonical display source for HTML, headers, RACI, and JD links;
- the workbook is reference glossary data and must not override the JD or registry.

No new SOP/WI/ANNEX/JD may be released if the role in that document has not been resolved into one of the 3 layers above.

### 2.1 Mandatory external benchmarking when a JD is edited

When editing a JD for the `job-order CNC` model, the editor MUST benchmark external references before closing the boundary:

- production-leadership and factory-capability roles;
- engineering / process / routing / prove-out roles;
- buyer / supply / warehouse / shipping roles;
- customer service / estimator roles in the `RFQ -> work order -> ship` chain;
- QMS / QA / inspection governance roles.

External benchmarks may be used only to:

- test whether the internal boundary is missing a real work layer;
- confirm whether a role is individual authority or only a function-level mandate;
- strengthen the JD with practical responsibilities when older documents are too thin.

Minimum role-family benchmark layers:

- industrial production manager / workshop manager layer;
- first-line supervisor / frontline lead layer;
- industrial / manufacturing / process engineer layer;
- quality manager / quality engineer / inspector lead layer;
- customer service / estimator / order administration layer;
- IT infrastructure admin versus ERP / application admin layer.

Do not copy external benchmark language verbatim into a JD. Final boundaries must still be locked according to the HESEM organization, department handbooks, and the published role registry.

---

## 3. Role Model for Job-Order CNC

HESEM operates under a `job-order CNC` model:

- high-mix, low-to-medium volume;
- many handoffs across commercial, engineering, planning, workshop, QC, logistics, and finance;
- HOLD authority is broader than RELEASE authority;
- every gate moves forward only when evidence is sufficient.

Because of that, role boundaries must stay separate for:

- commercial ownership and customer communication;
- quoting and commercial commitment;
- engineering feasibility and release;
- process / routing / setup standard ownership;
- shop scheduling and dispatch;
- workshop execution;
- frontline leadership at point of use;
- QC / QA / QMS governance;
- supply chain, warehouse, and shipping;
- finance close-out;
- HR / EHS / IT support.

These boundaries must not be collapsed simply because older documents once wrote them as a combined cluster.

---

## 4. Allowed Role Layers

### 4.1 Base roles

A base role is a position that has a real JD. Examples include:

- `CEO`, `PD`
- `CS`, `EST`
- `ENGM`, `DFM`, `PE`, `CAM`
- `PPL`, `WKM`, `SL`, `SET`, `OPR`, `MNT`, `CPS`, `DBL`
- `QA`, `QMS`, `QE`, `QCL`, `QC`, `MCS`
- `SCM`, `BUY`, `WAR`, `TOOL`, `LOG`
- `FIN`, `APAR`, `GLP`
- `HR`, `EHS`, `ITA`, `ESA`

A new base role is allowed only when:

- it has its own JD;
- it has a clear reporting line;
- it has a stable responsibility boundary;
- it must be reused across multiple documents.

### 4.2 Governance hats

A governance hat is not an independent position. It is a governance capability attached to a real host role.

Current standard hats:

- `QA[QMR]`
- `QMS[DC]`
- `QMS[LA]`
- `PIE[CI]`
- `QA[PSO]`
- `CEO[IC-BIZ]`
- `PD[IC-PROD]`
- `EHS[IC-EHS]`
- `ITA[IC-IT]`
- `ESA[IC-IT]`

Rules:

- do not write bare tokens such as `QMR`, `Lead Auditor`, `Document Controller`, `CI Lead`, `Incident Commander`;
- the hat must always stay attached to the real host role;
- if the host role changes, the JD, registry, and related documents must all be updated.

### 4.3 Role bundles

A role bundle is not a new JD. It is an explicit group of multiple real base roles, used only when the responsibility truly belongs to a stable actor layer but still needs to trace back to the original JD of each member.

Every published bundle MUST exist in 4 places:

- source registry: `tools/data/role-registry-job-order-cnc.json`
- published glossary page: `02-Tai-Lieu-He-Thong/03-Organization/04-RACI-Authority/role-and-department-bundles.html`
- renderable bundle links/chips in HTML
- workbook sheet `Bundle glossary` in `tools/data/qms-terminology-dictionary.xlsx`

Current standard bundles:

- `TOP_MGMT`
- `FUNC_HEADS`
- `FUNC_OWNERS`
- `DATA_OWNERS`
- `SYSTEM_OWNERS`
- `SUPPORT_ENABLEMENT`
- `COMMERCIAL_FRONT`
- `QUALITY_CORE`
- `ENG_RELEASE_CORE`
- `AREA_LEADS`
- `POU_LEADS`
- `OPS_SCOPE_OWNERS`
- `FRONTLINE_LEADS`
- `DEPLOYMENT_LEADS`
- `DIRECT_LINE_MGRS`
- `OJT_COACHES`
- `KNOWLEDGE_SMES`
- `MR_REPORT_OWNERS`

Mandatory meanings:

- `FUNC_HEADS` = `PD / ENGM / QA[QMR] / SCM / FIN / HR / EHS / ITA`
- `FUNC_OWNERS` = `CS / EST / PD / ENGM / QA[QMR] / SCM / FIN / HR / EHS / ITA`
- `DATA_OWNERS` = `CS / EST / PD / ENGM / QA[QMR] / SCM / FIN / HR / EHS / ITA`
- `SYSTEM_OWNERS` = `ITA / ESA`
- `ALL_DEPTS` = `D-SCS / D-ENG / D-PROD / D-PPC / D-MNT / D-QUAL / D-SCM / D-PUR / D-WHS / D-TCR / D-LOG / D-FIN / D-HR / D-EHS / D-IT / D-ERP`
- `SUPPORT_ENABLEMENT` = `SCM / D-FIN / D-HR / D-EHS / D-IT / D-ERP`
- `AREA_LEADS` = `SL / WKM / CPS / QCL`
- `POU_LEADS` = `WKM / SL / QCL / SCM`
- `OPS_SCOPE_OWNERS` = `CS / EST / PPL / PD / ENGM / QA[QMR] / QMS / SCM / FIN / HR / EHS / ITA / WKM / SL / QCL / LOG`
- `FRONTLINE_LEADS` = `WKM / SL / DBL / CPS / QCL`
- `DEPLOYMENT_LEADS` = `WKM / SL / DBL / CPS / QCL / HR`
- `DIRECT_LINE_MGRS` = `CEO / PD / ENGM / QA[QMR] / SCM / FIN / HR / EHS / ITA / WKM / SL / DBL / CPS / QCL`
- `OJT_COACHES` = `ENGM / PE / QE / MCS / WKM / SL / SET / QCL / MNT / TOOL / ESA`
- `KNOWLEDGE_SMES` = `DFM / CAM / PE / QE / MCS / WKM / SET / QCL / MNT / TOOL / ESA`
- `MR_REPORT_OWNERS` = `CS / EST / PD / ENGM / QA[QMR] / QMS / SCM / FIN / HR / EHS / ITA`

Bundle rules:

- do not create a bundle to hide accountability;
- use a bundle only when the responsibility truly belongs to a shared actor layer, not to one single JD;
- if the SOP applies to a narrow scope, use an explicit subset or specific base roles instead of a broad bundle;
- any standalone bundle token in HTML MUST render as a chip/link to the bundle glossary, not as plain text that forces the reader to guess;
- in actor cells and owner cells, a bundle should normally appear as one compact chip with glossary link; do not expand all members directly in the cell unless the document itself is a glossary, dictionary, or component-breakdown table;
- if a new department cluster or JD cluster is needed, add the bundle to registry + glossary + workbook before it enters a released document.

### 4.4 Mandatory boundary for digital and frontline role systems

When editing a JD using the `job-order CNC` benchmark, keep these boundaries explicit:

- `ITA` = base IT infrastructure, endpoints, account lifecycle, backup, network, and user support; it does NOT own business-content decisions.
- `ESA` = ERP configuration, workflow, transaction integrity, BAQ/reporting governance, SoD, rollback/UAT; it does NOT replace `FUNC_OWNERS` for business-content approval.
- `SL` and `QCL` = frontline leads at the point of use; they may direct and confirm within delegated scope, but they do not become miniature department heads.
- `PPL`, `WKM`, `ENGM`, `QA`, `SCM`, `FIN`, `HR`, `EHS` = operating-level roles that hold function/gate/sign-off boundaries and must not dissolve into vague labels such as `manager`, `owner`, or `lead`.

For digital / KPI / authority documents:

- `MR_REPORT_OWNERS` = the group that closes and submits KPI/MR packs.
- `DATA_OWNERS` = the group/function that owns the business content of data.
- `SYSTEM_OWNERS` = the group that owns the technical system layer, access, refresh logic, backup, workflow, and technical traceability.
- `FUNC_OWNERS` or `OPS_SCOPE_OWNERS` = the group/function that owns broad operating scope and cross-functional content when the document is talking about more than pure business-data ownership.

Do not merge these three layers into vague phrases such as `data owner`, `business owner`, `system owner`, or `process owner`.

If a new stable actor group is needed for released documents:

- it MUST be published as an official `bundle` in the registry;
- it MUST have a published glossary page and workbook entry;
- it MUST render as a linked chip;
- it MUST NOT remain as plain text that requires reader interpretation.

---

## 5. Forbidden Placeholders

The following must not appear as standalone actors in headers, owner cells, RACI cells, hold/release cells, approver cells, or KPI-owner cells:

- `Process Owner`
- `Department Head`
- `Department head`
- `Functional Head`
- `Lead Department`
- `Responsible Person`
- `Document Owner`
- `Data Owner`
- `Data Owners`
- `IT Data Owner`
- `KPI owner`
- `QA/QMS`
- `QMS/QA`
- `QMS Manager`
- `IT Manager`
- `Sales Manager`
- `Engineering Manager`
- `Production Supervisor`
- `IQC Team Leader`
- `QC Operator`
- `HR Lead`
- `Team Leader`
- `Supervisor`
- `Business Owner`
- `System Owner`
- `Top Management`
- `Approval Board`
- `Change Owner`
- `Commercial Responsible Person`

If one of those concepts is needed, it must resolve into one of only 3 forms:

1. a specific base role;
2. a governance hat attached to a base role;
3. an explicit published role bundle rendered as linked role chips.

Correct examples:

- `QA[QMR]`
- `QMS[DC]`
- `CS / EST / PPL`
- `CS / EST / PD / ENGM / QA[QMR] / SCM / FIN / HR / EHS / ITA`
- `WKM / SL / DBL / CPS / QCL`

Incorrect examples:

- `Process Owner`
- `Department Head + QA`
- `Commercial Responsible Person`
- `Top Management`
- `QA/QMS`
- `Team Leader / Supervisor`
- `QMS Manager / IT Data Owner`
- `Business Owner + System Owner`

Pseudo-roles such as `QMS Manager`, `IT Manager`, `Sales Manager`, `Engineering Manager`, `Production Supervisor`, `IQC Team Leader`, `QC Operator`, `Business Owner`, `System Owner`, and `KPI owner` may remain only if they are promoted into a real JD and the registry is updated. Otherwise they must resolve back to a published role code, governance hat, bundle, or D-code.

### 5.1 Rule for resolving `department head` and other vague roles

When older documents say `department head`, `supervisor`, `team leader`, `process owner`, or `data owner`, the editor must not mechanically replace them with one default bundle for the whole system. The editor must first answer:

1. Is this a business-function owner or a frontline owner?
2. Is this an authority owner, a data-governance owner, or an operating executive?
3. Is the scope enterprise-level, function-level, or cell/shift/point-of-use-level?

Mandatory contextual mapping:

- commercial function owner -> `CS / EST`
- enterprise functional owner -> `FUNC_OWNERS`
- point-of-use / deployment / visual-control owner -> `POU_LEADS`
- cross-functional operational-scope owner -> `OPS_SCOPE_OWNERS`
- line-management accountability for competence and assignment -> `DIRECT_LINE_MGRS`
- OJT / coaching / execution confirmation -> `OJT_COACHES`
- technical SME / knowledge-gate owner -> `KNOWLEDGE_SMES`

If the role is still unclear after reading the SOP and JD:

- examine the gate, KPI, exception, record-owner, and escalation context;
- compare against the real job-order CNC route;
- if the assignment is truly stable and recurring, update registry + core standard + JD before inserting it into the SOP.

Do not leave vague residue such as:

- `department head`
- `related department head`
- `process owner`
- `KPI owner`
- `trainer / mentor`
- `supervisor`

If temporary helper language is needed in narrative prose, it may describe `the designated coach`, but it must not enter owner cells, approver cells, or headers unless that actor has a real JD.

---

## 6. Display Rules

### 6.1 Header

Use short role codes in headers, not long textual titles.

Correct examples:

- `Owner: QMS[DC] + QA[QMR]`
- `Owner: CS / EST / PPL`
- `Approved by: CEO`

Header role codes must:

- render as compact chips;
- link directly to the corresponding JD;
- use correct relative paths;
- never stay as plain text when a JD already exists.

Additional JD-alignment rule:

- when a department role boundary changes under the `job-order CNC` model, the JD must be updated before SOP/WI/ANNEX documents;
- `Job title shown in the document` in the JD keeps the English title; `Role code used in SOP/RACI` is the place that uses role chips;
- the JD preface must not duplicate handbook/reference links repeatedly.

If a header is expressing function-level mandate or cross-functional governance rather than one individual owner, `D-code` is allowed according to `20-department-boundary-handbook-codes.md`. Do not force every header into role code when the document has no single personal owner.

### 6.2 Section 4 / 6 / 8 / RACI / owner columns

In authority tables, gates, hold/release logic, and exceptions:

- prefer role-code chips;
- render multiple chips when multiple roles are required;
- avoid long prose when chips can represent the actor clearly.

If the cell is describing department mandate or a stable subfunction, do NOT force it into role code. Use `department code` according to `20-department-boundary-handbook-codes.md`.

### 6.3 Narrative prose

In the body of a document:

- operational terms follow the `English term (standard Vietnamese term)` rule from Section 3;
- JD titles may use the standard English title when the sentence needs the full role name;
- do not write half-English / half-Vietnamese phrases such as `QA Lead`, `Customer Service`, `Production Engineer-IE`.

### 6.4 Role placeholders in prose and column labels

In prose, notes, column labels, and explanations:

- do not leave raw placeholders such as `Responsible Person`, `Top Management`, or `Supervisor`;
- rewrite them as standard operational Vietnamese, or resolve them into role code / role bundle when they truly indicate the owner;
- do not present `QA/QMS`, `Department Head`, `Lead Department`, `Data Owner`, or `Process Owner` as if they were real actors unless the exact role is explicitly resolved.

Examples:

- `Responsible Person` -> `responsible person` or `lead role`
- `Top Management` -> `Leadership team` or `TOP_MGMT`
- `Supervisor` -> `frontline management level` or explicit frontline roles such as `WKM / SL / DBL / CPS / QCL`

---

## 7. HESEM-Specific Rules for Commercial and Frontline Contexts

### 7.1 Do not use generic `Department Head` for commercial ownership

HESEM currently does not have a separate `Sales Manager` JD. Therefore:

- if an enterprise-level document needs the commercial owner, write `CS / EST` explicitly;
- if the document needs the final commercial approval line, write `CEO`;
- do not use generic labels such as `Sales Head`, `Department Head`, or `Lead Department`.

### 7.2 Do not use generic `Supervisor` for frontline authority

If the intended meaning is direct management at the point of use in the `job-order CNC` factory, it must resolve to the real roles:

- `WKM`
- `SL`
- `DBL`
- `CPS`
- `QCL`

Do not leave bare `Supervisor` or `Team Leader` in SOP/WI/ANNEX documents when the document is assigning real authority.

---

## 8. Rule for `Process Owner` and `Data Owner`

`Process Owner` and `Data Owner` are two of the most error-prone phrases. From now on:

- do not mass-replace them with one default bundle;
- resolve them according to the logic of the specific SOP.

You must answer these 4 questions clearly:

- who truly owns the process or report;
- who owns the source data;
- who has authority to act;
- who has authority to stop / review / release.

If those 4 answers are still unclear, no mechanical resolution is allowed.

---

## 9. JD Rules

Every JD must contain:

- a short JD code aligned to the role code, for example `JD-QA`, `JD-CS`, `JD-PPL`;
- standard English title;
- standard Vietnamese subtitle;
- row `Role code used in SOP/RACI`;
- when applicable, row `Applicable governance hats`.

JD header metadata must use Vietnamese labels:

- `Code`
- `Version`
- `Effective date`
- `Owner`
- `Approved by`

Where role chips are allowed inside a JD:

- header owner/approver;
- row `Role code used in SOP/RACI`;
- row `Applicable governance hats`;
- authority/RACI/right tables when present.

Where chips must not be auto-inserted:

- `Job title shown in the document`
- the English title itself
- the Vietnamese subtitle itself
- narrative descriptions where the title is used as semantic prose, not as an authority cell.

If a SOP introduces a recurring role that still has no JD:

- do not patch it with a vague text label;
- decide whether it is a new base role or a governance hat;
- if it is a new base role, create/update the JD before releasing the SOP;
- if it is a hat, update the host-role JD so the hat authority, scope, and limit are explicit.

### 9.1 JD header and department ownership

- `Owner` in a JD must use the `D-code` of the department/subfunction that owns the role according to the role-boundary profile.
- `Owner` must not fall back to administrative residue such as `D-HR` when the role actually belongs to `D-EXEC`, `D-ENG`, `D-PROD`, `D-QUAL`, `D-SCM`, `D-FIN`, `D-EHS`, `D-IT`, or another function.
- `Approved by` in a JD must use the role chip of the actor with source approval authority; the current default is `CEO` unless a clearly published exception exists.
- JD header metadata is governance metadata that identifies department mandate ownership and role approval authority. It must not stay as plain text, vague alias, or long written department name.

### 9.2 Distinguish role chips and department chips in a JD

- role chips are used for `Approved by`, `Role code used in SOP/RACI`, `Applicable governance hats`, and authority/RACI/right tables;
- department chips are used for header `Owner`, row `Department`, and the preface block when the document is talking about function-level ownership of the role;
- do not use role chips to hide the department owner of the JD;
- do not use department chips instead of the individual role that holds approval, sign-off, or personal decision authority.

---

## 10. Role-Research Method Before Editing a Document

When an unclear role or alias is found:

1. Read the existing JD and older documents to understand how the role is currently interpreted.
2. Compare it against official external benchmarks in the correct `job-order CNC` context.
3. Lock the boundary for:
   - data ownership,
   - decision ownership,
   - release ownership,
   - execution-only work,
   - stop authority.
4. Decide whether the actor is:
   - a base role,
   - a governance hat,
   - a role bundle,
   - or only a forbidden placeholder.
5. If the document is using placeholders such as `Process Owner`, `Data Owner`, `Department Head`, `Lead Department`, `QA/QMS`, rewrite it to the actual role for that SOP; do not mass-replace it with a broad bundle just to finish the task.
6. If a truly recurring responsibility branch is discovered but no JD exists yet, decide clearly whether it is:
   - a new base role, or
   - a hat/duty attached to an existing base role.
   Do not keep the placeholder because it will distort factory authority.
7. Update the registry / JD / core standard before updating the SOP.

This order must not be reversed.


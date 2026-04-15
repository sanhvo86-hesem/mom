# 22. JD Header and Department-Code Governance

> Version: v4 | Date: 2026-03-28 | Owner: QMS Engineer

---

## 1. Purpose

This document locks 3 areas that are frequently handled incorrectly when updating JDs and related documents:

- the JD header field `Owner`;
- the way `D-code` is used in SOP/WI/ANNEX/handbook documents;
- the rule for deciding where a `role code` must appear versus where a `department code` must appear.

This document must be used together with:

- `19-role-boundary-jd-linking-and-role-codes.md`
- `20-department-boundary-handbook-codes.md`
- `templates/jd-template.html`

---

## 2. Mandatory Rule for JD Headers

- JD header `Owner` MUST use the `D-code` of the department or subfunction that owns the role according to the role-boundary profile.
- JD header `Owner` MUST NOT fall back to `D-HR` merely because the JD passes through an HR process.
- JD header `Approved by` MUST use the role chip of the actor who holds source approval authority; the current default is `CEO` unless a published exception has already been declared.
- JD headers MUST NOT stay as plain text, long written department names, or unresolved vague aliases.
- This rule also applies to secondary headers / sub-headers that use `fh-kv`, `meta row`, `hero meta`, `academy header`, or `training module header`; do not fix one metadata row while forgetting the parallel header block in the same document.

Correct examples:

- `Owner: D-ENG`
- `Owner: D-QUAL`
- `Owner: D-PROD / D-PPC` when the role belongs to both the department and stable subfunction layers
- `Approved by: CEO`

Incorrect examples:

- `Owner: D-HR` for `JD-ENGM`
- `Owner: Engineering Department`
- `Approved by: Leadership team`
- `Owner: related department`

---

## 3. Mandatory Rule for the JD `Department` Row and Preface

- The `Department` row in a JD MUST render as a `D-code` chip linked to the handbook.
- The JD preface block MUST displays the `D-code` and the `Role in the value stream` fields.
- If the role belongs to a stable subfunction such as `D-PPC`, `D-WHS`, `D-TCR`, `D-LOG`, or `D-ERP`, the `Department` row may display one or more `D-code` chips as long as they match the source profile.

---

## 4. Choosing the Correct Layer in Owner Cells

### 4.1 Use `role code` when the cell is about

- approval;
- sign-off;
- hold / release;
- final decision;
- escalation decision;
- named individual accountability;
- personal deputy/back-up assignment.

### 4.2 Use `D-code` when the cell is about

- function-level ownership;
- function mandate;
- department participation;
- function-level record ownership;
- cross-functional interface;
- a stable recurring subfunction.

### 4.3 Do not resolve mechanically

Do not mass-replace a department name with `D-code` when the sentence is actually talking about a person.
Do not mass-replace a person/title with `D-code` when the cell is assigning approval or release authority.

Pseudo-roles such as `QMS Manager`, `IT Manager`, `Sales Manager`, `Engineering Manager`, `Production Supervisor`, `IQC Team Leader`, `QC Operator`, `Data Owner`, `IT Data Owner`, `KPI owner`, `Business Owner`, and `System Owner` must not be inserted directly into headers or owner cells. They must resolve into:

- `role code` when the meaning is personal authority;
- `D-code` when the meaning is function-level mandate;
- a published `bundle` when the meaning is an explicit shared actor layer.

If a vague phrase such as `Supervisor`, `Lead`, `Manager`, `Owner`, `Sender`, `Estimator`, `Coordinator`, or `KPI owner` appears but the identity is still unclear, the editor MUST return to the 3 source-of-truth layers and determine:

1. whether a real individual JD already exists;
2. if not, whether the phrase actually means department mandate or a recurring actor group;
3. if it is still recurring personal authority with real approval/hold/release/escalation effect, the JD/registry must be updated first before downstream documents are edited.

Do not pretend the task is finished by replacing one vague phrase with another. For example, the following are not valid resolutions:

- `Production Supervisor` -> `Team Leader`
- `Department Head` -> `department head`
- `KPI owner` -> `KPI owner`

Only these outcomes are valid:

- `role code`
- `D-code`
- published `bundle`

Cross-functional bundles are allowed only when the bundle has already been published in the source registry. Current approved cases include:

- `DEPLOYMENT_STEERING` = deployment steering board for digital-QMS rollout
- `ALL_DEPTS` = the full published department-code and subfunction-code set when the document is talking about `all functions` at the function layer, not about a specific person
- `FUNC_HEADS` = published function-head role cluster
- `DIRECT_LINE_MGRS` = published direct-line-management actor layer
- `TOP_MGMT` = published executive/leadership cluster for management-review and dashboard contexts
- `MR_REPORT_OWNERS` = published actor group that closes and submits MR report packs
- `DATA_OWNERS` = published business-data ownership group
- `SYSTEM_OWNERS` = published system-ownership group

Every such bundle MUST:

- have a published glossary page at `02-Tai-Lieu-He-Thong/03-Organization/04-RACI-Authority/role-and-department-bundles.html`;
- render as glossary-linked chips in released documents, not as bare tokens such as `FRONTLINE_LEADS`, `OPS_SCOPE_OWNERS`, `MR_REPORT_OWNERS`, or `FUNC_HEADS`;
- appear as compact linked chips in actor cells, owner cells, approver cells, audience cells, and matrix rows; expand bundle members only in glossary/dictionary/explanation tables where the reader really needs component detail;
- be registered in registry + glossary + workbook before any mix of multiple `D-code`, multiple `role code`, or mixed role+department actor groups is used in SOP/WI/ANNEX/JD/Academy documents.

Mandatory canonical mapping examples:

- `IT/Data`, `IT/Digital`, `IT/BI` -> `SYSTEM_OWNERS` when the document is truly talking about shared system ownership; if the actor is specific, resolve back to `ITA`, `ESA`, `D-IT`, or `D-ERP`
- `dashboard owner`, `KPI owner`, `MR pack owner` -> `MR_REPORT_OWNERS` when the actor is the shared KPI/MR pack owner cluster
- `authorized approver`, `functional approver`, `functional heads` -> `FUNC_HEADS` when the meaning is function-level approval layer; if the actual signer is known, resolve back to explicit role code
- `commercial team`, `sales front`, `customer-commercial interface` -> `COMMERCIAL_FRONT` when the document means the stable commercial actor layer; if the exact role is known, resolve to `CS`, `EST`
- `Purchasing` in an actor cell -> `BUY` when assigning personal execution; `D-PUR` when assigning department mandate; never leave plain-text `Purchasing`

When a bundle appears:

- on the first appearance in every document, it MUST render as a linked bundle chip;
- if the bundle sits inside an SVG/process map/shape where linking is impossible, prefer explicit `role code` or `D-code` instead of leaving a bare bundle token.

Enterprise-level WI/ANNEX reference documents may use `D-code` in the header owner field when the document is locking system-level or department-level governance. Execution WI, gate WI, and frontline reaction documents should prefer `role code` when the owner is a specific operating actor.
Authority matrices, deputy matrices, dashboard audience tables, authority summary pages, org summary pages, freeze-pack tables, and other aggregated ANNEX pages MUST obey the same layer-selection rule. There is no exception just because the document is a reference page rather than a SOP/WI.

---

## 5. Mandatory Rule for Handbook Links and Display Labels

- If a link in the body, index, TOC, note, handbook summary, or preface points to a department handbook, the display label MUST use the canonical handbook `D-code`.
- A handbook link to `dept-production-handbook.html` MUST display `D-PROD`, not `D-PPC`.
- A handbook link to `dept-supply-chain-handbook.html` MUST display `D-SCM`, not `D-PUR`, `D-WHS`, `D-TCR`, or `D-LOG`.
- The only exception is when the document is explicitly describing a published subfunction in an owner/RACI/interface cell and that subfunction is already defined in `20-department-boundary-handbook-codes.md`; in that case chips such as `D-PPC`, `D-MNT`, `D-WHS`, `D-LOG`, `D-PUR`, `D-TCR`, `D-ERP` may be shown even if the underlying link still goes to the parent handbook.
- Do not let the label say `subfunction` when the real context is a department summary. That misleads readers about scope and authority.

---

## 6. Mandatory Rule for JD Content

- `Job title shown in the document` in a JD MUST keep the plain English title and must not be replaced with a role chip.
- `Role code used in SOP/RACI` MUST be a JD-linked role chip.
- `Department` in the JD structure row MUST be a `D-code` chip based on the role-boundary profile.
- Every JD reference in body text, notes, OJT indexes, roadmaps, gate tests, matrices, or annexes MUST use one of only two valid forms:
  - `JD-XXX` where `XXX` is an actual canonical JD code from the JD library; or
  - a role chip / role cluster that links to the real JD file.
- Do not create hybrid textual-JD labels such as `JD-Operator / production family`, `JD-Setup Technician / Shift leadership`, `JD-CAM/NC Programmer`, `JD-QA Manager / QMS Engineer / Quality Engineer`, `JD-Buyer / supply chain family`, `JD-Warehouse / logistics family`.
- If a role family needs to be named, list the explicit role chips such as `OPR`, `SET / SL`, `CAM`, `QE / QMS / QA`, `BUY / SCM`, `WAR / LOG`; do not invent a new family label and attach the prefix `JD-` to it.
- The JD preface `Related documents` section must be de-duplicated. Do not repeat the same handbook/link more than once.
- Header, preface, and structure rows in a JD must stay layer-consistent: title = English title, owner = D-code, approver = role code.
- The opening sentence in `jd-purpose` MUST name the position as `English title (ROLECODE)` so the job title is locked and older half-translated variants do not return.
- Owner, approver, lead, and coordinator columns in SOP/WI/ANNEX documents MUST render with `role code`, `D-code`, or published bundles; do not leave plain text such as `Steering Committee`, `All functions`, or `department head`.
- Header and owner cells in Training Academy, competency, OJT, gate test, authorization, and role-roadmap documents MUST obey the same rule. Do not leave residues such as `QA/QMS`, `HR Manager / QA Manager`, `HR + OPS + QA/QMS`, `management department`, or vague `General Manager` clusters.
- Audience, user, reviewer, escalation, MR-user, dashboard-user, and backup-activation columns must also use `role code`, `D-code`, or published bundles; do not leave plain text such as `supervisors`, `site leadership`, `process owners`, or `all managers`.
- If a bundle is used to compress an actor cell, the first appearance in the document MUST be a linked bundle chip or must sit inside a table/note that already references the glossary.
- Technical system-group columns such as `owner group`, `editor group`, `security group`, `M365 group` may keep technical group names when the object being described is a system-security group, not an HR role.
- Published department codes must stay within the canonical set: `D-SCS`, `D-ENG`, `D-PROD`, `D-PPC`, `D-MNT`, `D-QUAL`, `D-SCM`, `D-PUR`, `D-WHS`, `D-TCR`, `D-LOG`, `D-FIN`, `D-HR`, `D-EHS`, `D-IT`, `D-ERP`.
- Legacy aliases such as `SAL`, `ENG`, `PRO`, `PLA`, `PUR`, `WHS`, `HSE`, `IT`, `CNC`, `OPS`, `Dept Head`, `Line Manager`, `Supervisor`, `Ops Manager`, `Purchasing Manager`, or `Engineering Manager` MUST NOT remain in headers, owner cells, RACI tables, interface tables, audience tables, or permission matrices after the job-order registry exists.
- If the cell is talking about department authority, resolve to `D-code`; if it is talking about personal role authority, resolve to `role code`; if it is talking about a stable recurring actor layer, use only a published `bundle`.
- Bundles are allowed to compress actor meaning only when they are already published in the source registry. Do not invent bundles inside released documents and legitimize them later.
- Header, preface, RACI, actor cell, owner cell, approval cell, and KPI-owner cell MUST NOT keep hybrid text such as `Warehouse + IQC`, `Buyer + IQC`, `Supervisor / QA`, `QA / Process Owner`, `Sales Lead`, `MRB`, `Sender`, `Maintenance + Workshop`; all such cells must resolve to valid `role code`, `D-code`, or `bundle` actors.
- If a structure cell needs extra qualification such as `per ANNEX-120`, `by rota`, `when applicable`, or `if impacted`, the chip goes first and the explanatory phrase goes after it. Do not revert to long titles just because the author wants to make it easier to read.
- `backup-card` in a JD must identify which role provides backup and which D-code provides backup capacity, while also cross-referencing `ANNEX-123`; do not leave vague text such as `direct manager`, `line manager`, or `suitable colleague`.
- Broken/unicode-drifted header labels that still imply owner or approver meaning must be normalized back to the intended metadata label, not ignored just because the HTML text became corrupted.
- The JD row `Role level` should use short controlled labels such as `Executive`, `Manager`, `Lead`, `Supervisor`, `Engineer / Specialist`, `Technician / Operator`; do not leave hybrid labels such as `Supervisor / Lead`.

### 6.1 Body-text rule for JDs and related documents

- JD title and the row `Job title shown in the document` keep the standard English title.
- Header `Owner`, header `Approved by`, row `Department`, owner cells, RACI cells, and actor cells use `role code`, `D-code`, or `bundle` according to the correct layer.
- In body text, if the term identifies a real actor/authority, resolve it to `role code` or `D-code`; do not keep half-translated phrases such as `Customer Service`, `Engineering Lead`, `Supervisor`, `Planning`, `Purchasing`.
- If a term refers to a business concept rather than an organizational actor, rewrite it in clear operational Vietnamese; do not leave English-Vietnamese hybrids.
- Technical system-group names may stay only when the object is truly a security group, M365 group, ERP role group, or technical queue.

### 6.2 Mandatory rule for digital / KPI / dashboard documents

When editing WI/ANNEX/SOP documents for dashboards, KPI, ERP, M365, access review, deputy, or data governance:

- `MR_REPORT_OWNERS` = actor cluster that closes/submits KPI and MR packs
- `ITA / ESA` = roles that validate system-source layer, workflow, refresh logic, and technical traceability
- `FUNC_OWNERS` or `OPS_SCOPE_OWNERS` = group/function that owns business content

In actor cells, owner cells, approver cells, reviewer cells, and audience cells:

- do NOT leave `data owner`, `system owner`, `business owner`, `KPI owner`, or equivalent vague phrasing;
- resolve them into published `role code`, `D-code`, or `bundle` actors.

In prose, if the concept is non-actor but still needed:

- use `business-data owning unit` for business-content ownership;
- use `role that validates the data source` for the actor that validates source/refresh behavior;
- use `pack-owning role` for the actor who closes and submits the KPI/MR pack.

Use `DATA_OWNERS` when the document is truly referring to the published business-data ownership cluster and needs actor-cell compression.
Use `SYSTEM_OWNERS` when the document is truly referring to the published system-ownership cluster and needs actor-cell compression.

### 6.3 Residue-audit rule after normalization

Residue audit must distinguish between:

- real residue to fix, such as `SAL`, `ENG`, `Supervisor`, `Engineering Lead`, `Department Head`, `Process Owner`, `Data Owner`, or half-translated role phrases;
- valid tokens that must not be reported as false positives, such as `D-ENG`, `ENGM`, `FRM-ENG-xxx`, `PROC-SAL-xxx`, `RET-SCS-xxx`, `HESEM ENGINEERING`.

If a scanner still reports `SAL` or `ENG`, the editor must confirm whether it is:

1. an old alias still leaking inside content, or
2. only part of a valid form code, retention code, role code, department code, or company name.

A cleanup task is closed only when true residue reaches zero. Do not declare success while scanners are still mixing valid tokens and legacy residue.

---

## 7. Mandatory Update Order

When a header owner or owner cell is using the wrong layer:

1. re-close the role-boundary profile;
2. fix the source JD/handbook;
3. sync registry and dictionary;
4. run normalize / regenerate;
5. review related SOP/WI/ANNEX documents;
6. only then conclude that the issue is fixed.

Do not patch downstream HTML first while the source JD/handbook is still wrong.

---

## 8. QA Checklist Before Closing the Task

- Does JD header `Owner` now use the correct profile `D-code`?
- Does JD header `Approved by` now use the correct approving role chip?
- Does row `Department` link to the correct handbook?
- Does the preface block now use `D-code` instead of long written department names?
- Do handbook links in index/preface/body now display the correct canonical handbook `D-code`?
- Where a subfunction is shown, is it clearly justified as a subfunction instead of being mistaken for a department summary?
- Does row `Job title shown in the document` in the JD still keep the plain English title?
- Has duplicate preface content in `Related documents` been removed?
- In SOP/WI/ANNEX documents, are owner columns clearly now split between `role code` and `D-code` according to the meaning of the data?
- Is there any residue such as wrong `D-HR`, `Department Head`, `Process Owner`, `Data Owner`, `QA/QMS`, or long department names left in headers or owner cells?
- Is any unresolved pseudo-role still present, such as `QMS Manager`, `IT Manager`, `Sales Manager`, `Engineering Manager`, `Production Supervisor`, `IQC Team Leader`, `Business Owner`, `System Owner`, `KPI owner`, or `IT Data Owner`?
- Is there any textual-JD residue such as `JD-... family`, `JD-... Technician`, `JD-... Manager / ... Engineer` that is not a real canonical JD code or JD-linked role chip?


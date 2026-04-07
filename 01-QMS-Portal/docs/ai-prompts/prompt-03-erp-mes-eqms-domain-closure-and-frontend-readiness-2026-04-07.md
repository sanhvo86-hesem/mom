# Prompt 03 — ERP/MES/eQMS World-Class Re-Audit, Domain Closure, Frontend Contract Authority, and Publish Gates

**Date:** 2026-04-07  
**Target repo:** `qms.hesem.com.vn/01-QMS-Portal` within `sanhvo86-hesem/hesemqms`  
**Context:** Prompt 02 has already executed through multiple hardening/proof iterations. Do **not** restart broad planning. Do a deep repo re-audit, compare against world-class manufacturing/compliance architecture, close truth gaps, and produce the canonical platform artifacts required **before** serious frontend build-out.

---

## 0) Non-negotiable operating stance

You are **not** being asked to write another loose planning memo.

You must:

1. **Read the current repo state first** and use the repo as source of truth.
2. **Read all Prompt 02 artifacts** under `01-QMS-Portal/docs/ai-prompts/`, especially the most recent evaluation and implementation prompts for foundation governance.
3. **Assume the remaining blockers are real until disproven repo-locally**:
   - workflow bridge truthfulness / fail-closed behavior
   - `governance.approval_group` still only `overall: partial`
   - frontend metadata closure is incomplete (`field definitions`, `pack families`, detail sections, capability truth)
   - publication artifacts may still split truth
   - observability proof and full publish gates are still incomplete
4. **Do not build the final frontend UI yet.** Prompt 03 exists to ensure the frontend can later be built **without guessing domain logic, workflow truth, permissions, evidence rules, or machine-state semantics**.
5. **Do not hand-wave runtime truth.** If runtime is blocked, metadata/publish artifacts must say blocked. If partial, say partial. Never mark ready/active unless the repo proves it.
6. **Do code + artifacts + proofs where required.** Do not stop at commentary.

---

## 1) Mission

Transform the repo from a strong foundation-governance slice into a **frontend-ready, world-class ERP + MES + eQMS platform authority** for HESEM’s manufacturing context.

Prompt 03 must do three things in one disciplined pass:

### A. Close the remaining Prompt 02 truth/publish gaps
Finish the unresolved governance/foundation/frontend-contract blockers so the current slice is genuinely publishable and trustworthy.

### B. Build the canonical platform architecture authority
Define the platform-wide module map, bounded contexts, canonical entities, workflows, events, evidence rules, machine/data integration patterns, and compliance controls required for a world-class ERP/MES/eQMS foundation.

### C. Produce frontend-ready contract authority
Generate the metadata, field definitions, screen contracts, capability flags, section layouts, navigation, permissions, and readiness rules so future frontend work can be executed with low ambiguity and low rework.

---

## 2) External standards and models you must anchor to

Use the repo plus the following external standards/models as explicit decision anchors. Where tradeoffs exist, state them.

### API / contract / payload governance
- **OpenAPI**: use **3.1.2 minimum** as the baseline stable patch in the 3.1 line; only consider 3.2.0 if the repo’s tooling/generators/lint stack is proven compatible.
- **RFC 9457** for `application/problem+json` error modeling.
- **JSON Schema Draft 2020-12** for schema authority.
- **GraphQL Cursor Connections** only if the repo exposes GraphQL read facades; REST remains canonical unless the repo clearly proves otherwise.

### Concurrency / consistency / database behavior
- PostgreSQL transaction isolation behavior and retry semantics.
- Row-version / optimistic concurrency patterns aligned with mature enterprise practice.
- Strong validator strategy for writes/updates (no weak-truth concurrency behavior on regulated records).

### Observability / proof
- OpenTelemetry semantic conventions for traces, logs, metrics, and database/http context.

### Manufacturing / integration / machine semantics
- **ISA-95 / IEC 62264** as the enterprise-control integration backbone.
- **B2MML** as a useful canonical reference for ERP↔MES message semantics.
- **ISA-88** for recipe/state/equipment discipline where relevant.
- **MTConnect** for discrete manufacturing / CNC semantic machine data.
- **OPC UA companion-model strategy** for semantic interoperability.
- **PackML / PackTags** where machine-state standardization materially improves execution/OEE/line-state semantics.

### Quality / compliance / regulated-system discipline
- FDA **21 CFR Part 11** scope, electronic records/signatures, audit/evidence expectations.
- EU GMP **Annex 11** computerised-systems discipline.
- Consider the current EU direction signaled by the 2025 consultation on **revised Annex 11**, revised Chapter 4, and proposed **Annex 22 for AI**.
- Use a risk-based AI governance stance aligned with **NIST AI RMF 1.0** for any AI-enabled capability, assistant, recommendation, classifier, summarizer, or automation proposal.

---

## 3) Product thesis you must enforce

The target is **not** “a QMS portal with some ERP/MES pages.”

The target is a **single authoritative manufacturing platform** with these characteristics:

1. **ERP, MES, and eQMS share one canonical domain language** rather than living as disconnected apps.
2. **Master data, workflow, evidence, and permissions are platform services**, not duplicated by module.
3. **Quality and compliance are cross-cutting threads**, not bolt-ons.
4. **Machine/OT semantics are first-class**, especially for CNC / job-order / discrete manufacturing realities.
5. **Frontend contracts are generated from authoritative platform metadata**, not manually improvised per page.
6. **AI is governed, bounded, auditable, and human-supervised** where it touches regulated or quality-relevant workflows.

---

## 4) Canonical platform scope you must map

You must define and document a platform-wide canonical module map and entity catalog, with at least these bounded contexts:

### Platform / cross-cutting
- Identity, authentication, session, CSRF, re-authentication, electronic signature
- Authorization, role bundles, department boundaries, approval authority, delegation
- Workflow / approval / hold / release / escalation / SLA
- Evidence / records / audit trail / immutable event logging
- Notifications / subscriptions / inbox / alerts
- Search / timeline / activity feed / saved views
- Observability / diagnostics / publication integrity / registry generation

### Foundation master data
- Organization, site, area, line, work center, machine, equipment, tooling, device
- Party / person / employee / contractor / supplier / customer
- Role / role-code / department-code / skill / certification / training status
- Calendar / shift / holiday / capacity calendar
- Item / material / finished good / semi-finished / document-controlled artifact
- Unit of measure / code sets / enumerations / dictionaries

### Engineering and manufacturing definition
- Product structure / BOM
- Process structure / BOP / route / operation / setup / runtime standard
- Drawing/spec/program/tool list/work instructions/travelers
- Revision, effectivity, supersession, release gates

### Planning / ERP-facing operations
- Demand / quote / sales order / customer order (if already in repo scope)
- Production order / job order / work order
- Material planning / availability / allocation
- Finite-capacity scheduling / dispatch sequencing / reschedule reasons
- Purchase / supplier commitments where relevant to HESEM flow

### MES execution
- Dispatch list / traveler / operation start-pause-complete
- WIP / queue / transfer / handoff / split / merge / scrap / rework
- Labor capture / machine time / downtime / setup time
- Tool usage / tool life / program version linkage
- Machine state, telemetry, alarms, events, counters, OEE inputs

### Quality / eQMS
- Document control / SOP / WI / ANNEX / FRM lifecycle
- Training / competency / effectiveness checks
- Incoming / in-process / final inspection
- NC / deviation / hold / concession / rework / MRB-style paths if applicable
- CAPA / root cause / containment / effectiveness verification
- Audit / finding / action / closure
- Calibration / MSA / controlled equipment records
- Supplier quality / complaint / change control / risk assessment

### Traceability / compliance thread
- Lot / serial / genealogy / as-built / as-inspected
- Material cert / program version / tool version / operator / inspector / machine linkage
- Electronic signatures, approval evidence, release evidence, exception evidence
- Record retention / exportability / inspection-ready access

### Analytics / decision support
- KPI catalogs
- quality, delivery, cost, productivity, OEE, schedule adherence, FPY, CAPA aging
- semantic metric definitions and traceability to source entities/events
- AI-assisted insight opportunities only where governed and explainable

---

## 5) Mandatory Prompt 03 outputs

Create or refresh the following artifacts. Use exact or extremely close names under `01-QMS-Portal/docs/ai-prompts/` unless an equivalent canonical path already exists and should be extended rather than duplicated.

### A. Deep re-audit package
1. `prompt-03-platform-re-audit-and-gap-matrix-2026-04-07.md`
   - repo-current findings only
   - explicit carry-forward from Prompt 02
   - truth matrix: runtime truth, metadata truth, publication truth, observability truth, compliance truth
   - severity-tagged gaps

2. `prompt-03-world-class-reference-architecture-2026-04-07.md`
   - platform thesis
   - standards mapping
   - bounded contexts
   - canonical integration patterns
   - why this target is strong for ERP + MES + eQMS in a CNC/job-order environment

3. `prompt-03-domain-map-and-entity-catalog-2026-04-07.md`
   - canonical entity list
   - ownership by bounded context
   - relationships, lifecycles, keys, effectivity, revision logic
   - mandatory evidence / audit requirements per entity family

### B. Frontend authority package
4. `prompt-03-frontend-contract-authority-2026-04-07.md`
   - the rules by which frontend contracts are generated and trusted
   - no hand-maintained split-truth catalogs
   - readiness gates for `blocked` / `partial` / `ready`
   - authoritative source chain for endpoint catalog, entity catalog, field definitions, navigation, screen metadata, and quality report

5. `prompt-03-screen-and-field-definition-catalog-2026-04-07.md`
   - for each prioritized entity/module define:
     - list view
     - detail view
     - create/edit dialog or form
     - timeline/activity/evidence panel
     - approval panel if applicable
     - related records sections
     - status chips / tags / badges
     - filters, sort, grouping, saved views
     - command actions with permission and evidence requirements
   - define field families, pack families, section layouts, detail blocks, and capability flags

6. `prompt-03-priority-waves-and-frontend-readiness-plan-2026-04-07.md`
   - P0 / P1 / P2 sequencing
   - which modules are safe to frontend first
   - dependencies and hard blockers
   - recommended frontend slice order

### C. Generated / regenerated machine-readable artifacts
You must also create or regenerate machine-readable catalogs from a **single authority path**. If equivalent artifacts already exist, fix them rather than forking truth.

At minimum ensure the repo has authoritative artifacts for:
- endpoint catalog
- entity/module catalog
- frontend contract/catalog
- field-definition catalog
- navigation/menu catalog
- workflow/approval capability catalog
- registry manifest
- registry quality report

If the repo already has generator infrastructure, use it. If it is split, refactor toward one authority and regenerate downstream artifacts.

---

## 6) Immediate blockers Prompt 03 must close before claiming success

You must not mark Prompt 03 complete until these are solved or explicitly fail-closed and reported truthfully:

### 6.1 Foundation/governance closure
- `governance.approval_group` is no longer false-green.
- Its field definitions, pack families, detail sections, capabilities, workflow state, observability state, and readiness status are complete and internally consistent.
- If workflow bridge is still not authoritative, this entity remains blocked/partial everywhere consistently.

### 6.2 Publication authority closure
- `endpoint-catalog`, `frontend-*catalog`, `registry-manifest`, and `registry-quality-report` must be generated from one coherent authority chain.
- No stale timestamps, no split summaries, no contradictory readiness values.
- Freshness must be correlated to the current generation run, not a hardcoded date threshold.

### 6.3 Observability closure
For the current live slice at minimum, provide proof-grade observability scaffolding and truth:
- traces for request → service → workflow/evidence boundaries
- structured logs with correlation/publication run ids
- metrics for approval decisions, canonical writes, blocked decisions, validation failures
- explicit readiness signal for observability coverage

### 6.4 Canonical write / workflow truthfulness
- No adapter may swallow workflow authority failures as “non-fatal success”.
- No command may pretend success if canonical DB write is not implemented.
- No route/catalog entry may be `active` if runtime is still bridged/blocked/partial.

---

## 7) World-class design requirements you must encode into the architecture

### 7.1 Canonical command/query discipline
- Clear separation between read models and command-side invariants.
- Idempotency strategy for commands that can be retried.
- Row-version / strong concurrency checks for regulated writes.
- Problem details responses for validation/business-rule failures.

### 7.2 Evidence and audit discipline
- Append-only audit/event discipline for regulated actions.
- Electronic signature and re-auth hooks for approval/release/closure actions where appropriate.
- Human-readable and inspection-ready export path.
- Record retention / integrity / traceability assumptions explicitly documented.

### 7.3 Manufacturing semantics
- ISA-95 style boundary clarity between enterprise planning, operations execution, and control/data-collection layers.
- Machine/resource hierarchy and state semantics must be explicit.
- Prefer standard external semantics for machine connectivity and normalized telemetry.
- Traceability model must connect order → operation → machine → tool → operator → inspection/evidence.

### 7.4 Frontend-ready metadata discipline
For each prioritized module/entity, metadata must define:
- display title and canonical technical key
- list columns and filter behavior
- detail sections and evidence sections
- command availability by permission + state
- workflow state and timeline behavior
- empty/loading/error states
- observability tags and telemetry keys
- readiness status sourced from one authority

### 7.5 AI governance discipline
If AI-enabled capabilities are proposed anywhere in ERP/MES/eQMS, Prompt 03 must define governance artifacts for them:
- intended use
- out-of-scope / forbidden use
- human review requirement
- training/evaluation data lineage expectations
- model/version/change control expectations
- performance metrics and rollback criteria
- evidence logging requirements
- whether the capability is advisory, assistive, or autonomous

Do **not** allow autonomous AI control over regulated release/approval/quality-disposition decisions.

---

## 8) Recommended priority wave structure

Use this unless repo reality gives a stronger sequencing reason.

### P0 — Must be frontend-safe first
- foundation/governance truth closure
- identity/permission/workflow/evidence authority
- document-control and training authority
- organization/party/role/calendar foundation data
- publication authority and observability proof

### P1 — Manufacturing digital thread core
- item/material/product structure
- route/operation/work center/machine/tooling
- production/job/work orders
- dispatch/WIP/execution/timeline
- inspection and genealogy / as-built / as-inspected linkage
- machine state / telemetry normalization for CNC context

### P2 — Extended enterprise / optimization
- procurement and supplier quality depth
- advanced scheduling / what-if planning
- maintenance/calibration/asset optimization depth
- analytics / semantic KPI layer / AI assistive functions

---

## 9) Concrete machine-readable acceptance criteria

Do not claim completion unless all of the following are satisfied:

1. **Prompt 02 carry-forward blockers are resolved or truthfully fail-closed** across runtime + metadata + publication.
2. A **single authority chain** generates publish artifacts.
3. `governance.approval_group` has no contradictory readiness/field/capability truth.
4. A repo-local consumer could identify, for each prioritized entity:
   - API contract
   - field definitions
   - detail sections
   - permissions
   - workflow behavior
   - evidence requirements
   - timeline semantics
   - observability tags
5. Frontend teams can derive navigation, list/detail forms, actions, and state chips without inventing domain rules.
6. The world-class architecture artifacts explicitly map repo design choices to recognized standards/models.
7. Any remaining blockers are specific, evidence-based, and sharply scoped — not broad “needs more research” language.

---

## 10) Required implementation behavior

When executing Prompt 03:

- Prefer modifying existing generator/registry infrastructure over creating parallel truth.
- Prefer extending canonical service/controller/schema layers over adding one-off files.
- If you add artifacts, ensure they are referenced from the existing repo documentation structure.
- If code and artifacts disagree, fix the disagreement; do not write a memo around it.
- If a proof cannot be run in the current shell, leave the system in a state where the proof is clearly runnable and document the exact command and expected artifact outputs.
- Every readiness claim must map to a checkable condition.

---

## 11) Explicit out-of-scope for this prompt

Do **not**:
- design final visual styling / page aesthetics / CSS polish / dashboard cosmetics
- create fake demo readiness by manually editing generated JSON only
- widen into generic company strategy slides
- treat AI brainstorming as a substitute for canonical contracts
- mark the platform frontend-ready if metadata, workflow, evidence, or observability are still partial

---

## 12) Final deliverable style

At the end of this prompt execution, provide:

1. A short executive summary.
2. The exact files created/updated.
3. The top unresolved blockers, if any.
4. A blunt judgment:
   - `NOT READY FOR FRONTEND`
   - `READY FOR LIMITED FRONTEND ON P0 MODULES`
   - `READY FOR BROADER FRONTEND EXECUTION`

Use that judgment conservatively and base it on repo truth, not optimism.


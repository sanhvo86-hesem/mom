# 34 — Vendor Benchmark Deep Playbook
File này biến benchmark thành lựa chọn thiết kế. Không sao chép vendor; extract pattern và tạo HESEM control.
## SAP S/4HANA + SAP Digital Manufacturing
| Question | Answer |
| --- | --- |
| Pattern proven | resource orchestration from warehouse/inventory/quality/labor/maintenance |
| HESEM emulate | emulate skill-aware dispatch, staging, exception orchestration |
| Avoid | avoid SAP-style implementation gravity and module sprawl |
| Differentiation | authority-led micro-slices with explicit evidence gates |
### HESEM design translation
- Convert pattern into root contracts, not generic modules.
- Bind UI to authority class: WS projection or AR authority.
- Convert workflow into command bus states and guard evidence.
- Convert analytics into data contracts and OTG lineage.
- Convert compliance claim into validation artifact if regulated.
### Anti-patterns to reject
- Configuration sprawl with no source-of-truth.
- Dashboard without lineage.
- AI answer without controlled source.
- MES screen without operator/equipment/material eligibility.
- QMS workflow without audit/evidence/signature semantics.

## Siemens Opcenter
| Question | Answer |
| --- | --- |
| Pattern proven | plan/orchestrate manufacturing and quality; compare as-planned vs as-is |
| HESEM emulate | emulate closed-loop plan-to-execute-to-improve logic |
| Avoid | avoid opaque customization and weak UX modernization |
| Differentiation | operational truth graph with inspectable root authority |
### HESEM design translation
- Convert pattern into root contracts, not generic modules.
- Bind UI to authority class: WS projection or AR authority.
- Convert workflow into command bus states and guard evidence.
- Convert analytics into data contracts and OTG lineage.
- Convert compliance claim into validation artifact if regulated.
### Anti-patterns to reject
- Configuration sprawl with no source-of-truth.
- Dashboard without lineage.
- AI answer without controlled source.
- MES screen without operator/equipment/material eligibility.
- QMS workflow without audit/evidence/signature semantics.

## Dassault DELMIA Apriso
| Question | Answer |
| --- | --- |
| Pattern proven | global MOM/MES platform across execution, quality, warehouse, maintenance |
| HESEM emulate | emulate multi-site standardized process models |
| Avoid | avoid pure configurable black box without repo-evidence |
| Differentiation | repo-native standards-to-gates and root-by-root graduation |
### HESEM design translation
- Convert pattern into root contracts, not generic modules.
- Bind UI to authority class: WS projection or AR authority.
- Convert workflow into command bus states and guard evidence.
- Convert analytics into data contracts and OTG lineage.
- Convert compliance claim into validation artifact if regulated.
### Anti-patterns to reject
- Configuration sprawl with no source-of-truth.
- Dashboard without lineage.
- AI answer without controlled source.
- MES screen without operator/equipment/material eligibility.
- QMS workflow without audit/evidence/signature semantics.

## Rockwell Plex / FactoryTalk
| Question | Answer |
| --- | --- |
| Pattern proven | cloud MES with real-time paperless production, quality and compliance |
| HESEM emulate | emulate paperless shopfloor + enterprise visibility |
| Avoid | avoid machine-data-only thinking |
| Differentiation | combine MES + eQMS + ERP command bus in one authority map |
### HESEM design translation
- Convert pattern into root contracts, not generic modules.
- Bind UI to authority class: WS projection or AR authority.
- Convert workflow into command bus states and guard evidence.
- Convert analytics into data contracts and OTG lineage.
- Convert compliance claim into validation artifact if regulated.
### Anti-patterns to reject
- Configuration sprawl with no source-of-truth.
- Dashboard without lineage.
- AI answer without controlled source.
- MES screen without operator/equipment/material eligibility.
- QMS workflow without audit/evidence/signature semantics.

## MasterControl
| Question | Answer |
| --- | --- |
| Pattern proven | regulated eBR/eDHR and QMS patterns |
| HESEM emulate | emulate record release, review by exception, GxP evidence |
| Avoid | avoid compliance veneer without intended-use validation |
| Differentiation | validation factory integrated from first mutation |
### HESEM design translation
- Convert pattern into root contracts, not generic modules.
- Bind UI to authority class: WS projection or AR authority.
- Convert workflow into command bus states and guard evidence.
- Convert analytics into data contracts and OTG lineage.
- Convert compliance claim into validation artifact if regulated.
### Anti-patterns to reject
- Configuration sprawl with no source-of-truth.
- Dashboard without lineage.
- AI answer without controlled source.
- MES screen without operator/equipment/material eligibility.
- QMS workflow without audit/evidence/signature semantics.

## ETQ Reliance
| Question | Answer |
| --- | --- |
| Pattern proven | workflow-based eQMS: doc, training, audit, CAPA, supplier quality, risk |
| HESEM emulate | emulate configurable quality workflows and central quality hub |
| Avoid | avoid disconnected quality from operations |
| Differentiation | quality roots embedded into MOM execution and genealogy |
### HESEM design translation
- Convert pattern into root contracts, not generic modules.
- Bind UI to authority class: WS projection or AR authority.
- Convert workflow into command bus states and guard evidence.
- Convert analytics into data contracts and OTG lineage.
- Convert compliance claim into validation artifact if regulated.
### Anti-patterns to reject
- Configuration sprawl with no source-of-truth.
- Dashboard without lineage.
- AI answer without controlled source.
- MES screen without operator/equipment/material eligibility.
- QMS workflow without audit/evidence/signature semantics.

## Arena / PTC
| Question | Answer |
| --- | --- |
| Pattern proven | PLM/QMS link between product record and quality records |
| HESEM emulate | emulate design-to-quality linkage |
| Avoid | avoid PLM-only scope that misses execution truth |
| Differentiation | ECO/ITEM/FMEA/control-plan linked to MES evidence |
### HESEM design translation
- Convert pattern into root contracts, not generic modules.
- Bind UI to authority class: WS projection or AR authority.
- Convert workflow into command bus states and guard evidence.
- Convert analytics into data contracts and OTG lineage.
- Convert compliance claim into validation artifact if regulated.
### Anti-patterns to reject
- Configuration sprawl with no source-of-truth.
- Dashboard without lineage.
- AI answer without controlled source.
- MES screen without operator/equipment/material eligibility.
- QMS workflow without audit/evidence/signature semantics.

## Tulip
| Question | Answer |
| --- | --- |
| Pattern proven | frontline operations platform connecting people, machines, devices, systems |
| HESEM emulate | emulate composable worker apps and edge data capture |
| Avoid | avoid uncontrolled app sprawl |
| Differentiation | connected-worker runtime bound to root contracts and guard evidence |
### HESEM design translation
- Convert pattern into root contracts, not generic modules.
- Bind UI to authority class: WS projection or AR authority.
- Convert workflow into command bus states and guard evidence.
- Convert analytics into data contracts and OTG lineage.
- Convert compliance claim into validation artifact if regulated.
### Anti-patterns to reject
- Configuration sprawl with no source-of-truth.
- Dashboard without lineage.
- AI answer without controlled source.
- MES screen without operator/equipment/material eligibility.
- QMS workflow without audit/evidence/signature semantics.

## Poka
| Question | Answer |
| --- | --- |
| Pattern proven | connected worker knowledge, training, skill and instruction system |
| HESEM emulate | emulate skill-aware work instructions and microlearning |
| Avoid | avoid content library detached from authority |
| Differentiation | training/qualification gates drive dispatch eligibility |
### HESEM design translation
- Convert pattern into root contracts, not generic modules.
- Bind UI to authority class: WS projection or AR authority.
- Convert workflow into command bus states and guard evidence.
- Convert analytics into data contracts and OTG lineage.
- Convert compliance claim into validation artifact if regulated.
### Anti-patterns to reject
- Configuration sprawl with no source-of-truth.
- Dashboard without lineage.
- AI answer without controlled source.
- MES screen without operator/equipment/material eligibility.
- QMS workflow without audit/evidence/signature semantics.

## MaintainX / Limble
| Question | Answer |
| --- | --- |
| Pattern proven | maintenance work orders, asset care, preventive/predictive execution |
| HESEM emulate | emulate maintenance simplicity and mobile completion |
| Avoid | avoid maintenance island |
| Differentiation | maintenance evidence flows into OEE, quality holds and equipment eligibility |
### HESEM design translation
- Convert pattern into root contracts, not generic modules.
- Bind UI to authority class: WS projection or AR authority.
- Convert workflow into command bus states and guard evidence.
- Convert analytics into data contracts and OTG lineage.
- Convert compliance claim into validation artifact if regulated.
### Anti-patterns to reject
- Configuration sprawl with no source-of-truth.
- Dashboard without lineage.
- AI answer without controlled source.
- MES screen without operator/equipment/material eligibility.
- QMS workflow without audit/evidence/signature semantics.

## ServiceNow
| Question | Answer |
| --- | --- |
| Pattern proven | enterprise workflow platform and cross-functional case orchestration |
| HESEM emulate | emulate workflow, case, service catalog, SLA design |
| Avoid | avoid generic workflow without manufacturing semantics |
| Differentiation | ISA-95-aware commands and manufacturing-specific authority ledger |
### HESEM design translation
- Convert pattern into root contracts, not generic modules.
- Bind UI to authority class: WS projection or AR authority.
- Convert workflow into command bus states and guard evidence.
- Convert analytics into data contracts and OTG lineage.
- Convert compliance claim into validation artifact if regulated.
### Anti-patterns to reject
- Configuration sprawl with no source-of-truth.
- Dashboard without lineage.
- AI answer without controlled source.
- MES screen without operator/equipment/material eligibility.
- QMS workflow without audit/evidence/signature semantics.

## Palantir ontology style
| Question | Answer |
| --- | --- |
| Pattern proven | digital twin with objects/properties/links and actions/security |
| HESEM emulate | emulate semantic + kinetic graph |
| Avoid | avoid black-box ontology with weak evidence |
| Differentiation | Operational Truth Graph V3 with signed event/evidence edges |
### HESEM design translation
- Convert pattern into root contracts, not generic modules.
- Bind UI to authority class: WS projection or AR authority.
- Convert workflow into command bus states and guard evidence.
- Convert analytics into data contracts and OTG lineage.
- Convert compliance claim into validation artifact if regulated.
### Anti-patterns to reject
- Configuration sprawl with no source-of-truth.
- Dashboard without lineage.
- AI answer without controlled source.
- MES screen without operator/equipment/material eligibility.
- QMS workflow without audit/evidence/signature semantics.

## Databricks / Snowflake / Fabric
| Question | Answer |
| --- | --- |
| Pattern proven | lakehouse/semantic manufacturing data product patterns |
| HESEM emulate | emulate governed CDC and analytics products |
| Avoid | avoid analytics divorced from authoritative source |
| Differentiation | CDC from authority ledger with replayable lineage and quality gates |
### HESEM design translation
- Convert pattern into root contracts, not generic modules.
- Bind UI to authority class: WS projection or AR authority.
- Convert workflow into command bus states and guard evidence.
- Convert analytics into data contracts and OTG lineage.
- Convert compliance claim into validation artifact if regulated.
### Anti-patterns to reject
- Configuration sprawl with no source-of-truth.
- Dashboard without lineage.
- AI answer without controlled source.
- MES screen without operator/equipment/material eligibility.
- QMS workflow without audit/evidence/signature semantics.

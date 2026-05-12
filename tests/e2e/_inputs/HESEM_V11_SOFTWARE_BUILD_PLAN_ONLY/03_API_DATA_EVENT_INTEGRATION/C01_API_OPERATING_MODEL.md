# C01 — API Contract Operating Model

Stream: `C_API_DATA_INTEGRATION`  
Prompt: `C01_API_CONTRACT_OPERATING_MODEL`  
Output folder: `HESEM_V11_PARALLEL_OUTPUT/C_API_DATA_INTEGRATION/C01_API_CONTRACT_OPERATING_MODEL/`  
Generated: 2026-04-26  
Posture: planning-only, development/prototype/pre-production-readiness.

## 1. Run boundary

This package creates a planning operating model for HESEM API contracts. It does not create OpenAPI YAML/JSON, executable schema, code, DDL, SQL, controller, service, component, test code, HTML, CSS, or JavaScript.

GitHub repo check skipped by explicit user instruction. I cannot verify the current repo state from connector in this turn. This C01 output therefore does not assert the current implementation state of `sanhvo86-hesem/mom`.

## 2. Sources read and source-of-truth posture

| Source | Used for | Authority in this C01 run | Notes |
|---|---|---:|---|
| `HESEM_GPT_PROJECT_MEMORY.md` | product posture, frozen roots, route grammar, HMV4 safety, non-negotiables | High | Contains current memory posture: development/prototype/pre-production-readiness and “No API without contract”. |
| `HESEM_WORLDCLASS_PLANNING_OS_V10_DEEP_NO_CODE` | root/domain/API/workflow/frontend/evidence/e-sign/problem/event matrices | Highest planning baseline available | V10 is the richest no-code planning package in source. |
| `HESEM_WORLDCLASS_PLANNING_OS_V9_NO_CODE` | planning-only continuity and no-code rule | Supporting | Used to confirm V9→V10 planning-only direction. |
| `HESEM_WORLDCLASS_WAVE_PLAN_V8_CLAUDE` | command bus, authority ledger, V8 API/problem/event factory, invariants | High supporting | V8 is stricter than V7 on normative command and authority discipline. |
| `HESEM_WORLDCLASS_WAVE_PLAN_V7_SUPER_OPERATING_SYSTEM` | API/event/problem contract factory and workflow mutation command bus | Supporting | Some examples are executable-like; C01 extracts policy only and does not reproduce YAML/JSON. |
| `HESEM_WORLDCLASS_WAVE_PLAN_V6_GPTPRO_EXTREME` | API maturity, event outbox, problem details field policy | Supporting | Used for continuity with earlier wave planning. |
| `HESEM_WORLDCLASS_WAVE_PLAN_V5_CLAUDE` | detailed API contract factory and URI design concepts | Supporting with constraint | V5 contains executable-style examples; C01 only keeps planning grammar and policy. |
| P0/A03/B stream outputs | root baseline and workflow command binding | Pending | No `HESEM_V11_PARALLEL_OUTPUT/P0_BASELINE/` files were found in `/mnt/data`; C01 uses V10 matrices and marks P0/A03/B bindings as pending. |

### V10 quantitative baseline used

| Baseline artifact | Count | C01 usage |
|---|---:|---|
| V10 root catalog | 145 roots across 14 domains | canonical root/resource-family baseline for C02/C03 |
| V10 endpoint master catalog | 4196 endpoint planning rows | endpoint taxonomy alignment and category coverage |
| V10 workflow transition matrix | 1151 transitions | command binding doctrine |
| V10 event catalog | 1740 event rows | event effect policy |
| V10 evidence object catalog | 1160 evidence rows | evidence/audit policy |
| V10 e-signature catalog | 870 signature rows | signature meaning policy |
| V10 problem details catalog | 12 problem families | problem family baseline |

## 3. Operating doctrine

C01 establishes one rule: an API endpoint is not a URL; it is a governed contract row that binds authority, workflow or query semantics, frontend consumer, evidence/audit/event effect, security policy, problem-detail behavior, versioning, and observability.

Non-negotiables for every endpoint family:

1. No endpoint without root or platform-spine binding.
2. No command without workflow command binding.
3. No mutation without authorization, idempotency, concurrency, audit, event, and problem-detail policy.
4. No workspace mutation; workspace endpoints are projections and must re-anchor to authoritative record shells for actions.
5. No e-sign endpoint without signature meaning, signer authority, record snapshot, and audit trail.
6. No AI endpoint with autonomous regulated decision authority; AI may advise, propose, summarize, or draft but human authority remains explicit.
7. No live API graduation without contract row, frontend consumer, fallback behavior, observability, and rollback/repair plan.

## 4. API contract ownership model

| Role | Owns | Approval right | Evidence required | Stop rule |
|---|---|---|---|---|
| API Contract Owner | endpoint taxonomy, contract row grammar, versioning, problem family policy | approve/defer/block API contract completeness | completed endpoint contract matrix row and naming/path grammar review | endpoint cannot enter C02/C03 catalog if contract fields are incomplete |
| Root Owner / Domain Owner | authoritative root semantics, resource family, allowed workflow and record identity | approve/defer/block root-specific endpoint binding | root catalog row, authority class, owner role, record shell route | no endpoint if root owner or authority class is unknown |
| Workflow Owner | state model, command names, guards, rollback/void/revision policy | approve/defer/block command endpoints | transition row, guard evidence, state source/target, command result policy | command endpoint blocked if workflow binding is pending |
| Frontend Consumer Owner | screen/route/region, loading/error/permission/offline states | approve/defer/block UI handoff | route class, consumer region, disabled action reason, fallback state | no endpoint with anonymous consumer unless internal/integration reason is recorded |
| Security/Compliance Lead | authn/authz, SoD, tenant/object/property authorization, rate-limit/resource policy | approve/defer/block security posture | ASVS/API Security mapping, permission scope, problem family mapping | no mutation with generic authz or missing object/property policy |
| Evidence/Audit/e-Sign Lead | audit trail, evidence object, signature meaning, retention implication | approve/defer/block regulated/evidence-bearing behavior | evidence/audit/signature matrix rows, intended meaning and retention policy | no e-sign/evidence endpoint without meaning and audit effect |
| Integration/Data Lead | inbound/outbound integration semantics, proposal-vs-authority boundary, event/CDC/data contracts | approve/defer/block partner/system integration | integration interface row, event/CDC policy, replay policy | integration cannot create authority unless explicitly authorized |
| Observability/SRE Lead | telemetry taxonomy, correlation, SLO/SLA planning, alert and trace tags | approve/defer/block telemetry readiness | tags, correlation identifiers, log/audit separation, dashboard plan | no live endpoint without correlation and endpoint-category tags |
| QA/Validation Lead | acceptance gate, traceability, test/evidence package planning | approve/defer/block handoff to implementation planning | requirement-to-root-to-workflow-to-API-to-screen matrix and orphan check | no implementation handoff if traceability has orphan rows |

## 5. Contract row lifecycle

| Stage | Required output | Gate owner | Gate decision |
|---|---|---|---|
| Intake | endpoint intent, root/platform binding, consumer/internal reason | API Contract Owner | accept into C02/C03 catalog or reject as orphan |
| Authority classification | authoritative/dependency/projection/platform/integration/derived class | Root Owner | approve authority boundary |
| Semantics classification | query/read/export/command/attachment/evidence/signature/linking/admin/integration | API Contract Owner + Workflow Owner | assign category and command/query policy |
| Request/response concept | prose-only request and response contract | API Contract Owner | enough for planning; not executable schema |
| Security and guard design | authz, SoD, idempotency, concurrency, problem families | Security/Compliance Lead | approve security posture or block |
| Evidence/event design | audit/evidence/signature/event effects | Evidence/Audit/e-Sign Lead + Integration/Data Lead | approve side effects or block |
| Frontend binding | route/screen region/state behavior | Frontend Consumer Owner | approve handoff |
| Observability binding | endpoint tags, trace/log/audit separation, SLO class | Observability/SRE Lead | approve telemetry |
| QA/validation export | traceability, stop rule, decision phrase, gaps | QA/Validation Lead | PASS / PASS_WITH_GAPS / BLOCKED |

## 6. Canonical endpoint families

C01 distinguishes these endpoint families for C02/C03:

| Family | Core purpose | Mutation? | Binding rule |
|---|---|---:|---|
| Collection | search, list, facets, saved views | No | root resource family + collection consumer |
| Read | record, summary, version/history | No | authoritative record shell or projection card consumer |
| Query | cross-record read model, analytics, data product | No | query model owner + source root lineage |
| Export/packet | export plan, release packet, evidence package | Usually no; may request export job | export scope + audit policy + data minimization |
| Workflow | workflow state/history and command initiation | Command rows mutate | every command must bind a transition |
| Attachment | list/download/upload-intent/link | upload/link are mutation-bearing | content policy + evidence/audit effect |
| Evidence | evidence list/link/unlink/verify | link/unlink/verify mutate evidence relation | evidence object type + retention + audit |
| Signature | list/request/status/challenge/meaning | request/challenge mutate signature workflow | signature meaning + signer authority + record snapshot |
| Linking | related-record list and link/unlink | link/unlink mutate relation graph | relationship type + source/target root authority |
| Admin | policy/config/reference data | may mutate platform authority | platform owner + change audit + rollback |
| Integration | inbound proposal, outbound event/subscription, health/CDC | may create proposal/event, not authority unless allowed | integration owner + replay/idempotency + security boundary |
| AI advisory | advisory read/proposal/rationale | no autonomous regulated mutation | human authority + trace/evaluation boundary |

Detailed rows are in `C01_ENDPOINT_TAXONOMY.csv`.

## 7. Wave 1/dependency roots available from V10 baseline

C02 is expected to use these as the first concrete root bindings. `DISP`, `ITEM`, `CUST`, `SUP`, and `MDEV` are dependency/projection-like in source and need extra authority clarification before command endpoints.

| Root | Name | Domain | Authority class | Resource family | Workflow archetype | Owner role |
|---|---|---|---|---|---|---|
| QUO | Quotation | D-01 Commercial & Customer | authoritative | quotations | Commercial Approval | Commercial Lead |
| CPO | Customer Purchase Order | D-01 Commercial & Customer | authoritative | customer-purchase-orders | Customer Commitment Intake | Commercial Lead |
| SO | Sales Order | D-01 Commercial & Customer | authoritative | sales-orders | Order Lifecycle | Commercial Lead |
| PO | Purchase Order | D-04 Procurement & Supplier Quality | authoritative | purchase-orders | Supplier Order Lifecycle | Procurement Lead |
| IREV | Item Revision | D-02 Product / Engineering | authoritative | item-revisions | Revision Effectivity | Engineering Lead |
| ECO | Engineering Change Order | D-02 Product / Engineering | authoritative | engineering-change-orders | Engineering Change Control | Engineering Lead |
| JO | Job Order | D-06 Shopfloor / MES Execution | authoritative | job-orders | Production Order Lifecycle | Production Lead |
| WO | Work Order | D-06 Shopfloor / MES Execution | authoritative | work-orders | Production Order Lifecycle | Production Lead |
| DISP | Dispatch Target / Dispatch Board | D-03 Planning & Production | dependency | dispatch-targets | Dispatch Projection Reanchor | TBD Domain Owner |
| PREC | Purchase Receipt | D-04 Procurement & Supplier Quality | authoritative | purchase-receipts | Receiving Lifecycle | TBD Domain Owner |
| LOT | Lot/Batch | D-05 Inventory & Logistics | authoritative | lots | Lot Lifecycle | Logistics Lead |
| INSP | Inspection | D-07 Quality Improvement (eQMS) | authoritative | inspections | Inspection Lifecycle | Quality Lead |
| NQCASE | Nonconformance Case | D-07 Quality Improvement (eQMS) | authoritative | nonconformance-cases | Nonconformance Lifecycle | Quality Lead |
| CAPA | Corrective and Preventive Action | D-07 Quality Improvement (eQMS) | authoritative | capas | CAPA Lifecycle | Quality Lead |
| BREL | Batch/Build Release | D-08 Traceability & Serialization | authoritative | releases | Batch Build Release Review | Quality Lead |
| CDOC | Controlled Document | D-07 Quality Improvement (eQMS) | authoritative | controlled-documents | Controlled Document Lifecycle | Document Control |
| TRAIN | Training Record / Qualification | D-10 Workforce & Training | authoritative | training-records | Training Record Lifecycle | TBD Domain Owner |
| MWO | Maintenance Work Order | D-09 Maintenance & EHS | authoritative | maintenance-work-orders | Maintenance Work Order Lifecycle | Maintenance Lead |
| ITEM | Item Master | D-02 Product / Engineering | dependency | items | Master Data Lifecycle | Product Lead |
| CUST | Customer Master | D-01 Commercial & Customer | dependency | customers | Master Data Lifecycle | TBD Domain Owner |
| SUP | Supplier Master | D-04 Procurement & Supplier Quality | dependency | suppliers | Supplier Master Lifecycle | Procurement Lead |
| EQP | Equipment | D-09 Maintenance & EHS | authoritative | equipment | Equipment Master Lifecycle | Maintenance Lead |
| MDEV | Measurement Device | D-09 Maintenance & EHS | dependency | measurement-devices | Metrology Device Lifecycle | TBD Domain Owner |

## 8. Authority and frontend binding policy

HESEM has two separate navigation authorities:

- Authoritative record shell: `/ops/records/{resource_family}/{record_id}?tab={tab}` is the UI surface for record truth and governed actions.
- Workspace projection: `/ops/{domain}/{module}/{workspace_family}` is a read/projection surface. It may display action launchers only when they re-anchor to the authoritative record shell and command contract.

API contract implications:

| UI route class | API behavior | Mutation allowance | Required consumer evidence |
|---|---|---:|---|
| Domain landing | collection/query/metrics summaries | No | domain landing card/alert/metric region |
| Module landing | collection/search/facets/workspace entry | No | module landing table/filter/action disabled state |
| Collection | collection search/facets/export-plan | No direct state mutation | collection table, filter rail, export drawer |
| Workspace projection | summaries, query, metrics, advisory | No direct mutation | projection reason and re-anchor link |
| Authoritative record shell | record, workflow, evidence, signature, audit, related, command | Yes, only through governed command endpoints | action rail, tab/region, disabled reason, problem behavior |
| Integration/internal | event/CDC/proposal/health | Controlled; usually proposal or event only | integration reason, replay policy, owning system |

## 9. Problem-detail operating model

C01 uses RFC 9457 principles at planning level. Each endpoint row must list problem-detail families, not free-text errors. Required problem metadata in planning prose:

| Problem dimension | Required policy |
|---|---|
| Type family | stable family such as auth, authorization, authority, workflow, evidence, signature, concurrency, validation, integration, rate-limit, unavailable, contract-version |
| Status class | expected HTTP status class and business meaning in prose |
| Instance/correlation | correlation identifier and endpoint category must be observable |
| Root/record context | include root/resource/record context when applicable and allowed by authz |
| Frontend behavior | disabled action, retry, re-anchor, ask-for-evidence, conflict resolution, permission-denied state, or fallback |
| Audit/evidence link | problem that blocks mutation must be auditable when it represents a workflow/evidence/security decision |
| Remediation | human-readable next step without leaking unauthorized object data |

Minimum problem families by category:

| Category | Required families |
|---|---|
| Read/query/collection | auth, authorization, query validation, not found/not visible, unavailable, rate-limit |
| Export/packet | auth, authorization, data minimization, export scope, unavailable, contract-version |
| Command | auth, authorization, workflow guard, evidence missing, signature required/meaning missing, concurrency/precondition, idempotency conflict, validation, unavailable |
| Attachment/evidence/signature | auth, authorization, content policy, evidence retention, signature meaning, workflow guard, concurrency, unavailable |
| Integration/CDC/event | auth, authorization, replay/idempotency, contract-version, integration unavailable, rate-limit, data minimization |
| AI advisory | auth, authorization, model unavailable, insufficient context, human-authority-required, data policy, hallucination guard failure |

## 10. Authz/security operating model

Security is not a generic role check. Every endpoint contract must declare:

1. Tenant boundary and environment/scope boundary.
2. Root family permission and operation intent.
3. Object-level authorization for record identifiers.
4. Property/field-level authorization for sensitive payload or response fields.
5. Function-level authorization for admin, signature, export, integration, and command endpoints.
6. Separation-of-duties policy for approvals, disposition, e-sign, regulated evidence, and critical admin changes.
7. Resource-consumption policy for export, query, event stream, integration, and AI endpoints.
8. Data minimization and redaction policy for cross-root query, packet export, and AI advisory.

## 11. Idempotency and concurrency operating model

| Endpoint category | Idempotency policy | Concurrency policy | Required response concept |
|---|---|---|---|
| Query/read/collection | not mutation-bearing; request hash may support caching and telemetry | snapshot/cursor/version read marker where useful | data plus record version/link metadata |
| Export/packet plan | request hash and audit/export plan identity when export creates a planned artifact | source snapshot/version boundary | export options, prerequisites, and scope warnings |
| Command | mandatory idempotency key per actor/root/record/command/payload intent | mandatory precondition/version/source-state policy | command accepted/applied/rejected state and problem detail on conflict |
| Evidence/link/signature/comment/admin | mandatory for mutation-bearing operations | version/precondition where record relation or policy can race | relation/signature/comment/policy result and audit id concept |
| Integration inbound | mandatory replay/idempotency key from source system plus HESEM correlation | source event version and deduplication window | proposal/inbound-event accepted/rejected concept |
| Event/CDC outbound | replay cursor, event id, subscription id | monotonic cursor and replay window | event batch/cursor and gap behavior |

## 12. Audit, evidence, e-sign and event behavior

Mutation-bearing endpoint rows must declare side effects explicitly:

| Side-effect class | Applies to | Required planning fields |
|---|---|---|
| Audit | all mutations; security/guard decisions; regulated reads/exports where applicable | actor, timestamp, route/source, prior/new state or relation, reason, evidence refs, signature meaning, correlation |
| Evidence | evidence link/unlink, attachment, inspection result, nonconformance, CAPA, release, training, maintenance, controlled documents | evidence type, object metadata, retention, source root, regulated impact, verification/void policy |
| e-Sign | approvals, release, disposition, controlled document, regulated training/evidence | signature meaning, signer role, record snapshot, challenge policy, SoD, audit trail |
| Event | all successful state-changing commands; integration proposal accept/reject; significant evidence/signature changes | event name family, producer, consumers, replay policy, correlation, root/record context |
| Notification | commands and events that require human follow-up | consumer role, inbox/escalation route, disabled-action reason |
| Operational Truth Graph edge | link/relation/genealogy/release/evidence edges | source root, target root, relation type, effectivity, audit/evidence references |

## 13. Versioning and deprecation policy

| Version surface | Policy |
|---|---|
| API major path version | C01 keeps the `/api/v{major}` planning grammar; exact standard/spec version is a gap for aggregator freeze. |
| Contract row version | every endpoint row must carry a contract version concept and change reason before C02/C03 handoff. |
| Event version | every event effect must define event family/version concept and replay behavior. |
| Problem family version | problem family names must remain stable; new types require API Contract Owner and Frontend Consumer Owner review. |
| Deprecation | deprecation must include consumer inventory, replacement endpoint, compatibility window, fallback, and stop-rule before removal. |
| Backward compatibility | response additions must not break consumers; response removals or semantic changes require major contract decision. |

OpenAPI version note: HESEM memory/V5/V10 source references OpenAPI 3.1.1-era planning, while current official OpenAPI publications include v3.2.0. C01 does not choose an executable OpenAPI target version; it records this as a standards-version freeze decision for later aggregator work.

## 14. Acceptance gates for C02/C03

C02/C03 endpoint cataloging may proceed only when every candidate row satisfies:

1. `api_family` and `endpoint_category` are assigned from C01 taxonomy.
2. `root_binding` points to a canonical root/resource family or a platform/integration owner.
3. `workflow_or_query_binding` is explicit.
4. Command rows include workflow transition/command name, guard/evidence policy, idempotency, concurrency, audit and event effect.
5. Read/query rows include consumer, authz, response concept, not-found/not-visible behavior, and observability tags.
6. Frontend consumer or internal/integration reason is present.
7. Problem-detail families are not empty.
8. Stop-rule is concrete enough to block implementation handoff.

## 15. Stop rules

C01 blocks or rejects endpoint planning rows when any of these appear:

- Endpoint described only as CRUD without root, workflow/query, consumer, authority, and problem policy.
- Command endpoint lacks workflow transition binding.
- Mutation endpoint lacks authz, idempotency, concurrency, audit and event policy.
- Workspace endpoint mutates without re-anchor to authoritative record shell.
- e-sign endpoint lacks signature meaning, signer authority or audit trail.
- Integration endpoint creates authority without explicit root owner approval.
- AI endpoint can execute a regulated or quality-impacting decision without human authority.
- Endpoint has generic “error” instead of problem families.
- Endpoint has no observability/correlation plan.
- Endpoint path/name suggests alias or duplicate root without canonical target.
- Any output attempts to generate OpenAPI YAML/JSON, schema code, backend code or frontend code.

## 16. Critical gaps carried forward

| Gap | Impact | Owner | Required repair action | C02/C03 effect |
|---|---|---|---|---|
| P0/A03 outputs not found | root baseline not frozen by V11 preflight in available output folder | Program/Aggregator | run or attach P0/A03 outputs; compare with V10 root catalog | C02 uses V10 baseline with `P0/A03 pending` note |
| B workflow outputs not found | command binding must rely on V10 workflow matrix/B01 assumptions | Workflow Owner | attach/run B01/Bxx outputs and reconcile command names | command rows marked pending final B binding |
| Repo verification skipped | current implementation state not asserted | User/API Contract Owner | only verify repo when user explicitly asks again | C01 remains planning-only and source-package grounded |
| OpenAPI version freeze | source memory references 3.1.1 while current official publication includes 3.2.0 | API Contract Owner/Aggregator | decide standards baseline in P0/Merge | no executable spec in C01; no blocker for taxonomy |
| V5/V7 executable-like examples | conflicts with V11 no-code rule | API Contract Owner | extract concepts only; do not copy YAML/JSON/JSON envelope examples | repaired in C01 by prose-only policy |

Decision phrase: `C01_API_CONTRACT_OPERATING_MODEL_READY_WITH_P0_B_BINDING_GAPS`.

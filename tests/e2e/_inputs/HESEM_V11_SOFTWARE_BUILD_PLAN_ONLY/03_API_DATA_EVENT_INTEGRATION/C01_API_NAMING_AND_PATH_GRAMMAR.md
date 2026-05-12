# C01 — API Naming and Path Grammar

Posture: planning-only. This file defines naming grammar and path-pattern prose. It does not create OpenAPI YAML/JSON, executable schemas, routes, controllers, or code.

## 1. Naming principles

| Principle | Rule | Gate | Stop rule |
|---|---|---|---|
| Contract-first | Every endpoint name/path must be backed by an endpoint taxonomy row and required-fields matrix row. | API Contract Owner review | Stop if endpoint is named before authority and consumer are known. |
| Root authority | Business record APIs use canonical `resource_family` from the root catalog. | Root Owner review | Stop if path uses alias root without canonical target. |
| Projection discipline | Workspace/query/analytics APIs are projections and must link back to authoritative record shells. | Frontend Consumer Owner review | Stop if workspace endpoint can mutate or hide authority. |
| Command clarity | Commands are named by business transition intent, not generic CRUD verbs. | Workflow Owner review | Stop if mutation is represented as generic update without workflow binding. |
| Version clarity | API major version and contract row version are separate planning concepts. | API Contract Owner review | Stop if semantic change lacks version/deprecation plan. |
| Security readability | Path naming must not imply access; authz is still object/property/function scoped. | Security/Compliance Lead review | Stop if path exposes unauthorized identifiers or field values. |

## 2. Resource-family grammar

Resource family names must be plural, lower-case, kebab-case, and sourced from the root catalog. Examples already present in V10 for Wave 1/dependency roots include:

| Root | Resource family | Notes |
|---|---|---|
| QUO | quotations | commercial root |
| CPO | customer-purchase-orders | commercial root |
| SO | sales-orders | commercial root |
| PO | purchase-orders | supplier/procurement root |
| IREV | item-revisions | engineering root |
| ECO | engineering-change-orders | engineering change root |
| JO | job-orders | MES execution root |
| WO | work-orders | MES execution root |
| DISP | dispatch-targets | dependency/projection-like dispatch root; command authority needs review |
| PREC | purchase-receipts | receiving root |
| LOT | lots | inventory/genealogy root |
| INSP | inspections | quality inspection root |
| NQCASE | nonconformance-cases | eQMS quality root |
| CAPA | capas | eQMS corrective/preventive action root |
| BREL | releases | batch/build release root |
| CDOC | controlled-documents | document control root |
| TRAIN | training-records | training/qualification root |
| MWO | maintenance-work-orders | maintenance root |
| ITEM | items | dependency root |
| CUST | customers | dependency root |
| SUP | suppliers | dependency root |
| EQP | equipment | equipment root |
| MDEV | measurement-devices | dependency/metrology root |

## 3. Path-pattern families

The grammar below is prose planning. It is not an executable API spec.

| Family | Path-pattern prose | Meaning | Command/query rule |
|---|---|---|---|
| Collection search | `/api/v{major}/{resource_family}` | search/list/filter authoritative collection | query only |
| Collection facets | `/api/v{major}/{resource_family}/facets` | filter metadata and allowed facet values | query only |
| Collection export plan | `/api/v{major}/{resource_family}/export-plan` | plan export scope, prerequisites, audit/minimization | query/planning only; export job requires separate command if later approved |
| Record read | `/api/v{major}/{resource_family}/{record_id}` | authoritative record read | query only |
| Record summary | `/api/v{major}/{resource_family}/{record_id}/summary` | compact summary for projections/cards | query only |
| Record versions | `/api/v{major}/{resource_family}/{record_id}/versions` | revision/effectivity/version history | query only |
| Workflow state | `/api/v{major}/{resource_family}/{record_id}/workflow` | current workflow state and allowed/blocked actions | query only |
| Workflow history | `/api/v{major}/{resource_family}/{record_id}/workflow/history` | transition timeline | query only |
| Command precheck | `/api/v{major}/{resource_family}/{record_id}/commands/{command_slug}/precheck` | guard preview and disabled-action reason | query only; must not mutate |
| Workflow command | `/api/v{major}/{resource_family}/{record_id}/commands/{command_slug}` | governed business transition | command/mutation; workflow binding mandatory |
| Evidence list | `/api/v{major}/{resource_family}/{record_id}/evidence` | evidence metadata list | query only |
| Evidence link plan | `/api/v{major}/{resource_family}/{record_id}/evidence/link-plan` | allowed evidence linking preview | query only |
| Evidence link command | `/api/v{major}/{resource_family}/{record_id}/commands/link-evidence` | governed evidence relation mutation | command/mutation |
| Attachment metadata | `/api/v{major}/{resource_family}/{record_id}/attachments` | attachment metadata list | query only |
| Attachment upload intent | `/api/v{major}/{resource_family}/{record_id}/attachments/upload-intent` | controlled upload planning/intent | mutation-bearing intent; evidence/content policy required |
| Signature list | `/api/v{major}/{resource_family}/{record_id}/signatures` | signatures and meanings | query only |
| Signature request plan | `/api/v{major}/{resource_family}/{record_id}/signatures/request-plan` | e-sign requirement and signer authority preview | query only |
| Signature request command | `/api/v{major}/{resource_family}/{record_id}/commands/request-signature` | governed signature request | command/mutation |
| Audit trail | `/api/v{major}/{resource_family}/{record_id}/audit` | audit trail read | query only; immutable audit source |
| Related records | `/api/v{major}/{resource_family}/{record_id}/related-records` | digital-thread/OTG relation read | query only |
| Related link command | `/api/v{major}/{resource_family}/{record_id}/commands/link-related-record` | governed relation mutation | command/mutation |
| Event history | `/api/v{major}/{resource_family}/{record_id}/events` | event timeline/replay planning | query only |
| Metrics summary | `/api/v{major}/{resource_family}/{record_id}/metrics-summary` or collection-level equivalent | KPI/metric read with lineage | query only |
| Comments list | `/api/v{major}/{resource_family}/{record_id}/comments` | comment read | query only |
| Add comment command | `/api/v{major}/{resource_family}/{record_id}/commands/add-comment` | governed comment creation | command/mutation; not audit substitute |
| AI advisory | `/api/v{major}/{resource_family}/{record_id}/ai-advisory` | bounded advice/proposal/rationale | query/advisory only; human acceptance is separate command |
| Packet plan | `/api/v{major}/{resource_family}/{record_id}/packet-plan` | release/evidence/audit packet prerequisites | query/planning only |
| Admin read | `/api/v{major}/admin/{policy_family}` | platform policy/config read | query only |
| Admin command | `/api/v{major}/admin/{policy_family}/commands/{command_slug}` | governed platform policy change | command/mutation |
| Inbound integration proposal | `/api/v{major}/integrations/{source_system}/{resource_family}/inbound-proposals` | external input as proposal/event | controlled proposal, not authority unless approved |
| Outbound subscription | `/api/v{major}/integrations/{subscriber}/subscriptions/{event_family}` | subscription/replay planning | query or governed subscription command depending row |
| CDC feed | `/api/v{major}/data/{feed_family}/changes` | data change feed with lineage | query/feed only |

## 4. Command slug grammar

Command slugs must be lower-case kebab-case and represent business intent. Examples: `submit`, `approve`, `close`, `void`, `record-containment`, `propose-disposition`, `verify-effectiveness`, `request-signature`, `link-evidence`, `link-related-record`.

Command slugs must be derived from workflow transition rows or an approved platform/admin command catalog. Do not create command slugs from button labels alone.

## 5. Identifier grammar

| Identifier | Planning rule | Stop rule |
|---|---|---|
| `tenant_id` concept | always implicit or explicit in auth boundary | stop if endpoint can cross tenant boundary |
| `record_id` | stable record identity for canonical root/resource family | stop if path creates/fabricates unknown alias ID |
| `resource_family` | plural kebab-case, root-catalog sourced | stop if not in root baseline or approved platform spine |
| `command_slug` | workflow/admin command intent | stop if no workflow/admin binding |
| `event_family` | event catalog family/version concept | stop if no producer/consumer/replay policy |
| `policy_family` | platform owner and versioned policy family | stop if platform owner missing |
| `feed_family` | data contract and source lineage owner | stop if source roots/lineage unknown |

## 6. Versioning grammar

| Version element | Rule | Gate |
|---|---|---|
| API path major | `/api/v{major}` remains the path planning convention | API Contract Owner |
| Contract row version | every endpoint row carries a version concept and change reason | API Contract Owner + QA/Validation Lead |
| Event version | every event effect carries event version concept and replay behavior | Integration/Data Lead |
| Problem family version | problem type/family names are stable and reviewed before change | API Contract Owner + Frontend Consumer Owner |
| Deprecation | every deprecation has consumer inventory, replacement, compatibility window, fallback and stop-rule | API Contract Owner + Consumer Owner |

OpenAPI version freeze is deliberately not decided here. Memory/V5/V10 references 3.1.1-era planning; current official publication includes 3.2.0. C01 uses OpenAPI principles only and records version freeze as an aggregator decision.

## 7. Anti-patterns blocked by C01

| Anti-pattern | Why blocked | Repair |
|---|---|---|
| `/api/v1/{resource}/{id}/update` generic update | hides workflow, evidence and command meaning | replace with command slug bound to workflow transition |
| `PATCH`-like partial mutation without command | uncontrolled mutation | create workflow command contract or reject mutation |
| workspace route launches direct mutation | hidden authority in projection | re-anchor to authoritative record shell and command endpoint |
| evidence upload without evidence type/retention | ungoverned evidence | add evidence catalog binding and audit policy |
| e-sign challenge without signature meaning | invalid regulated signature semantics | add signature meaning, signer authority and record snapshot |
| integration inbound directly creates root authority | external system becomes hidden authority | create inbound proposal workflow or explicitly approve authority boundary |
| AI accept/reject mutates record automatically | violates human authority boundary | AI proposes; human acceptance uses governed command |
| endpoint has generic error | frontend cannot show guard/permission/remediation | assign problem-detail families and frontend behavior |

## 8. Naming review checklist

Before C02/C03 accepts any endpoint row, the reviewer must answer:

1. Is `resource_family` canonical and traceable to root baseline?
2. Is endpoint category from `C01_ENDPOINT_TAXONOMY.csv`?
3. Is the path pattern consistent with command/query separation?
4. Does the path avoid alias roots, hidden authority and generic CRUD verbs?
5. Does the frontend consumer or internal/integration reason exist?
6. Does a command endpoint bind to workflow transition and guard/evidence policy?
7. Does a mutation endpoint declare idempotency, concurrency, audit, event and problem families?
8. Is the response concept safe for object/property authorization and data minimization?
9. Are observability tags sufficient for trace, metric, log and audit correlation?
10. Is the stop-rule concrete enough to block implementation handoff?

Decision phrase: `C01_NAMING_PATH_GRAMMAR_READY_FOR_ENDPOINT_CATALOG`.

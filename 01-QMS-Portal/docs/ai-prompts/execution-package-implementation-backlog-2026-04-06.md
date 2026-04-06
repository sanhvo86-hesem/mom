# Execution Package Implementation Backlog

Generated at: `2026-04-06`
Scope: ordered work backlog for `Foundation Governance Contract Slice`

## Workstream 01. Contract Authority

Objective:

- publish one authoritative slice contract surface

Outputs:

- `contracts/openapi/foundation-governance-v1.yaml`
- `contracts/json-schema/foundation-governance/*.schema.json`
- `contracts/problems/foundation-governance-problem-types.yaml`

Done criteria:

- all public slice routes are described
- all non-2xx problems are modeled
- concurrency headers are modeled
- blocked capabilities are explicit

## Workstream 02. Schema and Aggregate Hardening

Objective:

- align canonical slice tables and invariants with aggregate boundaries

Outputs:

- aggregate-to-table map
- invariant matrix
- DDL hardening plan for immutable evidence and concurrency-sensitive roots

Done criteria:

- aggregate ownership is unambiguous
- forbidden cross-aggregate writes are explicit
- evidence immutability rules are mapped to schema or service constraints

## Workstream 03. Command Service

Objective:

- implement canonical command handlers for the internal write surface

Outputs:

- organization command service
- party command service
- calendar command service
- approval request command service

Done criteria:

- commands are idempotent where required
- command validation is centralized
- stale writes fail cleanly

## Workstream 04. Workflow Bridge

Objective:

- bridge `approval_group` public behavior into workflow-owned transition execution

Outputs:

- decision bridge service
- signature requirement matrix
- transition test suite

Done criteria:

- no direct public status mutation remains
- self-approval prohibition is enforced
- delegation and substitution are audited
- bridge-ready blocker count for the chosen slice reaches `0`

## Workstream 05. Attachment and Evidence

Objective:

- harden immutable evidence behavior

Outputs:

- intake token service
- verification and bind service
- evidence hold and supersession model
- secure retrieval policy

Done criteria:

- verified evidence cannot be updated or deleted through public routes
- checksum and binding rules are enforced
- hold and supersession behavior is test-covered

## Workstream 06. Metadata Publication

Objective:

- publish buildable frontend contracts for the slice

Outputs:

- list, detail, timeline, attachment, and blocked-state metadata packs
- entity capability matrix
- related-list and search policy pack

Done criteria:

- every chosen-slice entity is either publishable or explicitly blocked
- unsupported actions never leak executable affordances
- frontend package is generated from authoritative slice metadata only

## Workstream 07. Projection and Async

Objective:

- publish ownership and operating rules for read models and async paths

Outputs:

- projection contract for `approval_queue`
- projection contract for `attachment_timeline`
- async contract if async is used

Done criteria:

- owner, trigger, lag budget, rebuild, and stale-read behavior are explicit
- compatibility async artifacts are excluded from canonical proof

## Workstream 08. Policy and Security

Objective:

- implement slice policy architecture to regulated quality

Outputs:

- ABAC attribute dictionary
- SoD policy set
- delegation and break-glass policy
- legal-hold and archive authority rules

Done criteria:

- subject, object, action, and environment attributes are documented
- policy decision points and enforcement points are named
- self-approval prohibition is tested

## Workstream 09. Observability

Objective:

- make the slice observable enough for rollout decisions

Outputs:

- OTel contract
- route span instrumentation
- worker span instrumentation
- metric dashboards
- structured audit log schema

Done criteria:

- supported routes emit traces and metrics
- correlation works across API and worker boundaries
- problem types and policy denials are measurable

## Workstream 10. Benchmark and Re-audit

Objective:

- produce admissible benchmark evidence and re-audit inputs

Outputs:

- benchmark charter
- benchmark data seeding pack
- benchmark results for supported paths
- Prompt 03 re-audit handoff package

Done criteria:

- benchmark overlap count is nonzero
- latency and contention thresholds pass
- re-audit inputs are complete and slice-scoped

## Execution Order

The required order is:

1. Workstream 01
2. Workstream 02
3. Workstream 03
4. Workstream 04
5. Workstream 05
6. Workstream 06
7. Workstream 07
8. Workstream 08
9. Workstream 09
10. Workstream 10

## Exit Condition

This backlog is complete only when:

- build-complete gates pass
- publish gates pass
- Prompt 03 re-audit closes without critical slice blocker
- Prompt 04 reconciliation upgrades the slice from `PUBLISH BLOCKED` to `REVIEW REQUIRED` or `GO`

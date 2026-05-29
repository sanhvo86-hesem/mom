# MDA V3 Runtime Blocker Policy

REPO_ROOT=/Users/a10/Documents/mom-mda-v3-runtime-20260529
PROMPT_ID=P23
DATE=2026-05-29

## Purpose

This policy converts V1/V2 controlled gaps into enforceable V3 runtime blockers. It is consumed by P24-P41 and prevents design-only artifacts from being treated as runtime authority evidence.

## Severity Rules

| Severity | Meaning | Allowed Progress |
|---|---|---|
| P0 | Blocks any runtime authority claim for the affected domain or platform capability. | No production-ready or runtime-authority claim. Dependent implementation prompts may run only to repair the blocker. |
| P1 | Blocks pre-production evidence, regulated-mode claim, cutover claim, or final runtime acceptance. | Implementation may proceed only with owner, evidence gate, and expiry. |
| P2 | Controlled debt not on an authority path. | May proceed with documented owner and non-authority scope. |

## Non-Negotiable P0 Classes

| Class | P0 Trigger | Owner Prompt |
|---|---|---|
| JSON-primary governed master data | Governed decision path still reads or writes JSON as primary without a verified migration bridge. | P27 |
| UOM/measurement ambiguity | UOM or conversion can be interpreted by local fields, defaults, or ungoverned conversion records. | P25 |
| Generic CRUD mutation risk | Any governed root can be created, updated, deleted, or transitioned outside domain command APIs. | P26/P31 |
| EngineeringReleasePackage not physical | SO/JO/WO release can proceed without one physical package root and member authority. | P30 |
| Canonical hold absence | Inventory, shipment, work order, or quality release can ignore a single governed hold chain. | P33 |
| Inventory balance without ledger proof | Stock, WIP, cost, or period-sensitive balance can be changed without immutable ledger and reconciliation proof. | P36 |
| ResourceReadinessService absence | MES release or start can proceed without one resource-readiness decision chain. | P34 |
| Runtime command coverage incomplete | Command catalog exists only as design and governed mutations do not resolve to command services. | P31 |

## P1 Classes

| Class | P1 Trigger | Owner Prompt |
|---|---|---|
| E-sign/audit generator absent | Regulated release, approval, override, or disposition lacks generated evidence parity and signature meaning. | P32 |
| Approval policy not canonical | Approval route, delegation, or SoD rules are not one runtime policy source. | P32 |
| Cutover and restore proof missing | PostgreSQL cutover lacks rehearsal, drift proof, restore drill, or fallback telemetry. | P29/P37 |
| Executable scenario runner absent | Acceptance scenarios are narrative-only or not tied to runtime command outcomes. | P38 |
| UI/projection authority ambiguity | Frontend can hide disabled reasons, freshness, lineage, or non-authority projection status. | P39 |
| Security/OT telemetry missing | Critical security, abuse-case, machine-signal, or audit failures are not observable. | P35/P37 |

## Temporary Exception Policy

P0 has no temporary exception for runtime-authority claims. P0 work may continue only as remediation work owned by the mapped prompt.

P1 may be controlled temporarily only when all fields exist:

| Required Field | Rule |
|---|---|
| owner_prompt | Must map to exactly one remediation prompt. |
| dependent_prompts | Must identify prompts blocked from final readiness. |
| acceptance_criterion | Must be executable or inspectable. |
| expiry_rule | Must define when the exception becomes a blocker again. |
| status | Must be open until evidence closes it. |

P2 may remain controlled only when it does not affect authority, mutation, release, hold, ledger, e-sign, cutover, or simulation proof.

## Stop Rules For Future Prompts

Future prompts must stop with `BLOCKED_RUNTIME_AUTHORITY_RISK` or `REPAIR_REQUIRED` if:

| Condition | Required Response |
|---|---|
| A P0 is downgraded without repo evidence. | Stop and repair classification. |
| A P0 is treated as a production exception. | Stop and reject readiness claim. |
| A P1 lacks owner, evidence gate, or expiry. | Stop and repair blocker register. |
| Runtime authority map contradicts the blocker policy. | Stop and update policy or map with evidence. |
| Scenario evidence remains narrative-only at final acceptance. | Stop before P41 final scorecard. |

## Current Summary

| Severity | Count | Meaning |
|---|---:|---|
| P0 | 15 | Runtime authority blockers open. |
| P1 | 52 | Preproduction, regulated-mode, cutover, UI, observability, or final-acceptance blockers open. |
| P2 | 4 | Benchmark/documentation refresh debt only. |

Decision token from P23:

```text
P23_PASS_WITH_CONTROLLED_GAPS
```

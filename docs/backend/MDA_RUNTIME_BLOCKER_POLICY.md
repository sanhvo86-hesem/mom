# MDA Runtime Blocker Policy

This file mirrors the P23 V3 runtime blocker policy so backend implementation prompts can reference a stable repository path. The detailed CSV evidence remains under `_reports/agent-audits/mda-v3-runtime-upgrade-2026-05-29/`.

## Severity Definitions

| Severity | Runtime Meaning |
|---|---|
| P0 | Blocks runtime authority claims. Dependent work may proceed only to repair the blocker. |
| P1 | Blocks pre-production evidence, regulated-mode claims, cutover claims, or final acceptance until an owner and evidence gate close it. |
| P2 | Controlled debt outside authority paths. It cannot affect mutation, release, hold, ledger, e-sign, cutover, or simulation proof. |

## Mandatory P0 Runtime Blockers

| Blocker | Owner Prompt |
|---|---|
| JSON-primary governed master data | P27 |
| UOM or measurement-conversion ambiguity | P25 |
| Generic CRUD mutation path for governed roots | P26/P31 |
| EngineeringReleasePackage not physical | P30 |
| Canonical hold authority absent | P33 |
| Inventory balance mutation without immutable ledger proof | P36 |
| ResourceReadinessService absent from MES release/start gates | P34 |
| Runtime command coverage incomplete for governed mutations | P31 |

## Mandatory P1 Runtime Blockers

| Blocker | Owner Prompt |
|---|---|
| E-sign, evidence, audit, or workflow generator absent for regulated mode | P32 |
| Approval policy, delegation, or SoD not canonical | P32 |
| PostgreSQL cutover lacks drift, restore, fallback, or rehearsal evidence | P29/P37 |
| Scenario runner remains narrative-only | P38 |
| UI hides projection freshness, disabled reasons, lineage, or non-authority state | P39 |
| Security, OT, audit, or data-quality failures lack telemetry and owner visibility | P35/P37 |

## Operating Rule

No prompt may claim runtime-complete, enterprise-ready, regulated-ready, or production-ready authority while any mapped P0 remains open. P1 gaps may be carried only with owner, expiry, and executable acceptance evidence.

Source artifact:

```text
_reports/agent-audits/mda-v3-runtime-upgrade-2026-05-29/MDA_V3_RUNTIME_BLOCKER_POLICY.md
```

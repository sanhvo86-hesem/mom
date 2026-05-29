# MDA V3 No Runtime No Claim Policy

REPO_ROOT=/Users/a10/Documents/mom-mda-v3-runtime-20260529
PROMPT_ID=P24
DATE=2026-05-29

## Purpose

This policy prevents design, schema, registry, or narrative simulation artifacts from being described as runtime authority.

## Maturity Levels

| Level | Name | Evidence Required |
|---|---|---|
| 0 | missing | No usable root definition or evidence. |
| 1 | design only | Root exists in taxonomy or report only. |
| 2 | schema partial | Table or registry exists but no complete runtime service and command proof. |
| 3 | service/read partial | Dedicated service or read path exists but mutation authority is incomplete. |
| 4 | API tested partial | API/read path and some tests exist but governed command mutation is incomplete. |
| 5 | controlled command runtime | Commands enforce preconditions and write audit/evidence/outbox with replay behavior. |
| 6 | staged operational proof | Runtime service passes scenario runner, reconciliation, rollback, telemetry, and failure drills. |
| 7 | production authority proven | No open P0/P1, restore drill complete, red-team rerun passes, monitored production evidence exists. |

## Claim Rules

| Claim | Minimum Evidence |
|---|---|
| `design_complete` | Level 1 with source artifacts. |
| `schema_present` | Level 2 with migration/table evidence. |
| `runtime_partial` | Level 3 or 4 with service/API evidence and tests. |
| `controlled_mutation` | Level 5 with command, transaction, audit, evidence, outbox, idempotency, and rollback/replay proof. |
| `staging_ready` | Level 6 with executable scenarios, reconciliation, telemetry, restore, and failure evidence. |
| `runtime_authority_ready` | Level 7 with no open P0/P1 and red-team closure. |

## Hard Bans

Do not claim runtime authority when:

| Condition | Reason |
|---|---|
| A root has only a table or registry entry. | Schema is not mutation authority. |
| A root has Generic CRUD write access but no domain command service. | Generic CRUD is not business authority. |
| JSON is primary for a governed decision path. | V3 requires PostgreSQL authority or a verified bridge. |
| Audit/evidence/outbox are missing from commands. | Mutation cannot be replayed or defended. |
| E-signature has no meaning, record hash, SoD, or re-auth proof. | Regulated-mode claim is unsupported. |
| Scenario evidence is narrative only. | Acceptance is not executable. |
| Cutover lacks restore and drift evidence. | PostgreSQL authority is not operationally safe. |

## Current P24 Result

No root is runtime-authority-ready. The highest current root score is 4 for `ROOT-EVD-001` because evidence services exist, but regulated generator and parity proof are still open P1 blockers.

P25-P41 must attach root evidence packs and may not raise maturity scores without repository evidence and test output.

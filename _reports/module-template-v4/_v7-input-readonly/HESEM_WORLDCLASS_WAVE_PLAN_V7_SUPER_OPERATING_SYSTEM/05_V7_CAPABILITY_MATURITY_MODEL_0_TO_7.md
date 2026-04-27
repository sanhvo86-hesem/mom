# 05 — Capability Maturity Model 0 to 7
## Maturity table

| Level | Name | Definition | Acceptance |
| --- | --- | --- | --- |
| 0 | Absent | No accepted artifact or feature surface exists | Backlog record only |
| 1 | Documented / planned | Scope, owner, root authority, risks and first contract documented | Planning acceptance |
| 2 | Fixture prototype | Fixture-backed UI/API contract exists; no backend mutation | Fixture parse + static guard |
| 3 | Current-portal-safe E2E prototype | Feature-flagged HMV4 surface passes E2E and no forbidden diff | E2E + forbidden guard + rollback |
| 4 | Opt-in live read-only API | Contracted live read API available with safe fallback | OpenAPI + problem details + live/fixture comparison |
| 5 | Controlled mutation | Command, workflow, audit, event, evidence, idempotency and rollback path implemented | Mutation command tests + audit/evidence tests |
| 6 | Pre-production validation package | Risk-based validation package complete for intended use | URS/RTM/IQ/OQ/PQ/VMP/restore rehearsal |
| 7 | Multi-site / verticalized / productized | Packaged for sites, roles, verticals, onboarding and commercial operation | Tenant/site rollout package + SRE + support model |

## Scoring policy

- Maturity applies to root, module, enterprise spine, data product, AI skill, API family, and wave.
- Score is not self-declared. It is assigned from evidence.
- A feature cannot skip from L2 to L5 unless intermediate gates are explicitly evidenced.
- Regulated feature cannot pass L5 without validation path defined; cannot pass L6 without validation report.

## Promotion evidence

| Promotion | Minimum evidence |
| --- | --- |
| 0→1 | scope contract, owner, authority root, risk class |
| 1→2 | fixture model, route/API/screen contract, static parse |
| 2→3 | current-portal-safe E2E, forbidden diff, rollback procedure |
| 3→4 | OpenAPI, safe fallback, opt-in live read-only, problem details |
| 4→5 | command contract, workflow guard, audit/evidence, idempotency, rollback |
| 5→6 | URS/RTM/IQ/OQ/PQ, validation plan/report, backup/restore |
| 6→7 | site/tenant onboarding, vertical pack, support/SRE, commercial model |

## Demotion rules

- Demote immediately if evidence cannot reproduce.
- Demote if live API becomes default without explicit approval.
- Demote if hidden mutation is found in workspace.
- Demote if e-sign/audit/rollback evidence missing after mutation implementation.

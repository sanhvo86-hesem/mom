# P31 Multi-Role Adversarial Audit

| Role | Challenge | Finding | Disposition |
|---|---|---|---|
| Runtime authority reviewer | Does P31 make all governed mutations command-authoritative? | No. It adds the shared envelope, route, idempotency, problem contract, and outbox retry semantics. Domain handlers remain incomplete. | Controlled P1 gap, not production-ready. |
| API contract reviewer | Can a client discover how to call command APIs without reading source? | Improved. OpenAPI now exposes `/api/v1/commands/{commandName}`, required headers, envelope schema, result schema, and ProblemDetail responses. | Pass for shared gateway; generated-contract parity remains P37/P40. |
| Reliability reviewer | Can retry double-execute a command? | Gateway delegates to existing replay ledger. Direct smoke and PHPUnit file cover deterministic replay and in-progress conflict. | Pass for gateway-level idempotency. |
| eQMS/audit reviewer | Are command audit/evidence records fully live? | Schema exists, but live PG writes are not wired in JSON_ONLY runtime and e-sign evidence is P32. | Controlled gap; no runtime-complete claim. |
| Security reviewer | Can Generic CRUD bypass this route? | P26/P29/P30 hard stops remain. P31 route is fail-closed if no handler is registered. | Risk reduced; domain handler allowlist still required. |
| SRE/outbox reviewer | Does outbox failure lose the command result? | Gateway returns result with `outbox_status=pending_retry` and error evidence instead of erasing success. | Pass for gateway behavior; worker/reconcile maturity remains P37. |
| Domain owner reviewer | Does the route mutate business state by accepting arbitrary command names? | No. The controller returns `domain_command_handler_not_registered` until an owning domain registers a handler. | Pass; avoids unsafe generic mutation authority. |

## Re-Audit Result

P31 is a valid runtime spine improvement but not a final domain-command factory. It may unlock P32 because e-sign/workflow/approval can now attach to a common command envelope, but P0 command coverage is only partially repaired until concrete handlers exist for item/revision, party, engineering release, quality hold, readiness, and inventory.

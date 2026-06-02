# MDA Authority Index

Decision scope: pre-production runtime-closure candidate. A separate validation package is required before regulated deployment claims.

## Authority Paths

| Surface | Classification | Authority rule |
|---|---|---|
| `mom/api/services/DomainCommand/DomainCommandGateway.php` | KEEP | Only governed mutation admission path. Sets DB command context inside the transaction. |
| `mom/api/controllers/DomainCommandController.php` | KEEP | Derives actor identity, permissions, and scope from authenticated server context. Client actor claims are rejected. |
| `mom/database/migrations/286_mda_runtime_authority_no_p0p1_guard.sql` | IMPLEMENT | Default-deny DB guard for governed tables plus SoD and re-auth evidence stores. |
| `mom/api/services/MasterDataService.php` | REWRITE | Legacy mutation methods fail closed with `domain_command_required`; read projection paths remain. |
| `mom/api/services/PostgresMasterDataRepository.php` | KEEP | PG_ONLY governed reads use PostgreSQL authority or fail closed. JSON is not runtime authority. |
| `mom/data/authority/workflow-status-authority.yaml` | IMPLEMENT | Canonical governed workflow/status source. |
| `mom/data/authority/governed-root-registry.yaml` | IMPLEMENT | Governed root storage, command, evidence, and projection map. |
| `mom/scripts/portal/13-master-data-control.js` | MERGE | Frontend workspace is projection-only and requires reanchor for mutation. |
| `_reports/mda_runtime_authority_closure/*` | KEEP | Gate and proof evidence for this repair branch. |

## Projection Paths

JSON, OpenAPI, dashboards, workspace JS, and reports are read models or contracts. They must not become business authority. Mutation must go through `DomainCommandGateway` or return `domain_command_required`.

# MDA Runtime Authority Gates

Decision scope: pre-production runtime-closure candidate.

| Gate | Command | Purpose |
|---|---|---|
| Runtime authority aggregate | `php mom/scripts/check_mda_runtime_authority_gate.php` | Aggregates static authority checks and executable sub-gates. |
| Adversarial security | `php mom/scripts/check_mda_adversarial_security_gate.php` | Actor/role spoof, payload SoD, timestamp-only re-auth, AI regulated action denial. |
| DB guard | `php mom/scripts/check_mda_direct_db_guard.php` | Default-deny migration, command DB context, no delete-all projection rewrites, PG_ONLY reads. |
| Workflow parity | `php mom/scripts/check_mda_workflow_status_parity.php` | Required roots, ISA-95 category/owner/command/event fields, projection workspace markers. |
| Traceability performance | `php mom/scripts/check_mda_traceability_performance.php` | Deterministic synthetic trace baseline, cursor continuation, service/index proof. |

## Problem Details

Denials use `application/problem+json` with `type`, `title`, `status`, `detail`, `instance`, `code`, and `correlation_id`. Command-specific responses include `command_name` when available.

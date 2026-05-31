# P50 Security Boundary Runtime Closure Report

Date: 2026-05-31  
Branch: `codex/mda-v4-implementation-closure-recovery-20260530`  
Decision token: `P50_PASS_WITH_CONTROLLED_GAPS`

## 1. EXECUTIVE DECISION

P50 wires a fail-closed security boundary into `DomainCommandGateway` before idempotency execution and before any domain handler can mutate state. The gateway now enforces AI actor firewall, BOLA/site/plant scope, sensitive property authorization, SoD, privileged re-authentication, and OT trust evidence for governed command envelopes.

This does not claim whole-platform security closure. Legacy non-gateway routes still need command-by-command migration/proof in later prompts, and full PHPUnit/PHPStan remain blocked by missing local vendor binaries.

## 2. SOURCE TRUTH AUDIT

- P49 established `DomainCommandGateway` and `CommandRegistry` as the governed command admission point.
- `CommandRegistry` already marks regulated commands with `regulated_action=true`, which is now used by re-authentication and SoD policy.
- Existing `audit_events` schema supports command security denial telemetry; P50 writes denial events directly there.
- AGENTS policy forbids AI from silently mutating execution truth; P50 blocks AI actors from governed domain commands.

## 3. RUNTIME EVIDENCE PROBE

| Probe | Result |
|---|---|
| PHP lint for all P50 services/tests | PASS |
| BOLA/site mismatch manual probe | PASS: `object_scope_denied`, audit event count `1` |
| AI actor manual probe | PASS: `ai_governed_action_forbidden`, audit event count `1` |
| Missing re-auth manual probe | PASS: `reauth_required`, audit event count `1` |
| Unit coverage added | PASS: BOLA, property auth, AI firewall, SoD, reauth, OT trust |
| `composer --working-dir=mom run test` | BLOCKED: missing `vendor/bin/phpunit` |
| `composer --working-dir=mom run analyse/check` | BLOCKED: missing `vendor/bin/phpstan` |

Manual probe output:

```json
{"bola":["object_scope_denied",1],"ai":["ai_governed_action_forbidden",1],"reauth":["reauth_required",1]}
```

## 4. DESIGN / IMPLEMENTATION DELTA

- Added `SecurityBoundaryMiddleware` and wired it into `DomainCommandGateway`.
- Added `AIActorFirewall`, `ObjectAuthorizationPolicy`, `PropertyAuthorizationPolicy`, `SoDPolicy`, `PrivilegedReauthPolicy`, and `OTTrustPolicy`.
- Security boundary executes after command registry/actor/permission checks and before implementation status, idempotency replay, or handler execution.
- Denials are written to `audit_events` as `domain_command.security_denied`. If denial audit write fails, the gateway returns `security_denial_audit_failed` instead of hiding the denial.
- Engineering package SoD can use persisted `engineering_release_package.created_by` when caller payload omits originator fields.

## 5. FILES EDITED

- `mom/api/services/DomainCommand/DomainCommandGateway.php`
- `mom/api/services/DomainCommand/SecurityBoundaryMiddleware.php`
- `mom/api/services/DomainCommand/AIActorFirewall.php`
- `mom/api/services/DomainCommand/ObjectAuthorizationPolicy.php`
- `mom/api/services/DomainCommand/PropertyAuthorizationPolicy.php`
- `mom/api/services/DomainCommand/SoDPolicy.php`
- `mom/api/services/DomainCommand/PrivilegedReauthPolicy.php`
- `mom/api/services/DomainCommand/OTTrustPolicy.php`
- `mom/tests/Unit/Services/DomainCommandGatewayTest.php`
- `mom/tests/Unit/Services/DomainCommandSecurityBoundaryTest.php`

## 6. FILES FORBIDDEN OR HIGH-RISK

- Generic CRUD must not call command internals.
- UI/workspace must not provide trusted security requirements such as `require_reauth=false`.
- AI/copilot routes must not be granted domain command mutation authority.
- OT adapter signals must remain evidence inputs unless they carry trusted adapter, mapping, timestamp, and replay nonce evidence.

## 7. OPERATIONAL SIMULATION MATRIX

| scenario_id | initial_state | actor | command/action | expected_gate | data_written | event_written | rollback/retry | expected_result | failure_if_missing | test_to_add |
|---|---|---|---|---|---|---|---|---|---|---|
| V4-SIM-050-001 | Actor scoped to SITE-A | Planner | Release package for SITE-B | BOLA object scope | none | `domain_command.security_denied` | no-op | 403 `object_scope_denied` | cross-site release | unit/manual present |
| V4-SIM-050-002 | AI actor has command permission | AI copilot | Release quality hold | AI firewall | none | denial audit | no-op | 403 `ai_governed_action_forbidden` | AI mutates quality truth | unit/manual present |
| V4-SIM-050-003 | Operator writes cost field | Operator | Create item with `standard_cost` | property authorization | none | denial audit | no-op | 403 `property_authorization_denied` | unauthorized cost mutation | unit present |
| V4-SIM-050-004 | Package created by same actor | Originator | Approve package | SoD policy | none | denial audit | no-op | 403 `sod_violation` | self-approval | unit present |
| V4-SIM-050-005 | Regulated command lacks recent reauth | QE | Release package | re-auth policy | none | denial audit | no-op | 409 `reauth_required` | stale session release | unit/manual present |
| V4-SIM-050-006 | OT event without trust packet | Adapter/operator | Complete operation | OT trust policy | none | denial audit | no-op | 409 `ot_trust_required` | spoofed machine event | unit present |
| V4-SIM-050-007 | Denial audit write fails | System | Any denied command | audit observability | none | none | fail closed | 500 `security_denial_audit_failed` | invisible denial | add DB failure test in P58 |

## 8. MULTI-ROLE ADVERSARIAL AUDIT

| Role | Attack | Result |
|---|---|---|
| UI developer | Sends `require_reauth=false` | Ignored; server registry uses `regulated_action` |
| Planner | Uses valid permission on another site | Blocked by BOLA policy |
| AI copilot | Calls governed release command with permission | Blocked by AI firewall |
| Originator | Approves own engineering package | Blocked by SoD policy |
| Operator | Hides cost write inside nested payload | Blocked by recursive property policy |
| OT adapter | Emits operation completion without trust packet | Blocked by OT trust policy |

## 9. GAP LEDGER UPDATE

See `V4_P50_GAP_LEDGER_UPDATE.csv`.

## 10. ROLLBACK / RECOVERY PLAN

- Revert the P50 commit to remove security middleware wiring.
- Existing P49 registry remains fail-closed for unimplemented commands.
- If denial audit insert causes runtime incompatibility in a target environment, keep the gateway route disabled until `audit_events` schema is restored because invisible security denials are not acceptable.

## 11. FINAL RE-AUDIT

P50 closes the gateway-level security blocker for governed domain commands. Residual risk remains in legacy non-gateway route surfaces and in the missing local validation dependencies. These are not downgraded; they are carried forward to P55/P58/P60.

## 12. DECISION TOKEN

P50_PASS_WITH_CONTROLLED_GAPS

## 13. HANDOFF PACKET FOR NEXT PROMPT

P51/P56 must extend this security boundary into evidence, e-signature meaning, record hash, authority checks, and signature verification. P55/P58 must prove legacy routes cannot bypass the gateway or equivalent fail-closed controls.

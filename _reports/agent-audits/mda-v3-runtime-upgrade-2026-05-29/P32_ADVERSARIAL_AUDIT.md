# P32 Multi-role Adversarial Audit

## Manufacturing operations lead

- Finding: P32 blocks regulated release evidence but does not wire WO release/start to the gate.
- Severity: P1.
- Runtime risk: Shopfloor release could still bypass package/e-sign evidence until P34 wires domain handlers.
- Required repair: P34 must invoke this gate from ResourceReadinessService/WO release handlers.
- Acceptance evidence: WO release/start tests fail when signature/audit/readiness evidence is missing.

## Master data architect

- Finding: Policy tables are physicalized, but generated registry/table-registry parity is not refreshed.
- Severity: P1.
- Runtime risk: DB/PHP/UI/OpenAPI drift can hide stale status and command metadata.
- Required repair: P37/P40 generated contract refresh and parity check.
- Acceptance evidence: generated artifacts match `regulated_command_policy` and workflow/status registry.

## Quality/eQMS lead

- Finding: E-sign meaning/hash/reauth/SoD gate is now enforced at service level, but live quality hold release handler is still absent.
- Severity: P1.
- Runtime risk: Quality hold release may remain fragmented until P33.
- Required repair: P33 canonical quality hold command must call P32 gate before release.
- Acceptance evidence: QualityHold.Release fails without signature meaning, consumed challenge, authoritative audit, and SoD separation.

## MES/shopfloor lead

- Finding: Engineering release and item revision policy exists, but no MES snapshot consumption has been wired.
- Severity: P1.
- Runtime risk: Operators can receive stale package state if WO snapshots do not bind to signed release evidence.
- Required repair: P34 must bind WO release/start to signed engineering package evidence.
- Acceptance evidence: WO start test rejects stale package hash or missing signature event link.

## Inventory/finance controller

- Finding: Inventory adjustment approval action is allowlisted for e-sign challenge, but no inventory policy row or ledger handler exists yet.
- Severity: P1.
- Runtime risk: Regulated stock/cost adjustments remain outside this gate until P36.
- Required repair: P36 must add inventory/cost policies and ledger-only adjustment command tests.
- Acceptance evidence: inventory adjustment cannot post without approval/e-sign/audit evidence.

## Security/SoD reviewer

- Finding: Same actor is blocked unless an approved, reasoned, unexpired exception is supplied; exception lifecycle is not yet a governed workflow.
- Severity: P1.
- Runtime risk: If exceptions are free-form, emergency overrides are not defensible.
- Required repair: P37/P40 must govern SoD exception records and telemetry.
- Acceptance evidence: exception create/approve/expire/revoke commands with audit and e-sign tests.

## SRE/cutover reviewer

- Finding: P32 requires authoritative audit availability, but current runtime audit reports JSON_ONLY and PostgreSQL not configured/reachable.
- Severity: P1.
- Runtime risk: No production/PostgreSQL-primary claim is defensible.
- Required repair: P37/P40 live PG audit/outbox integration, replay drill, restore drill, and alerting.
- Acceptance evidence: restore drill and audit-write failure tests pass in POSTGRES_PRIMARY/POSTGRES_ONLY mode.

## Frontend/operator UX reviewer

- Finding: Gate reasons are machine-readable, but no operator-facing disabled action/evidence panel contract is updated in P32.
- Severity: P2.
- Runtime risk: Users may see generic failures instead of actionable missing evidence.
- Required repair: P39/P40 should map P32 reason codes to disabled action copy and evidence checklist.
- Acceptance evidence: UI smoke shows missing meaning, SoD, audit, and replay reasons clearly.

## External auditor/red-team reviewer

- Finding: P32 improves runtime proof, but does not claim 21 CFR Part 11 compliance because validation package and live audit trail evidence are not complete.
- Severity: P1.
- Runtime risk: Overclaiming compliance would be misleading.
- Required repair: Keep language to runtime-proof/pre-production readiness until validation, retention, access control, audit, and signature-link evidence is complete.
- Acceptance evidence: validation package references live signature records with signer identity, timestamp, meaning, record hash, and linked audit trail.

## Repair pass

Repairs applied before final token:

- Added database SHA-256 check to `regulated_command_signature_event_link.record_hash_sha256`.
- Added `actor_user_id` to SoD creator detection so P31 command envelopes are not missed.
- Added required P32 simulations as PHPUnit test methods plus direct PHP smoke.

Residual issues are not hidden: live domain handlers, generated registry parity, telemetry, and POSTGRES_PRIMARY cutover remain assigned to later prompts.

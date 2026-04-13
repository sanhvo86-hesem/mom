# Security And Regulatory Hardening Spec

This spec covers backend security, regulated audit/evidence, e-signature, and OT/machine security. It does not assess frontend design.

## Current Findings

| Area | Runtime finding | Gap |
| --- | --- | --- |
| Session | `AuthMiddleware` enforces idle timeout; config default 14400 seconds. | No absolute session lifetime found. |
| TOTP | `totp_verify()` accepts valid window code; no used time-step replay store found. | TOTP replay protection missing for regulated e-signature. |
| CSRF | Mutation endpoints generally call CSRF or middleware policies. | Command contract must make CSRF explicit for browser sessions. |
| Upload | `UploadHardeningService` quarantines, blocks dangerous extensions, checks mime/signature/hash. | Needs antivirus/content scanning hook and evidence linkage for regulated records. |
| Audit | API middleware logs request summaries; `AuditTrail` has hash-chain events. | Must unify command audit and Part 11 audit evidence. |
| Evidence | `EvidenceVaultService` hash-chains and links evidence. | Must require evidence for regulated gates and verify chain. |
| E-signature | Workflow/audit fields exist; no common command-level e-sign service with re-auth and TOTP replay. | Part 11 gap. |
| RBAC/SoD | Roles/permissions exist in controllers/config. | Segregation-of-duties policy not centrally enforced. |
| OT | MTConnect adapter identity/endpoint exists. | Zones/conduits, connector credentials, quality code, immutable raw event integrity incomplete. |

## Session Policy

Required controls:

- Idle timeout: configurable, default no more than 4 hours for ordinary sessions.
- Absolute session lifetime: configurable, default no more than 12 hours; shorter for privileged/admin.
- Re-authentication for:
  - e-signature.
  - role escalation.
  - destructive admin operation.
  - finance period close/backdate.
  - MRB use-as-is/scrap/release hold.
- Session rotation after login, MFA completion, and privilege change.
- Audit logout/session expiry reason.

Required migration/update:

- Add `session_started_at`, `last_reauth_at`, `auth_strength`, `absolute_expires_at` to session context or server-side session store.
- Middleware rejects session after absolute expiry even if active.

## TOTP Replay Protection

`CreateElectronicSignature` and MFA completion must prevent reuse of a TOTP code/time-step for the same user.

Required store:

- `totp_replay_guard_id`
- `user_id`
- `totp_time_step`
- `purpose`: login, e_signature, reauth
- `used_at`
- `correlation_id`
- Unique `(user_id, totp_time_step, purpose)` for regulated signing; login may allow policy-specific grace only if not signing.

Acceptance:

- Same TOTP code cannot sign two MRB dispositions in same time-step.
- Replay attempt writes security audit event.

## Role Escalation And Segregation Of Duties

Central SoD policy must block:

- Quote creator approving own high-risk commercial exception without override.
- NCR originator approving final MRB disposition if policy requires independent QA.
- Buyer creating PO and approving payment release alone.
- Receiver performing IQC approval if independence required.
- AP clerk posting invoice and approving payment.
- Admin repairing data without second approval/evidence for regulated records.

Every SoD exception requires:

- Temporary override record.
- Expiry.
- Reason.
- Approver.
- E-signature.
- Post-event review.

## Upload Hardening

Current quarantine/mime/signature/hash logic should be retained. Add:

- Antivirus or malware scanning hook.
- Document macro policy for Office files.
- Content disarm or viewer isolation where applicable.
- Evidence vault link after acceptance.
- Retention class and record owner.
- Prohibit direct execution/serving from upload directories.
- Audit every accept/reject/release.

## CSRF Policy

- Browser-session mutations require `X-CSRF-Token`.
- Token rotation on login/logout/reauth.
- API clients using service credentials must use signed client auth instead of browser CSRF.
- CORS must stay allowlist-only.

## Part 11 E-Signature Policy

Electronic signature must include:

- Signer user ID and display name at time of signature.
- Signature meaning: approval, review, rejection, witness, release, disposition, override.
- Reason/comment.
- Re-auth method and timestamp.
- Record type/id and immutable record hash before signature.
- Command/correlation/idempotency key.
- Linked audit event.
- Optional evidence package.

Signature must be invalid if target record changes before command commit unless command recomputes and signs final hash.

## Audit Trail Hash Chain

Required:

- Command audit hash chain by aggregate and global sequence.
- Evidence vault hash chain verification job.
- API audit correlation ID.
- No update/delete to audit events.
- Export tool for auditor package: command, record, evidence, signature, outbox, before/after state.

Acceptance:

- Tampering with an audit JSONL/PG event is detected by verification job.
- Command replay returns same audit event reference without duplicate side effect.

## Evidence Retention

Every regulated record must define:

- Retention period.
- Legal hold flag.
- Record owner.
- Evidence classification.
- Export package format.
- Destruction policy requiring approval and audit.

## OT Security Zones/Conduits

Machine connectivity must follow NIST SP 800-82 and ISA/IEC 62443:

- Define zones: enterprise IT, DMZ/integration, shop-floor MES, machine cell, vendor remote access.
- Define conduits: MTConnect polling, OPC-UA session, DNC/program transfer, ERP sync.
- Each adapter has identity, credential, certificate/TLS policy, allowed endpoint, and rotation schedule.
- Store source timestamp, receive timestamp, quality code, adapter ID, and raw payload hash.
- Raw machine events are append-only and replayable.
- Derived production events are idempotent projections.
- Network failure uses store-and-forward with sequence/replay protection.

## Machine Connector Identity

Required fields:

- `adapter_id`
- `machine_id`
- `connector_type`: mtconnect, opcua, dnc, manual_bridge
- `endpoint_url`
- `credential_ref`
- `certificate_thumbprint?`
- `zone_id`, `conduit_id`
- `heartbeat_sla_seconds`
- `payload_schema_version`
- `last_validated_at`
- `status`

Acceptance:

- Event ingestion rejects inactive/unknown adapter.
- Replay/stale source timestamp is rejected or quarantined.
- Raw event hash is stored before derivation.

## Security Tests

| Test ID | Scenario | Expected result |
| --- | --- | --- |
| SEC-001 | Session idle exceeds configured timeout | Request rejected `session_expired`. |
| SEC-002 | Session exceeds absolute lifetime | Request rejected even with recent activity. |
| SEC-003 | Reuse same TOTP for two e-signatures | Second signature rejected and audited. |
| SEC-004 | MRB disposition without re-auth signature | Command rejected. |
| SEC-005 | AP clerk posts and approves payment | SoD policy rejects unless valid override. |
| SEC-006 | Upload PHP/JS/SVG payload | Quarantine rejects. |
| SEC-007 | Tamper with evidence hash | Verification job fails. |
| SEC-008 | Unknown MTConnect adapter sends event | Ingestion rejected/quarantined. |


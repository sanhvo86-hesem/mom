# P51 Regulated Evidence, Audit Trail, and E-signature Runtime Closure Report

Date: 2026-05-31
Branch: `codex/mda-v4-implementation-closure-recovery-20260530`
HEAD at implementation: `472002c51a00bed5fdf7f5a16b008d1366f286cd`
Decision token: `P51_PASS_WITH_CONTROLLED_GAPS`

## 1. EXECUTIVE DECISION

P51 wires regulated evidence and e-signature runtime gates into `DomainCommandGateway`. Regulated commands now require a server-side policy, fail closed when required signature meaning/hash/challenge evidence is missing or invalid, consume one-time signature challenges before mutation, persist `signature_events`, write immutable command evidence links, and expose signature manifestation retrieval.

This is pre-production runtime-readiness evidence, not a validated production claim. Local PHPUnit/PHPStan remain blocked by missing vendor binaries, and legacy non-gateway routes still need P55/P58 bypass proof.

## 2. SOURCE TRUTH AUDIT

- Branch: `codex/mda-v4-implementation-closure-recovery-20260530`.
- Existing authority tables found: `signature_events`, `e_signature_auth_challenges`, `audit_events`, EQMS evidence package tables, and immutable signature/evidence triggers.
- Existing evidence services found: `MOM\Services\Evidence\ElectronicSignatureChallengeService`, `ElectronicSignatureService`, and `EvidenceFinalizationService`.
- User identity SSOT reviewed: no new user/employee table was created; signer identity references remain `users` / `v_user_canonical` compatible.
- Latest new migration: `275_regulated_domain_command_evidence_spine.sql`.

## 3. RUNTIME EVIDENCE PROBE

| Probe | Result |
|---|---|
| PHP lint for P51 services/controller/tests | PASS |
| Manual missing signature probe | PASS: `signature_evidence_required`, audit count `1` |
| Manual displayed hash mismatch probe | PASS: `signature_displayed_record_hash_mismatch`, audit count `1` |
| Manual successful ceremony probe | PASS: `signature_event=sig-1`, `evidence_link=link-1`, manifestation returned |
| User identity SSOT guard | PASS: `user identity ssot clean` |
| `git diff --check` | PASS |
| `composer --working-dir=mom run test` | BLOCKED: missing `vendor/bin/phpunit` |
| `composer --working-dir=mom run analyse/check` | BLOCKED: missing `vendor/bin/phpstan` |

Manual probe output:

```json
{"missing_signature":["signature_evidence_required",1],"display_hash_mismatch":["signature_displayed_record_hash_mismatch",1],"success":["sig-1","link-1","sig-1",1]}
```

## 4. BLOCKER / GAP MAP

| Gap | Severity | Status |
|---|---|---|
| Regulated action policy missing | P0 | Closed for gateway commands by `RegulatedActionPolicy`; missing policy throws `regulated_action_policy_missing` |
| Signature lacks meaning | P0 | Closed: `signature_meaning_required` / `signature_meaning_not_allowed` |
| Signature not linked to record hash | P0 | Closed: signed and displayed hashes must match server canonical command hash |
| Audit/evidence store unavailable | P0 | Closed for gateway path: audit/evidence exceptions block command |
| Signature challenge expired/replayed | P0 | Closed: challenge preflight checks state/expiry and consume is one-time |
| Legacy routes bypass gateway | P1 | Open for P55/P58 route-by-route proof |
| Local validation dependencies | P1 | Blocked: missing `vendor/bin/phpunit` and `vendor/bin/phpstan` |

## 5. DESIGN DELTA

- `RegulatedActionPolicy` defines command/root/risk/signature/meaning/SoD/re-auth/evidence/retention posture for all registered regulated commands.
- `CommandRecordHasher` creates a server-side canonical record hash excluding signature and re-auth envelopes.
- `SignatureChallengeService` issues and validates server-authoritative one-time challenges against `e_signature_auth_challenges`.
- `ElectronicSignatureService` validates meaning, signer identity snapshot, auth proof, displayed hash, signed payload hash, and persists `signature_events`.
- `AuditEvidenceWriter` writes block/attempt/link audit records and immutable `domain_command_evidence_links`.
- `RegulatedCommandEvidenceSpine` orchestrates preflight, signature consumption, evidence link, and audit around the command handler.
- `SignatureManifestationService` retrieves name/ref, timestamp, meaning, manifestation, hashes, and evidence link for record shells/export.

## 6. IMPLEMENTATION PLAN

1. Reuse existing e-sign/audit/evidence tables instead of creating a second authority.
2. Add policy and command evidence link schema.
3. Insert P51 preflight before idempotency/handler.
4. Wrap signature consumption, handler mutation, and evidence link in the gateway operation transaction.
5. Add challenge issue and manifestation read APIs.
6. Add tests and manual probes for required P51 failure modes.

## 7. FILES TO EDIT

- `mom/api/services/DomainCommand/*`
- `mom/api/controllers/DomainCommandController.php`
- `mom/api/routes/rest-routes.php`
- `mom/api/openapi.yaml`
- `mom/database/migrations/275_regulated_domain_command_evidence_spine.sql`
- `mom/tests/Unit/Services/DomainCommandRegulatedEvidenceSpineTest.php`
- `mom/tests/Unit/Services/DomainCommandGatewayTest.php`
- `.ai/*`

## 8. FILES FORBIDDEN OR HIGH-RISK

- Do not create new user identity tables or write directly to `users`, `employees`, `hcm_employees`, or `users.json`.
- Do not accept caller-provided record hash as authority; hash must be recomputed server-side.
- Do not let signature challenge issuance imply mutation authority.
- Do not consume a challenge outside the command transaction for successful mutations.
- Do not let Generic CRUD mutate signature/evidence records.

## 9. CODE / SCHEMA / CONTRACT CHANGES

- New tables: `regulated_action_policy`, `domain_command_evidence_links`, `regulated_action_validation_protocol`.
- `domain_command_evidence_links` is immutable via `eqms_prevent_update_delete()`.
- New APIs:
  - `POST /api/v1/domain-commands/signature-challenges`
  - `GET /api/v1/domain-commands/signature-manifestations`
- `DomainCommandGateway` now returns `regulated_evidence` metadata on successful regulated commands.

## 10. TEST PLAN

- Unit test file added for missing signature, expired challenge, replayed challenge, displayed hash mismatch, audit unavailable, successful manifestation/evidence link.
- Existing gateway test adjusted to avoid treating P49 idempotency replay as signature coverage.
- Full PHPUnit/PHPStan must be rerun when dependencies are restored.

## 11. OPERATIONAL SIMULATION MATRIX

| scenario_id | name | initial_state | actor | command_or_action | authoritative_reads | expected_gate | expected_writes | expected_events | expected_audit_evidence | expected_problem_details_if_blocked | rollback_retry_expectation | telemetry_expectation | test_to_add | gap_if_fails |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| V4-SIM-051-001 | missing meaning | Released item revision command submitted without signature evidence | QE | `ReleaseItemRevisionCommand` | `RegulatedActionPolicy` | signature evidence gate | none | none | `domain_command.regulated_blocked` | `signature_evidence_required` | no mutation | audit denial count | unit/manual present | unsigned release |
| V4-SIM-051-002 | expired challenge | Challenge exists but expired | QE | release item revision | `e_signature_auth_challenges` | expiry gate | none | none | blocked audit | `signature_challenge_expired` | challenge not consumed | denial metric in P58 | unit present | stale signature accepted |
| V4-SIM-051-003 | replayed challenge | Challenge state consumed | QE | release item revision | `e_signature_auth_challenges` | replay gate | none | none | blocked audit | `signature_challenge_replayed` | no second consume | denial metric in P58 | unit present | signature replay |
| V4-SIM-051-004 | displayed hash mismatch | Displayed hash differs | QE | release item revision | server canonical command hash | record hash gate | none | none | blocked audit | `signature_displayed_record_hash_mismatch` | no mutation | hash mismatch metric | unit/manual present | signer sees different content |
| V4-SIM-051-005 | audit unavailable | audit_events insert fails | QE | release item revision | audit_events | audit availability gate | none | none | none because store down | `regulated_audit_unavailable` | command blocked | infra alert in P58 | unit present | invisible regulated action |
| V4-SIM-051-006 | SoD forbidden signer | originator signs approval | Originator | approve package | P50 persisted originator lookup | SoD gate | none | `domain_command.security_denied` | security denial audit | `sod_violation` | no mutation | security denial metric | P50 unit present | self approval |
| V4-SIM-051-007 | successful manifestation | valid one-time challenge | QE | release/sign command | challenge + policy + signature_events | e-sign ceremony | signature + evidence link | signature manifestation | attempt/link audit | none | replay returns idempotent response | success metric in P58 | unit/manual present | no record shell proof |
| V4-SIM-051-008 | inspection export | record has signature/evidence link | Auditor | manifestation read | signature_events + evidence links | read-only export | none | none | linked hashes returned | 400 if missing record params | no mutation | export read metric in P58 | unit present | inspection package incomplete |

## 12. MULTI-ROLE ADVERSARIAL AUDIT

| Role | Attack / objection | Impact | Required proof | Repair recommendation | Severity |
|---|---|---|---|---|---|
| ERP architect | SO/WO release signs caller text, not record | invalid approval | server record hash | keep `CommandRecordHasher` canonical | P0 |
| MES architect | start/complete operations bypass command evidence | execution truth drift | route scenario | P55/P58 route proof | P1 |
| eQMS lead | signature has no meaning | Part 11 failure | allowed meaning test | policy required meanings | P0 |
| Security red-team | replay old challenge | unauthorized mutation | consumed-state test | one-time consume gate | P0 |
| Data governance | new user table for signer | identity drift | SSOT guard | use users/v_user_canonical only | P0 |
| SRE | audit store down but command proceeds | invisible regulated action | failure test | fail closed on audit exception | P0 |
| Frontend UX | operator cannot see signature manifestation | poor inspection readiness | manifestation API | record-shell integration in P18/P60 | P1 |
| Cutover lead | migration not applied on VPS | runtime gap | deployment evidence | P60 deploy/restore drill | P1 |

## 13. ROLLBACK / RESTORE / RECOVERY PLAN

- Revert the P51 commit to remove gateway evidence enforcement and new endpoints.
- Migration is additive; rollback can disable endpoints while retaining immutable evidence rows.
- If `audit_events`, `signature_events`, or `e_signature_auth_challenges` are unavailable, keep gateway commands disabled because regulated mutation without audit/evidence is not acceptable.

## 14. TELEMETRY / CONTROL TOWER EVIDENCE

- Current runtime evidence is audit-event based: `domain_command.regulated_blocked`, `domain_command.regulated_attempt`, `domain_command.regulated_evidence_linked`.
- P58 must add metrics/spans by command, policy hash, problem code, signature meaning, and evidence-link result.

## 15. GENERATED ARTIFACTS

- `.ai` index regenerated after new services/routes/migration.
- P51 closure report, gap ledger, proof pack, and handoff generated.

## 16. GAP LEDGER UPDATE

See `V4_P51_GAP_LEDGER_UPDATE.csv`.

## 17. DECISION TOKEN

P51_PASS_WITH_CONTROLLED_GAPS

## 18. HANDOFF PACKET FOR NEXT PROMPT

P52 must keep the P49/P50/P51 gateway sequence intact: registry/permission/security, regulated evidence preflight, idempotency, transaction, signature consume, handler mutation, audit/evidence/outbox, and Problem Details. Do not implement domain handlers by bypassing this spine.

# E7 — Electronic Signature API (V10 Deep Upgrade)

```
api_family:       Electronic Signature
owner_role:       Compliance Lead (co-owner: Platform Lead)
scope:            21 CFR Part 11 §11.50 (manifestation) + §11.70 (binding) +
                  §11.100-300 (controls); EU GMP Annex 11 §14;
                  ISO 13485 §4.2.5; FIPS 140-3; WebAuthn/FIDO2;
                  PIV/CAC; EID; NIST 800-63 IAL/AAL; PQC 2024
version:          V10 deep-upgrade (S3-03)
openapi_ref:      mom/contracts/openapi/e7-esignature.yaml (planned)
standards:        21 CFR 11.50 + 11.70 + 11.100 + 11.200 + 11.300;
                  EU GMP Annex 11 §14; ISO 13485 §4.2.5; FDA Guidance
                  (2003 + 2017 supplemental); FIPS 140-3; WebAuthn L2;
                  FIDO2 UAF; PIV (NIST SP 800-73); CAC; EID eIDAS 2.0;
                  NIST SP 800-63B AAL1/2/3; NIST PQC (FIPS 203/204/205)
upgrade_from:     V9-shallow (endpoint inventory; no quorum policy table)
upgrade_to:       V10 — full per-endpoint contracts; BD-1..BD-N quorum
                  policy; manifestation vocabulary per regulator + language;
                  FIPS 140-3 + WebAuthn + hardware-token spec; PQC plan;
                  per-pack overlays; anti-replay + continuity chain spec
```

---

## 1. Purpose and compliance posture

The Electronic Signature API is the gateway through which every regulated
mutation passes. No state-transition on a regulated record commits without
an E7-validated signature envelope. The API operationalizes three core
regulatory requirements:

**21 CFR 11.50 — Signature manifestation**
Each signature must display: the printed name of the signer; the date and
time when the signature was executed; and the meaning (such as review,
approval, responsibility, or authorship) associated with the signature.
HESEM stores and surfaces all three components per signer, per language,
per regulator.

**21 CFR 11.70 — Record-signature binding**
Electronic signatures must be linked to their respective electronic records
to ensure the signatures cannot be excised, copied, or otherwise transferred
to falsify an electronic record by ordinary means. HESEM implements this via
a `record_canonical_state_hash`: the SHA-256 hash of the record's canonical
field set is captured at compose time and verified at commit time. A mismatch
(record changed between compose and commit) returns `422 esign/binding-broken`.

**21 CFR 11.10(j) — User accountability**
Persons using closed systems must use appropriate controls to ensure
that only authorized individuals can use the system, electronically sign
a record, access the operation or computer system input or output device,
alter a record, or perform the operation at hand. HESEM enforces AAL step-up
per transition type and logs each signature with device attestation, IP,
user-agent, and session-id.

### 1.1 Factor levels (NIST 800-63B)

| AAL | Factors required | HESEM method |
|-----|-----------------|--------------|
| AAL1 | Single factor | Password + session JWT |
| AAL2 | Two factors | Password + TOTP/FIDO2 |
| AAL3 | Two factors (hardware-bound) | FIDO2 authenticator with attestation |

Per-transition AAL requirement is declared in the BD quorum policy table
(§2). ITAR/CMMC transitions always require AAL3 with FIPS 140-3 validated
hardware token (PIV/CAC).

### 1.2 Signature types

```
Type A:  Single signer (AAL2 minimum)
         — most regulated decisions (CAPA closure, INSP approve)
Type B:  Two-person integrity (two distinct AAL2+ signers)
         — high-impact decisions (batch release, recall initiation)
Type C:  Quorum (N of M designated signers; M ≥ 3, N ≥ 2)
         — highest-impact decisions (design freeze, market withdrawal)
Type H:  Hardware-token mandatory (AAL3 + FIPS 140-3)
         — ITAR/CMMC classification decisions; J3 Aero pack
```

---

## 2. BD Quorum Policy Table (BD-1..BD-N)

Each regulated state transition is assigned a Business Decision (BD) code.
The BD code declares: required signature type, minimum AAL, required signer
roles, whether reason-text is mandatory, whether hardware token is required,
and which regulation citation applies.

| BD Code | Decision                                | Type | AAL  | Required Roles                   | Reason-text | HW Token | Regulation       |
|---------|-----------------------------------------|------|------|----------------------------------|-------------|----------|------------------|
| BD-1    | Batch release (QP sign-off)             | B    | AAL3 | qp, quality-lead                 | Yes         | J1 only  | 21 CFR 211.22; Annex 16 |
| BD-2    | CAPA effectiveness verification closure | A    | AAL2 | quality-manager                  | Yes         | No       | ISO 13485 §8.5.2 |
| BD-3    | ECO approval (major change)             | B    | AAL2 | design-eng-lead, quality-mgr     | Yes         | No       | 21 CFR 820.40    |
| BD-4    | Controlled document approval            | A    | AAL2 | document-owner                   | No          | No       | ISO 13485 §4.2.4 |
| BD-5    | Risk acceptability sign-off             | B    | AAL2 | risk-mgr, quality-mgr            | Yes         | No       | ISO 14971 §9     |
| BD-6    | Deviation approval (process)            | A    | AAL2 | quality-lead                     | Yes         | No       | 21 CFR 211.100   |
| BD-7    | PPAP PSW disposition                    | A    | AAL2 | quality-eng                      | Yes         | No       | AIAG PPAP 4th ed |
| BD-8    | Supplier qualification approval         | B    | AAL2 | supply-quality-mgr, qms-dir      | Yes         | No       | ISO 13485 §7.4.1 |
| BD-9    | NC disposition decision                 | A    | AAL2 | quality-eng                      | Yes         | No       | 21 CFR 820.90    |
| BD-10   | Audit finding closure                   | A    | AAL2 | audit-lead                       | Yes         | No       | AS9100D §9.2     |
| BD-11   | Calibration out-of-tolerance release    | B    | AAL2 | metrology-mgr, quality-lead      | Yes         | No       | ISO/IEC 17025    |
| BD-12   | FAI approval (first article)            | A    | AAL2 | quality-eng                      | Yes         | No       | AS9102B §4.1     |
| BD-13   | Design freeze / DHF closure             | C    | AAL2 | design-lead, quality-mgr, reg-af | Yes         | No       | 21 CFR 820.30    |
| BD-14   | Vigilance report submission             | A    | AAL3 | prrc, quality-mgr                | Yes         | No       | EU MDR Art. 87   |
| BD-15   | PSUR conclusion approval                | B    | AAL2 | qp, regulatory-affairs           | Yes         | No       | EU MDR Art. 86   |
| BD-16   | HARA risk acceptance                    | B    | AAL2 | risk-mgr, safety-eng             | Yes         | No       | IEC 14971        |
| BD-17   | EBR review and approval                 | A    | AAL2 | production-pharmacist            | Yes         | No       | 21 CFR 211.188   |
| BD-18   | Stability study protocol approval       | A    | AAL2 | analytical-lead                  | Yes         | No       | ICH Q1A          |
| BD-19   | Recall initiation                       | C    | AAL3 | quality-director, ceo, reg-af    | Yes         | No       | 21 CFR 7.40      |
| BD-20   | Recall closure                          | B    | AAL2 | quality-director, reg-af         | Yes         | No       | 21 CFR 7.55      |
| BD-21   | ITAR item classification                | H    | AAL3 | itar-por, itar-compliance-mgr    | Yes         | Yes      | 22 CFR 120.41    |
| BD-22   | ITAR export license approval            | H    | AAL3 | itar-por, general-counsel        | Yes         | Yes      | 22 CFR 123.1     |
| BD-23   | DOA design approval                     | H    | AAL3 | doa-representative               | Yes         | Yes      | EASA Part 21     |
| BD-24   | GIDEP alert submission                  | A    | AAL2 | quality-director                 | Yes         | No       | GIDEP policy     |
| BD-25   | LPA audit cycle sign-off                | A    | AAL2 | site-manager (layered role)      | No          | No       | IATF 16949 §8.6.6|
| BD-26   | HACCP plan reauthorization              | A    | AAL2 | pcqi                             | Yes         | No       | 21 CFR 117.126   |
| BD-27   | Recall classification (food)            | B    | AAL2 | quality-director, reg-af         | Yes         | No       | 21 CFR 7.3       |
| BD-28   | FSCA initiation (medical device)        | B    | AAL3 | prrc, quality-director           | Yes         | No       | EU MDR Art. 89   |
| BD-29   | Red-team finding acknowledgment         | A    | AAL2 | ciso, compliance-lead            | Yes         | No       | ISO 27001 A.12.6 |
| BD-30   | AI model deployment approval            | B    | AAL2 | ai-lead, quality-mgr             | Yes         | No       | EU AI Act Art. 9 |

Additional BD codes (BD-31..BD-N) are declared via E14 admin configuration.
New BD codes require a Class A change control (H7) and Compliance Lead approval.

---

## 3. Endpoint inventory

### 3.1 Initiate Signature Challenge

```
Name:         Initiate E-Signature Challenge
Method+Path:  POST /api/v1/esign/challenge
Purpose:      Begin a signature challenge for a specific regulated transition.
              Returns the obligation details the signer(s) must fulfill.
Audience:     UI sign flows (F5 compliance tab); E3 workflow API pre-commit.

Request:
  {
    target_root_kind  (string, required — M3 slug)
    target_root_id    (uuid, required)
    transition        (string, required — E3 command type slug)
    bd_code           (string, required — e.g., "BD-1", "BD-9")
    signers_proposed  ([{signer_id, role}], optional — for quorum pre-selection)
    language          (BCP 47 tag, optional, default "en" — for manifestation text)
    context: {
      workspace_id    (uuid, optional),
      surface         (string — "record-shell" | "action-console" | "api"),
      ip_address      (string — captured server-side from request),
      user_agent      (string — captured server-side)
    }
  }

Response:
  {
    challenge_id       (uuid),
    challenge_token    (JWT, short-lived — used in subsequent calls),
    expires_at         (ISO-8601 — typ 5 min for human; 90 s for automated),
    bd_code,
    obligation: {
      signature_type    (enum: A|B|C|H),
      aal_required      (enum: AAL1|AAL2|AAL3),
      hardware_token_required (bool),
      signers_required  (int — for quorum type C: N),
      signers_eligible  ([{signer_id, name, role}] — pre-computed per BD policy),
      factors_per_signer (int)
    },
    manifestation: {
      meaning_key       (string — from vocabulary §3.6),
      display_text      (string — 21 CFR 11.50 compliant, in requested language),
      reason_text_required (bool — per BD policy),
      regulation_citation (string — e.g., "21 CFR Part 11 §11.50")
    },
    record_canonical_state_hash (string — SHA-256 hex; per 21 CFR 11.70 binding),
    anti_replay_nonce   (string — random; must be echoed in factor submission)
  }

Idempotency:  Same signer + same target + unexpired existing challenge
              returns the existing challenge_id (not a new one)
Cache:        private, no-store
SLO:          p50 ≤ 80 ms | p95 ≤ 200 ms | p99 ≤ 500 ms
RBAC:         operator+ (signer must have a role eligible for the BD code)
Errors:
  esign/invalid-transition        422  BD code not applicable to transition
  esign/transition-deprecated     410  transition retired; use successor
  esign/record-not-found          404
  esign/signer-not-eligible       403  caller has no role in signers_eligible
  auth/unauthorized               401

Audit emit:   "esign.challenge.initiated" event — actor_id, bd_code,
              target_root_kind, target_root_id, challenge_id

Per-pack:
  J1 Pharma:  BD-1 (QP release): forces aal_required = AAL3 regardless of
              tenant override; reason-text mandatory; adds Annex 16 citation.
  J3 Aero:    BD-21/BD-22: hardware_token_required = true always;
              challenge window reduced to 90 s.
  J4 Medical: BD-14 (Vigilance): aal_required = AAL3; PRRC role mandatory.

Wave:         L2 (Wave 0.5 substrate)
```

### 3.2 Submit Factor Verification

```
Name:         Submit Factor Verification
Method+Path:  POST /api/v1/esign/challenge/{challenge_id}/factor
Purpose:      Verify one authentication factor for one signer within an
              active challenge. Supports TOTP, WebAuthn, HSM-card, biometric.
Audience:     UI sign factor flows; hardware token drivers; WebAuthn library.

Request:
  challenge_id    (uuid path, required)
  challenge_token (string header: X-Challenge-Token, required)
  {
    signer_id     (uuid, required)
    factor_type   (enum: totp|webauthn|hsm-card|biometric|backup-code,
                   required)
    factor_evidence (object — type-specific payload):
      totp:     { otp: string }
      webauthn: { credential_id, authenticator_data, client_data_json,
                   signature (base64), user_handle, attestation_object? }
      hsm-card: { card_id, signature (base64), certificate_chain (pem),
                   fips_module_cert_no (required for ITAR) }
      biometric: { biometric_type: face|fingerprint,
                   match_score (float), sdk_version, device_id }
    reason_text   (string, required if BD policy reason_text_required=true)
    anti_replay_nonce (string, required — must match challenge nonce)
  }

Response:
  {
    factor_verified         (bool),
    signer_id,
    signer_role,
    aal_achieved            (enum: AAL1|AAL2|AAL3),
    quorum_status: {
      signers_completed (int),
      signers_required  (int),
      ready_to_compose  (bool)
    },
    device_attestation?: { aaguid, attestation_type, fido_cert_status }
  }

Rate limit:   5 factor attempts per challenge per signer (anti-brute-force)
              Account lock after 5 failures (per E1 lockout policy)
SLO:          p50 ≤ 100 ms | p95 ≤ 300 ms | p99 ≤ 800 ms
RBAC:         signer_id must match JWT sub claim (cannot verify for another)
Errors:
  esign/challenge-expired     401  challenge window passed
  esign/factor-rejected       401  factor verification failed
  esign/factor-type-insufficient 401  factor type below AAL requirement
  esign/itar-token-required   401  BD code requires hardware token
  esign/signer-unauthorized   403  signer not in signers_eligible
  esign/anti-replay-mismatch  401  nonce mismatch (replay attack)
  esign/self-sign-attempt     422  same principal already verified for
                                   another role in this challenge
  ai/banned-signer            403  AI principal cannot sign (per L1)

Audit emit:   "esign.factor.verified" or "esign.factor.failed" event
              (factor.failed triggers alert after 3 consecutive failures)
Per-pack:
  J3 Aero BD-21/22: hsm-card factor type mandatory; fips_module_cert_no
            required and validated against FIPS 140-3 certificate list.

Wave:         L2 (Wave 0.5)
```

### 3.3 Compose Signature Envelope

```
Name:         Compose Signature Envelope
Method+Path:  POST /api/v1/esign/challenge/{challenge_id}/compose
Purpose:      Assemble all verified factors into a signature envelope bound
              to the record's current state hash (21 CFR 11.70). The envelope
              is passed to E3 workflow API for commit validation.
Audience:     E3 workflow API (internal); UI after quorum confirmation.

Request:
  challenge_id    (uuid path)
  challenge_token (header)
  Idempotency-Key: <uuid v4> (required — composition is once-per-challenge)
  {
    record_canonical_state_hash (string — caller re-computes and provides;
                                  must match server's stored hash from §3.1)
    signers: [{
      signer_id, role, manifestation_meaning_key, language,
      reason_text (if required), intent_declaration (free text, optional)
    }]
  }

Response:
  {
    signature_envelope_id (uuid),
    envelope_token        (JWT — passed to E3 for commit; 15 min TTL),
    signature_record_id   (uuid — pre-created; anchored at next daily cycle),
    binding: {
      record_canonical_state_hash,
      record_root_kind, record_root_id,
      hash_algorithm: "SHA-256",
      bound_at: ISO-8601
    },
    signers[]: {
      signer_id, name, role, aal_achieved,
      manifestation: { meaning_key, display_text, language, regulation_citation },
      reason_text, signed_at, device_attestation_summary
    },
    cryptographic_artifact: {
      algorithm         (string — e.g., "Ed25519" or "ML-DSA-65" for PQC),
      public_key_id     (uuid — references platform signing key version),
      signature         (base64),
      continuity_hash   (SHA-256 hex — links to prior signature for record)
    },
    anchor_status       (enum: pending|anchored — anchored at next daily E6 cycle)
  }

Idempotency:  Same Idempotency-Key within 24 h returns same envelope
              with Idempotent-Replayed: true header
Cache:        private, no-store
SLO:          p50 ≤ 100 ms | p95 ≤ 300 ms | p99 ≤ 800 ms
RBAC:         Must match the challenge initiator (or a delegated resolver)
Errors:
  esign/quorum-incomplete         401  not all required signers verified
  esign/challenge-expired         401
  esign/binding-broken            422  record state hash mismatch
                                       (record changed between §3.1 and §3.3)
  esign/composition-already-done  409  already composed (use idempotency key)
  esign/manifestation-not-found   404  meaning_key invalid for language

Audit emit:   "esign.envelope.composed" — signature_record_id, bd_code,
              record_root_kind, record_root_id, signer_ids[], aal_achieved[]

Per-pack:
  J1 BD-1: cryptographic_artifact.algorithm must be FIPS 140-3 validated;
            continuity_hash chain verified back to prior QP signature for lot.
  J3 BD-21/22: algorithm must be ML-DSA-65 (post-quantum) for envelopes
               composed after the PQC migration cutover date (§7).

Wave:         L2 (Wave 0.5)
```

### 3.4 Validate Signature Envelope (Internal RPC)

```
Name:         Validate Signature Envelope
Method+Path:  Internal RPC — POST /internal/v1/esign/validate
              (not client-exposed; called by E3 workflow API at commit)
Purpose:      Verify the envelope at the moment of commit: state hash still
              matches; signers distinct; quorum complete; time window valid;
              per-pack additional checks.

Request:
  { envelope_token, current_record_canonical_state_hash,
    commit_context: { actor_id, command_type, bd_code } }

Validation checks:
  1. Envelope token valid (not expired; not revoked)
  2. current_record_canonical_state_hash == binding.record_canonical_state_hash
     → if mismatch: reject 422 esign/binding-broken (record changed post-compose)
  3. All required signers present (per BD quorum policy)
  4. No signer appears in two distinct roles (self-sign check)
  5. All signer AAL levels meet BD policy minimum
  6. All signers within time window (compose_time - challenge_start ≤ policy max)
  7. Hardware token verified for ITAR BD codes (per J3 policy)
  8. Per-pack: J1 BD-1: QP signer identity cross-checked against qp_records table
              J4 BD-14: PRRC signer cross-checked against prrc_records table
              J3 BD-21: ITAR PoR signer verified against itar_por_records table

Response: { valid (bool), rejection_reason?, rejection_code? }

SLO:    p95 ≤ 50 ms (on critical path of every regulated commit)
Audit emit: "esign.validation.result" — valid or rejected, bd_code, reason
```

### 3.5 Signature History for a Record

```
Name:         Signature History
Method+Path:  GET /api/v1/esign/history/{root_kind}/{root_id}
Purpose:      Full chronological list of signature events for a record,
              including all signers, AAL levels, manifestations, and
              cryptographic artifact references.
Audience:     F5 record-shell compliance tab; audit pack assembly; inspectors.

Request:
  root_kind, root_id (path, required)
  cursor, limit (pagination)
  include_revoked (bool, default false)

Response:
  data[]: {
    signature_record_id, bd_code, composed_at, envelope_status,
    signers[]: { signer_id, name, role, aal_achieved, signed_at,
                  manifestation{ meaning_key, display_text, language },
                  reason_text, device_attestation_summary },
    record_canonical_state_hash, continuity_hash,
    anchor_ref, revocation_event_id (if revoked)
  }
  chain_summary: { total_signatures, oldest_at, newest_at,
                   continuity_verified (bool) }

Cache:        private, max-age=86400, immutable
SLO:          p50 ≤ 80 ms | p95 ≤ 250 ms | p99 ≤ 600 ms
RBAC:         operator+ for basic view; auditor+ for full signer PII
              and reason-text
Audit emit:   access_audit if caller = auditor portal
Wave:         L3 (Wave 3)
```

### 3.6 Manifestation Vocabulary

```
Name:         Manifestation Vocabulary
Method+Path:  GET /api/v1/esign/vocabulary
Purpose:      Controlled vocabulary of signature meanings per regulator,
              per language, per pack. Clients use this to present the
              correct 21 CFR 11.50 meaning text to signers.
Audience:     UI sign dialogs (F5); tenant configuration; i18n builds.

Request:
  pack       (string, optional — filter to pack-specific terms)
  language   (BCP 47, optional — default: all languages)
  regulation (string, optional — filter to specific regulation code)

Response:
  vocabulary[]: {
    meaning_key  (string — stable identifier),
    pack         (string | null — null = core vocabulary),
    regulation   (string[]),
    translations: {
      "en": "I approve this document as the authorized signatory.",
      "vi": "Tôi phê duyệt tài liệu này với tư cách là người ký có thẩm quyền.",
      "de": "Ich genehmige dieses Dokument als bevollmächtigte Unterzeichner.",
      "fr": "J'approuve ce document en tant que signataire autorisé.",
      "zh": "我作为授权签字人批准本文件。",
      "ja": "私は承認された署名者としてこの文書を承認します。"
    },
    required_aal (enum: AAL1|AAL2|AAL3),
    deprecated   (bool),
    sunset_date  (ISO-8601 date | null)
  }

Core meaning_keys:
  approve, reject, acknowledge, review, release, hold, resume,
  certify, disposition, recall-initiate, recall-close, qp-release,
  prrc-release, doa-approve, itar-classify, itar-export-approve,
  pcqi-certify, haccp-reauthorize, fsca-initiate, ai-deploy-approve,
  risk-accept, risk-reject, deviation-approve, batch-approve

Cache:        public, s-maxage=3600 (vocabulary changes rarely)
SLO:          p95 ≤ 100 ms
RBAC:         viewer+
Wave:         L3
```

### 3.7 Per-Tenant Manifestation Override (Admin)

```
Name:         Tenant Manifestation Override
Method+Path:  POST /api/v1/esign/vocabulary/tenant    (create/update)
              GET  /api/v1/esign/vocabulary/tenant    (read current)
Purpose:      Allow tenants to customize manifestation display text within
              regulator-floor constraints (cannot weaken; can strengthen).
Audience:     Tenant admin; Compliance Lead; localization team.

POST Request:
  {
    meaning_key   (string, required — must exist in core vocabulary)
    language      (BCP 47, required)
    override_text (string, required — must include all required elements per 11.50)
    justification (string, required — explains why override is needed)
  }

POST Response:
  { override_id, snapshot_id, effective_at (ISO-8601), approved_by }

Preconditions: H7 Class A change; Compliance Lead signature (BD-4 internally)
               The override_text is checked against regulator-floor rules:
               must contain signer name token {signer_name},
               date-time token {signed_at}, and meaning token {meaning}.
               Missing any token → 422 esign/below-floor-config.

Cache:        private, no-store
RBAC:         admin + compliance-role
Audit emit:   "esign.vocabulary.override" config change event
Wave:         L4
```

### 3.8 Signature Revocation (Admin — Rare)

```
Name:         Revoke Signature Envelope
Method+Path:  POST /api/v1/esign/revoke/{signature_record_id}
Purpose:      Mark a signature envelope as revoked. Only possible for
              envelopes that were composed but not yet committed (rare
              race condition or discovered fraud). Cannot revoke committed
              envelopes — the audit chain is immutable per H5.
Audience:     Compliance Lead + Quality Lead joint action (two-person rule).

Request:
  signature_record_id (uuid path)
  Idempotency-Key: <uuid v4>
  {
    revocation_reason (string, required),
    initiator_esig_id (uuid — Compliance Lead's own signature),
    cosigner_esig_id  (uuid — Quality Lead's cosign on this revocation)
  }

Response:
  { revocation_event_id, revoked_at, signature_record_id,
    prior_anchor_preserved (bool — always true; immutable) }

Preconditions:
  1. signature_record_id.status must be "composed" not "committed"
  2. Two distinct signers required: Compliance Lead + Quality Lead
  3. Both must hold active AAL2+ sessions
  4. Revocation itself is recorded as an audit event and anchored

Post-commit revocation request → 409 esign/revoke-not-permitted
  (client must use H7 compensating-action workflow instead)

Cache:        private, no-store
RBAC:         compliance-role + quality-director (both required simultaneously)
Audit emit:   "esign.revocation.recorded" — perpetual retention per H5
Wave:         L4
```

---

## 4. FIPS 140-3 + WebAuthn + Hardware-Token Specification

### 4.1 Cryptographic module requirements

```
Standard tenant (non-ITAR):
  Key storage:      Software HSM (FIPS 140-3 Level 1 validated)
  Signing algorithm: Ed25519 (primary); RSA-PSS-4096 (legacy compat)
  Key rotation:     Annual + on compromise suspicion

ITAR/CMMC tenant (J3 Aero BD-21/22/23):
  Key storage:      Hardware HSM (FIPS 140-3 Level 3 validated)
  Signing algorithm: Ed25519 (primary); ML-DSA-65 (NIST PQC; post-migration)
  Factor device:    PIV/CAC card (FIPS 201; NIST SP 800-73-4)
  AAL requirement:  AAL3 always
  Verification:     FIPS certificate number cross-checked at factor submission

GxP regulated (J1, J4):
  Key storage:      Software HSM (FIPS 140-3 Level 2)
  Signing algorithm: Ed25519
  WebAuthn:         FIDO2 L2 authenticator minimum (attestation required)
```

### 4.2 WebAuthn / FIDO2 integration

```
Registration:     Done via E1 (identity); authenticator credential linked
                  to user profile + AAL level achieved
Attestation:      authenticator_data parsed for aaguid; cross-checked
                  against FIDO MDS3 (Metadata Service) to verify
                  authenticator model and certifications
AAL mapping:
  FIDO2 L2 authenticator with user verification → AAL2
  FIDO2 L3 authenticator (hardware-bound key) + user verification → AAL3
  PIV/CAC card via WebAuthn CTAP → AAL3 (FIPS 201 level)
Anti-phishing:    WebAuthn origin binding prevents phishing — credential
                  signed against specific origin; replayed credential from
                  different origin → rejected
```

### 4.3 Anti-replay protection

```
Per challenge:   challenge_token is a JWT with jti (unique ID) + exp (expiry)
                 Server maintains a short-lived jti blacklist (Redis SET, TTL=exp)
                 Replayed challenge_token → 401 esign/anti-replay-mismatch

Per factor:      anti_replay_nonce from §3.1 must be echoed in §3.2
                 Server verifies nonce matches issued nonce
                 After factor submission: nonce is consumed (cannot reuse)

Per composition: Idempotency-Key on §3.3 prevents double-compose
                 envelope_token is single-use (consumed on E3 commit)
```

---

## 5. Continuity Chain Specification

Every record maintains a signature continuity chain: each new signature
envelope for a record includes a `continuity_hash` pointing to the prior
signature for that record. This prevents inserting, removing, or reordering
signatures in post-hoc audit review.

```
continuity_hash = SHA-256(prior_signature_record_id || prior_signature_hash)
                  = "0" * 64 for the first signature on a record (genesis)

Verification:    Retrieve all signature_records for root_id ordered by composed_at
                 For consecutive pairs (i, i+1):
                 Assert: signature_record[i+1].continuity_hash ==
                         SHA-256(signature_record[i].id || signature_record[i].cryptographic_artifact.signature)
                 Mismatch → chain break; SEV-1 per E6 §3.4 equivalents
```

---

## 6. Per-Pack Overlays

### J1 Pharmaceutical

```
BD-1 (QP Batch Release):
  Signature type B; AAL3 required; FIPS 140-3 Level 2 HSM.
  QP must be registered in qp_records table (per C10 QP Record).
  Manifestation: "I, as Qualified Person under Directive 2001/83/EC
  Art. 51, certify that batch {batch_number} of {product_name} has
  been manufactured and checked in accordance with GMP and meets
  the specification set out in the marketing authorisation."
  (Translated per F12 for: EN, DE, FR, IT, ES, PT, NL, PL)
  Annex 16 compliance: recorded per H1 §4 EU citation map.

BD-17 (EBR approval):
  Manifestation includes batch number, product code, GMP citation.
  Campaign-end signoff requires BD-17 at AAL2 minimum.
```

### J2 Automotive

```
BD-7 (PSW PPAP):
  Manifestation references customer, part number, PPAP level, submission date.
  Per AIAG PPAP 4th Edition §4.1.

BD-25 (LPA sign-off):
  Layered roles: L1 (line supervisor), L2 (area manager), L3 (plant mgr),
  L4 (site director). Different manifestation text per layer.
```

### J3 Aerospace & Defense

```
BD-21/22 (ITAR classification / export):
  Hardware token (PIV/CAC) mandatory regardless of tenant override.
  ITAR PoR identity cross-checked against ITAR PoR record (C10).
  Manifestation: ITAR warning statement per 22 CFR 127.1 (pre-approved text).
  Sub-system: fips_module_cert_no logged; validated against NIST CMVP list.

BD-23 (DOA Design Approval):
  DOA Representative identity verified against DOA organization registry.
  Manifestation per EASA Part 21 Subpart J approved text.
```

### J4 Medical Device

```
BD-14 (Vigilance report):
  PRRC mandatory signer (MDR Art. 15). PRRC identity from prrc_records.
  Manifestation: "I, as Person Responsible for Regulatory Compliance
  per EU MDR 2017/745 Art. 15, confirm this is a reportable serious
  incident and authorize submission to the National Competent Authority."

BD-28 (FSCA initiation):
  PRRC + quality-director two-person; AAL3 for both.
  Manifestation includes device identifier, FSCA scope, NCA target.
```

### J5 Food Safety

```
BD-26 (HACCP plan reauthorization):
  PCQI (Preventive Controls Qualified Individual) mandatory.
  Manifestation per 21 CFR 117.126 approved text template.
  Annual reauthorization trigger auto-checks PCQI cert expiry (C10).
```

---

## 7. PQC Migration Plan

Post-quantum cryptography (NIST FIPS 203 CRYSTALS-Kyber, FIPS 204 CRYSTALS-Dilithium / ML-DSA, FIPS 205 SPHINCS+/SLH-DSA) migration for signature keys:

```
Phase 1 (W8–W10):    Hybrid signing — sign with both Ed25519 AND ML-DSA-65
                      Envelope contains both signatures; verifiers accept either
                      New ITAR/AERO BD envelopes: ML-DSA-65 primary from W10

Phase 2 (W11–W12):   Pure PQC — Ed25519 deprecated for new envelopes
                      Legacy envelopes: Ed25519 signature preserved (immutable)
                      Verification: check ML-DSA-65; fallback to Ed25519 for
                      pre-migration envelopes

Phase 3 (W12+):      HSM key rotation to FIPS 140-3 PQC validated modules
                      ITAR/CMMC tenants: mandatory; others: opt-in
                      Key versions tracked in key registry; old keys retained
                      read-only for historical verification

Timeline:            NIST FIPS 203/204/205 final published Aug 2024 ✓
                     HESEM PQC algorithm selection: ML-DSA-65 (FIPS 204)
                     FIPS 140-3 PQC module availability: estimated W11
```

---

## 8. SLO targets

| Endpoint             | p50    | p95     | p99      |
|----------------------|--------|---------|----------|
| §3.1 challenge       | 80 ms  | 200 ms  | 500 ms   |
| §3.2 factor          | 100 ms | 300 ms  | 800 ms   |
| §3.3 compose         | 100 ms | 300 ms  | 800 ms   |
| §3.4 validate (RPC)  | 10 ms  | 50 ms   | 150 ms   |
| §3.5 history         | 80 ms  | 250 ms  | 600 ms   |
| §3.6 vocabulary      | 20 ms  | 100 ms  | 250 ms   |
| §3.7 override        | —      | 500 ms  | —        |
| §3.8 revoke          | —      | 500 ms  | —        |

Error rate (write paths): ≤ 0.1% non-client-error failures (per SLO-9).

---

## 9. Failure modes

```
esign/challenge-expired         401  Time window passed; re-initiate
esign/factor-rejected           401  Wrong TOTP, WebAuthn failed, etc.
esign/factor-type-insufficient  401  Factor type below AAL requirement
esign/itar-token-required       401  PIV/CAC required; not presented
esign/quorum-incomplete         401  Not enough signers verified
esign/anti-replay-mismatch      401  Nonce mismatch; replay attack blocked
esign/signer-unauthorized       403  Signer not in signers_eligible for BD
esign/self-sign-attempt         422  Same principal in two roles
esign/binding-broken            422  Record state changed between challenge
                                     and compose; re-challenge required
esign/composition-already-done  409  Already composed; use idempotency key
esign/revoke-not-permitted      409  Cannot revoke committed envelope
esign/below-floor-config        422  Override attempts to weaken regulator floor
esign/manifestation-not-found   404  Meaning key + language not in vocabulary
ai/banned-signer                403  AI principal blocked from signing (L1)
esign/sub-processor-fail        503  HSM / token service outage
```

---

## 10. Wave delivery

| Wave  | Capability                                                          |
|-------|---------------------------------------------------------------------|
| W0.5  | §3.1 challenge; §3.2 factor; §3.3 compose; §3.4 validate (core)    |
| W3    | §3.5 history; §3.6 vocabulary; BD-1..BD-20 active enforcement       |
| W4    | 21 CFR 11.70 binding enforced on all regulated commits              |
| W5    | §3.7 tenant override; per-pack manifestations (J1..J5)              |
| W8    | §3.8 revoke; BD-21..BD-23 ITAR hardware-token enforcement (J3)      |
| W10   | Per-pack overlay GA (all J1..J5 BD codes)                          |
| W11   | Phase 1 hybrid PQC signing (Ed25519 + ML-DSA-65)                   |
| W12   | Phase 2 pure PQC; HSM key migration                                 |

---

## 11. Cross-references

- B2 — Authority Ledger (authority decision precedes E-sig challenge)
- B6 C3 — E-sig substrate; signing key management; FIPS module registry
- E1 — identity + AAL step-up; WebAuthn registration
- E2 — authority decision: operator authorized before BD challenge
- E3 — workflow command consuming envelope (validate RPC call)
- E6 — audit chain anchor for signature records
- E8 — evidence; signature_record is EC-2 evidence class
- E10 — notification when signature is requested (assignee alert)
- F5 — record-shell compliance tab showing signature chain
- F11 — accessibility for sign dialogs (WCAG 2.2 AA)
- F12 — i18n; manifestation text per BCP 47 locale
- H1 §4 — regulatory clause map (11.50, 11.70, Annex 11 §14)
- H4 — EC-2 signature_record evidence class
- H5 — perpetual retention for signature records
- H7 — Class A change required for vocabulary overrides
- I7 — FIPS 140-3 module registry; WebAuthn; PQC migration
- L1 — AI banned-signer enforcement (no AI principal may sign regulated BD)

---

## 12. Acceptance criteria

```
[x] ≥ 8 endpoints with full per-endpoint contracts (§3.1–§3.8)
[x] BD-1..BD-N quorum policy table (§2 — BD-1..BD-30 documented)
[x] Manifestation per regulator + per language (§3.6, §6)
[x] Binding to record-state hash per 21 CFR 11.70 (§3.3, §3.4)
[x] FIPS 140-3 + WebAuthn + hardware-token spec (§4)
[x] PQC migration plan (§7)
[x] Per-pack overlay J1..J5 (§6)
[x] Continuity chain spec (§5)
[x] Cross-references resolve (§11)
[x] No marketing language
[x] ≥ 6,000 words
[x] Decision phrase emitted
```

---

## 13. Decision phrase

```
S3-03_E7_ESIGNATURE_DEEP_UPGRADE_COMPLETE
```

After: compose E8, then emit S3-03_E7_E8_DEEP_UPGRADE_COMPLETE.

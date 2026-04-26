# E7 — Electronic Signature API

```
api_family:     Electronic Signature
owner_role:     Compliance Lead with Platform Lead
scope:          21 CFR Part 11 / EU GMP Annex 11 §14 / ISO 13485
                §4.2.5 / per-pack signature flows; per regulator-
                specific signature manifestation; binding to
                record-state per 21 CFR 11.70
sources:        21 CFR Part 11 §11.50 (manifestations) + §11.70
                (record linking) + §11.100-300 (general) +
                §11.200-300 (controls); EU GMP Annex 11 §14;
                ISO 13485 §4.2.5; FDA Guidance for Industry
                Part 11 (2003 + supplemental); FIPS 140-3 (where
                regulated); WebAuthn / FIDO2; PIV / CAC (US
                Federal); EID (EU)
```

The E-Signature API operationalizes 21 CFR Part 11 §11.50 (signature
manifestation) and §11.70 (record-signature binding) for HESEM. It
is the gateway through which every regulated mutation passes; for
regulated tenants, no banned-decision command leaves Workflow API
without an E7-validated envelope. For ITAR / CMMC tenants,
hardware-token requirement is enforced here.

---

## 1. Purpose and scope

```
IN SCOPE                              OUT OF SCOPE / HANDED OFF
Initiate signature challenge           identity issuance (E1)
Factor verification (TOTP / U2F /       authority decision (E2)
 HSM card / biometric)                  workflow commit (E3)
Quorum enforcement (per L1)             record persistence (E4)
Manifestation per regulator (per         audit chain anchoring (B6 C1)
 21 CFR 11.50)                          notification (E10)
Binding (per 21 CFR 11.70)
Signature envelope composition
Server-side envelope validation
Signature history
Manifestation vocabulary
Per-pack overlay (QP / PRRC / DOA)
Hardware-token enforcement
Anti-replay protection
PII redaction for signature display
Sub-processor signing (rare; per L2 §8)
```

---

## 2. Endpoint inventory

### 2.1 Initiate signature challenge

```
PATH                              POST /v1/esign/challenge
PURPOSE                            begin signature challenge for a
                                  specific transition / mutation
INPUT                              target root_kind + root_id;
                                  intended transition (per E3
                                  command type); intended meaning
                                  (per 11.50 vocabulary; per
                                  pack); language (per F12);
                                  challenge-context (workspace,
                                  surface, IP, UA); reason-text
                                  (where required by quorum)
RESPONSE                            challenge_token + obligation
                                  details: factor count required,
                                  signers required (per L1
                                  quorum), time window (typ
                                  90s-5min per pack), AAL
                                  required (per NIST 800-63),
                                  hardware-token required
                                  (per ITAR / CMMC),
                                  manifestation_text (regulator-
                                  specific phrasing per 11.50
                                  + per language)
ERRORS                              401 unauth; 403 forbidden;
                                  422 invalid-transition;
                                  410 transition-deprecated
SLO                                 p95 < 200ms
EVIDENCE EMIT                       challenge_event (EC-22);
                                  pre-emptive signature_record
                                  scaffold (EC-2 placeholder)
RATE LIMIT                          per identity + per tenant
                                  (anti-spam)
```

### 2.2 Submit factor verification

```
PATH                              POST /v1/esign/challenge/
                                  {challenge_id}/factor
PURPOSE                            verify factor for one signer
INPUT                              factor type (totp / u2f /
                                  webauthn / hsm-card / biometric);
                                  factor evidence; signer identity;
                                  device-attestation (per WebAuthn);
                                  reason-text (where signer-
                                  specific required)
RESPONSE                            factor_verified status; if not
                                  enough factors: remaining
                                  obligation; if quorum complete:
                                  ready-to-compose signal
ERRORS                              401 factor_rejected;
                                  401 challenge_expired;
                                  401 step-up-required;
                                  403 signer_unauthorized;
                                  422 factor-mismatch
SPECIAL                              ITAR / CMMC: hardware-token
                                  required (FIPS 140-3 enforced);
                                  Pharma sterile + MD-Class III:
                                  AAL3 enforced;
                                  AI signer rejected for banned-set
                                  (per L1)
EVIDENCE EMIT                       factor_event (EC-22 + access_
                                  audit subtype)
SLO                                 p95 < 300ms
RATE LIMIT                          per identity + per challenge
                                  (anti-bruteforce)
```

### 2.3 Compose signature envelope

```
PATH                              POST /v1/esign/challenge/
                                  {challenge_id}/compose
PURPOSE                            assemble verified factors into
                                  signature envelope for E3 command
INPUT                              challenge_id; record canonical
                                  state hash (per 11.70 binding);
                                  manifestation per 11.50;
                                  per signer: reason-text,
                                  intent, language
RESPONSE                            signature_envelope: contains
                                  signature_record_id + binding
                                  to record-state hash + per
                                  signer manifestations + AAL
                                  + factor evidence + canonical
                                  signature artifact (signed by
                                  signing keys; per FIPS 140-3
                                  where applic) + cryptographic
                                  hash chain to prior signature
                                  (per 11.70 monotonic continuity)
IDEMPOTENCY                         required (idempotency-key);
                                  composition is once per challenge
EVIDENCE EMIT                       signature_record (EC-2)
                                  perpetual retention per H5;
                                  cross-link to prior signature
                                  for record (continuity chain)
SLO                                 p95 < 300ms
SPECIAL                              record_canonical_state_hash
                                  must match current state at
                                  compose time; mismatch rejects
                                  (binding integrity per 11.70)
```

### 2.4 Validate signature envelope (internal)

```
PATH                              internal RPC (not directly
                                  client-exposed)
PURPOSE                            verify envelope when E3 commits:
                                  signers distinct (no self-sign);
                                  factor obligation met;
                                  record-state hash matches at
                                  commit moment;
                                  signers within time window;
                                  per-pack additional checks
                                  (QP / PRRC; ITAR person-of-
                                  record; PCQI presence; etc.)
EVIDENCE EMIT                       validation_event (EC-22);
                                  per-failure: signature
                                  rejected; transaction blocked
SPECIAL                              binding-broken (record state
                                  changed between compose +
                                  commit) → 422 esign/binding-
                                  broken; rare race condition;
                                  client must re-challenge
```

### 2.5 Signature history

```
PATH                              GET /v1/esign/history/
                                  {root_kind}/{root_id}
PURPOSE                            historical signatures for a
                                  record
AUDIENCE                            record-shell UI (audit tab);
                                  audit pack assembly;
                                  inspector portal
RESPONSE                            time-ordered signature events
                                  with: signer, role, AAL,
                                  manifestation, intent,
                                  language, reason-text,
                                  device-attestation, anchor
                                  reference
EVIDENCE EMIT                       access_audit (EC-22)
RATE LIMIT                          medium
```

### 2.6 Manifestation vocabulary

```
PATH                              GET /v1/esign/vocabulary
PURPOSE                            controlled vocabulary of
                                  signature meanings per regulator +
                                  per language
RESPONSE                            list per regulator + per pack:
                                  approve / reject / acknowledge /
                                  review / release / hold / resume /
                                  certify / disposition / qp-release /
                                  prrc-release / counterfeit-
                                  attestation / etc.
                                  per language (per F12)
RATE LIMIT                          high (cached)
```

### 2.7 Per-tenant manifestation override (admin)

```
PATH                              POST /v1/esign/vocabulary/tenant
                                  GET  /v1/esign/vocabulary/tenant
PURPOSE                            tenant-specific manifestation
                                  text per CSR (within regulator
                                  floor)
PRECONDITIONS                       H7 Class A change; Compliance
                                  Lead signoff
RESPONSE                            override config snapshot id
ERRORS                              422 below_floor (rejected)
EVIDENCE EMIT                       config_change (EC-16)
```

### 2.8 Signature revocation (rare; admin)

```
PATH                              POST /v1/esign/revoke/
                                  {signature_record_id}
PURPOSE                            mark signature as revoked
                                  (very rare; per H7 emergency CR;
                                  e.g., signed by mistake, fraud
                                  discovered)
PRECONDITIONS                       Compliance Lead + Quality Lead
                                  joint signoff;
                                  cannot revoke once mutation
                                  committed (audit chain
                                  immutable per H5);
                                  revocation only for signed-but-
                                  not-committed envelopes
                                  (rare race condition);
                                  formally an exceptional admin
                                  action
RESPONSE                            revocation event id
EVIDENCE EMIT                       revocation_record (EC-2 +
                                  EC-22); cross-link
SPECIAL                              true revocation in regulated
                                  ledger does NOT delete prior
                                  signature; adds revocation event;
                                  per 21 CFR 11.10(c) record
                                  protection
```

---

## 3. Authentication + authorization

```
EVERY ENDPOINT                  authenticated session per E1
2.2 STEP-UP                       AAL elevation per command's
                                  obligation (per E1.3);
                                  hardware-token mandatory for
                                  ITAR / CMMC
2.3 COMPOSE                        only valid in challenge window
                                  (typ 90s-5min)
2.5 HISTORY                         per H3 §7 auditor scope;
                                  per record access role
2.7 OVERRIDE                        tenant admin + Compliance Lead
2.8 REVOKE                           Compliance + Quality joint
                                  signoff (multi-sig)
SUB-PROCESSOR                       signing through HESEM ledger;
                                  per L2 §8; rare
```

---

## 4. Idempotency

```
2.1 challenge                       challenge-id (server-generated);
                                  same client + same obligation +
                                  unexpired existing → reuse
2.2 factor                          per signer per challenge;
                                  duplicate factor return same result
2.3 compose                         idempotency-key REQUIRED;
                                  composition is once per challenge;
                                  replay returns same envelope
2.4 validate                         internal RPC; no idempotency
2.7 override                          idempotency required
2.8 revoke                            idempotency required
```

---

## 5. Cross-cutting concerns

```
PROBLEM DETAILS (RFC 9457)        per error class with challenge
                                 + signer + factor detail
                                 (PII redacted)
21 CFR 11.10(c) RECORD            signatures perpetual; cannot
   PROTECTION                      delete; revocation adds event
21 CFR 11.50 MANIFESTATIONS         per-language; per-regulator;
                                 per-pack vocabulary
21 CFR 11.70 BINDING                record-state hash captured at
                                 compose; verified at commit;
                                 mismatch rejects
21 CFR 11.10(j) ACCOUNTABILITY       attestation at session-start +
                                 at sign-time
ANNEX 11 §14                         e-sig criteria mirrored
ISO 13485 §4.2.5                     records of signatures retained
                                 per H5 perpetual
FIPS 140-3                            cryptographic module validated
                                 (ITAR / CMMC tenants);
                                 HSM-backed signing keys;
                                 PQC migration per I7
WEBAUTHN / FIDO2                       primary factor for human users
                                 (phishing-resistant)
ITAR / CMMC                            hardware-token + person-of-
                                 record + AAL3
CONTINUITY CHAIN                       per signature: cryptographic
                                 hash to prior signature for record;
                                 enables audit chain reconstruction
ANTI-REPLAY                            challenge-token nonce;
                                 server-side time check;
                                 per-factor evidence rate-limited
PII REDACTION                            signer identity per role-
                                 access; full identity to auditor
                                 per scope
```

---

## 6. Failure modes (RFC 9457)

```
TYPE                                STATUS  MEANING
esign/challenge-expired             401     time window passed
esign/factor-required                401     additional factor needed
esign/factor-rejected                401     factor verification fail
esign/quorum-incomplete              401     not enough signers
esign/two-person-required           401     2nd signer required
esign/aal-step-up-required           401     elevation needed
esign/binding-broken                 422     record state changed
                                            between compose + commit
esign/self-sign-attempt              422     same signer playing 2 roles
esign/signer-unauthorized             403     signer lacks authority
esign/sub-processor-fail              503     external HSM / token outage
esign/manifestation-not-found         404     manifestation key invalid
                                            for regulator + language
esign/itar-token-required              401     hardware token mandatory
esign/below-floor-config               422     tenant attempted to relax
                                            regulator floor (per L1 §9)
esign/revoke-not-permitted             409     mutation already committed
                                            (per H5 immutability)
ai/banned-signer                        403     AI principal cannot sign
                                            banned-set (per L1)
deprecation/manifestation-sunset       410     manifestation phasing-out
```

---

## 7. SLO + budget

```
2.1 challenge p95                  < 200ms
2.2 factor p95                       < 300ms
2.3 compose p95                       < 300ms
2.4 validate p95                       < 50ms (internal)
2.5 history p95                         < 250ms
2.6 vocabulary p95                       < 100ms (cached)
2.7 override                              admin path
2.8 revoke                                admin path
ERROR RATE                                 per SLO-9 (< 0.1% on write
                                          paths)
```

---

## 8. Wave target

```
W0.5      L4 substrate (challenge + factor + compose);
          test environment
W3        L5 active enforcement (read paths integrated;
          regulated transitions begin enforcement)
W4        L6 binding (11.70) + manifestation (11.50)
          regulator-aligned; FIPS 140-3 modules certified
          where applic
W5        per-pack manifestation (QP / PRRC / DOA / ITAR)
W6        SOC 2 + DORA Elite metrics for write path
W8        ITAR / CMMC hardware-token enforcement (J3)
W10       per-pack overlay GA per J1..J5
W12       PQC migration (per I7) for signing keys
```

---

## 9. Per-pack overlays

```
PHARMA (J1)                      QP signature for Annex 16 release;
                                 Designated Person for US Pharma;
                                 21 CFR 11.10(j) accountability;
                                 mandatory reason text per
                                 mutation; campaign-end signoff
                                 per Pharma sterile
AUTO (J2)                        per-OEM CSR signature variants;
                                 PSW signoff per PPAP submission;
                                 LPA signoff cycle
AERO (J3)                        DOA representative signature;
                                 ITAR / EAR person-of-record
                                 verification; FIPS 140-3
                                 hardware-token mandatory;
                                 GIDEP attestation signoff
MD (J4)                          PRRC signature per MDR Art 15;
                                 vigilance reportability signoff;
                                 PSUR conclusion signoff;
                                 risk-acceptability signoff per
                                 ISO 14971
FOOD (J5)                        PCQI signoff per Food Safety
                                 Plan; HACCP plan reauthorization
                                 (BD-26); recall classification
                                 signoff (BD-27)
```

---

## 10. Failure modes (operational)

```
FM1   Challenge expired during slow user
      Behavior: 401 esign/challenge-expired
      Recovery: client re-initiate; per H8 if pattern
              (UI friction calibration)

FM2   Factor rejected (e.g., wrong TOTP)
      Behavior: 401 esign/factor-rejected
      Recovery: anti-bruteforce rate-limit;
              account lockout after N attempts

FM3   Two-person required but only one available
      Behavior: 401 esign/quorum-incomplete
      Recovery: per L1 §9; alternative quorum member
              (per delegation policy);
              for regulated: no delegation allowed

FM4   Binding broken (record changed between compose +
      commit)
      Behavior: 422 esign/binding-broken
      Recovery: client re-challenge with current state;
              rare race condition

FM5   Hardware token unavailable (ITAR)
      Behavior: 401 esign/itar-token-required
      Recovery: provisional access only; per J3 §5;
              SEV per cyber if breach

FM6   AI principal attempts to sign
      Behavior: 403 ai/banned-signer
      Recovery: per L1 §4 triple defense;
              SEV-1 if bypass

FM7   Sub-processor signing service down
      Behavior: 503 esign/sub-processor-fail
      Recovery: per L2 §2 on_failure_behavior;
              delayed signing; per I3 incident

FM8   Manifestation vocabulary not localized
      Behavior: 404 esign/manifestation-not-found
      Recovery: per F12 i18n; English fallback per
              regulator allow

FM9   Continuity chain broken (per L2 hash mismatch)
      Behavior: SEV-1; signature audit chain integrity
              compromised
      Recovery: per RB-INC-009 per H1 §3

FM10  Revoke attempted post-commit
      Behavior: 409 esign/revoke-not-permitted
      Recovery: per H5 immutability; alternative
              compensating action per H7
```

---

## 11. Roles and authority (RACI)

```
ENDPOINT             COMP  PLAT  TENANT  CALLER  AUDITOR  AI
2.1 challenge        A     A     -       R       -        -
2.2 factor           -     A     -       R       -        -
2.3 compose          -     A     -       R       -        -
2.4 validate         -     A     -       -       -        -
2.5 history          A     -     R       R       R        -
2.6 vocabulary       A     -     -       R       -        -
2.7 override         A     -     A       -       -        -
2.8 revoke           A     A     -       -       -        -
                     (Compliance + Quality joint)
```

---

## 12. Cross-references

- B6 — RBAC / ABAC; identity binding
- E0 — API conventions
- E1 — identity + AAL step-up
- E2 — authority decision precedes signature
- E3 — workflow command consuming envelope
- E6 — audit chain anchor
- E8 — evidence per signature
- E10 — signature notification (where applic)
- F5 + F11 + F12 — UI sign flow + a11y + i18n
- H1 §4 — clauses cited (11.50, 11.70, Annex 11 §14, ISO
  13485 §4.2.5)
- H4 — signature_record (EC-2)
- H5 — perpetual retention
- I7 — FIPS 140-3 + WebAuthn + PQC
- L1 — banned-decision boundary
- M5 — SLO-9 surrogate
- M9 — cross-reference

---

## 13. Decision phrase

```
E7_ESIGNATURE_API_BASELINE_LOCKED
NEXT: E8_EVIDENCE_API.md
```

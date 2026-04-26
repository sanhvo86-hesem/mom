# E7 — Electronic Signature API

```
api_family:     Electronic Signature
owner_role:     Compliance Lead
scope:          21 CFR Part 11 / Annex 11 e-signature flows
```

---

## 1. Purpose

The E-Signature API supports the electronic signature flows for
regulated transitions. It is consulted by the Workflow API when a
command's authority obligation includes e-signature.

---

## 2. Endpoints

### E7.1 — Initiate signature challenge

**Purpose**: Begin a signature challenge for a specific transition.

**Audience**: UI surfaces preparing to capture a signature.

**Request**: target root, target record, intended transition, signature
meaning.

**Success**: Signature challenge token + obligation details (factor
count required, signers required, time window).

### E7.2 — Submit factor verification

**Purpose**: For each signer, verify a factor (password, TOTP, U2F,
HSM smart card, biometric).

**Audience**: UI surfaces during signature capture.

### E7.3 — Compose signature envelope

**Purpose**: Assemble verified factors into the signature envelope for
inclusion in the command (E3.1).

**Audience**: UI client.

**Idempotency**: idempotency-key required (composition is once per
challenge).

### E7.4 — Validate signature envelope (server-side)

**Purpose**: Verify the signature envelope (signers distinct, factors
match obligation, record_canonical_state_hash matches current state,
signers within time window).

**Audience**: Internal to Workflow API; not directly exposed.

### E7.5 — Signature history

**Purpose**: Retrieve historical e-signatures for a record.

**Audience**: Record Shell UI (audit tab), audit pack generator.

### E7.6 — Signature meaning vocabulary

**Purpose**: Retrieve the controlled vocabulary of signature meanings
(approval, disposition, release, certification, etc.) per regulated
context.

---

## 3. Authentication and authorization

All endpoints require authenticated session. E7.2 (factor verification)
specifically supports step-up authentication (E1.3).

---

## 4. Idempotency

E7.3 (compose envelope): idempotent within the challenge window.

---

## 5. Failure modes

```
- esign/factor-required                401
- esign/factor-rejected                401
- esign/session-expired                401 (challenge expired)
- esign/two-person-required             401 (insufficient signers)
- auth/forbidden                        403
- contract/schema-violation             422
```

---

## 6. Wave target

L4 by W0.5 (substrate); active enforcement starting W3.

---

## 7. Decision phrase

```
E7_ESIGNATURE_API_BASELINE_LOCKED
NEXT: E8_EVIDENCE_API.md
```

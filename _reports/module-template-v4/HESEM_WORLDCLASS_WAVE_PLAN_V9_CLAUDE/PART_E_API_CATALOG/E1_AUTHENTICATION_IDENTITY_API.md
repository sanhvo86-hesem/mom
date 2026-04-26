# E1 — Authentication & Identity API

```
api_family:     Authentication & Identity
owner_role:     Identity Lead
scope:          OIDC authentication, session management, role assignment,
                tenant membership, MFA
```

---

## 1. Purpose

This API family handles every authentication and authorization concern.
It is the first API any caller touches; without it, no other API in
HESEM is callable.

---

## 2. Endpoints

### E1.1 — Authentication challenge / login

**Purpose**: Authenticate a user and issue a session token.

**Audience**: HESEM UI (L6); rarely direct external systems (most use
service-account tokens via E1.4).

**Request**: User credentials (typically delegated to the customer's
OIDC provider; HESEM does not store passwords directly).

**Success**: Session token (JWT) with claims for identity, roles,
tenant memberships, MFA factors, and issuance time.

**Failure modes**: Invalid credentials, account locked, MFA required,
tenant mismatch.

### E1.2 — Authentication refresh

**Purpose**: Refresh an expiring session token.

**Audience**: UI clients with refresh tokens.

**Idempotency**: yes (refresh token is single-use; re-use is rejected).

### E1.3 — Step-up authentication

**Purpose**: Re-authenticate with stronger factors for sensitive actions
(e.g., e-signature on regulated transition).

**Audience**: Same user, when an action requires step-up.

**Request**: Additional factor verification (TOTP, U2F, HSM smart card,
biometric).

**Success**: Step-up assertion good for a short window (default 5
minutes).

### E1.4 — Service-account token

**Purpose**: Obtain a token for a service principal (machine-to-machine).

**Audience**: External integrations, CI pipelines, partner connectors.

### E1.5 — Logout / session invalidation

**Purpose**: End a session.

### E1.6 — User self-service

**Purpose**: Allow users to update their own profile (name, contact,
preferences). Limited subset of data; identity-affecting changes route
through admin.

### E1.7 — Permission decision (the /can endpoint)

**Purpose**: Given subject, action, resource, return permit / deny /
not-applicable. The decision endpoint per L1 (PART_B1).

**Audience**: HESEM core services; UI surfaces calling /can to determine
button state.

**Idempotency**: yes; same input returns same answer (within cache TTL).

### E1.8 — Permission obligation evaluation

**Purpose**: When /can returns permit-with-obligations, evaluate which
obligations apply (e-signature factors required, reason-for-change,
validation evidence freshness, etc.).

### E1.9 — User management (admin)

**Purpose**: Create / update / suspend / terminate users.

**Audience**: HR Lead, Identity Lead.

### E1.10 — Role management (admin)

**Purpose**: Author roles; map roles to permission claims; assign roles
to users.

**Audience**: Identity Lead.

### E1.11 — Tenant membership management

**Purpose**: Add or remove a user's tenant membership.

### E1.12 — MFA factor enrollment

**Purpose**: Enroll a user's MFA factor (TOTP, U2F key, HSM smart
card, biometric).

### E1.13 — MFA factor revocation

**Purpose**: Revoke a compromised or lost factor.

### E1.14 — Audit access log lookup

**Purpose**: Retrieve a user's recent authentication and access events
(for self-service incident review).

---

## 3. Authentication and authorization

This API family is itself the authentication layer. Endpoints E1.1 to
E1.5 are unauthenticated (with request-level controls) or use a
short-lived assertion. Endpoints E1.6 to E1.14 require an authenticated
session.

Role-based access:
- Self-service endpoints (E1.6, E1.12, E1.13): user themselves
- Admin endpoints (E1.9, E1.10, E1.11): Identity Admin role
- Permission decision (E1.7, E1.8): any service principal in HESEM core

---

## 4. Idempotency, ETag, concurrency

- E1.1, E1.4 (token issuance): not idempotent (each request issues a
  new token; tokens have unique JTI).
- E1.2 (refresh): single-use idempotency.
- E1.7 (/can decision): idempotent within cache TTL (60 seconds).
- E1.9 to E1.13 (admin mutations): idempotency-key required.

ETag on user/role records.

---

## 5. Failure modes

```
- auth/unauthorized               401
- auth/forbidden                  403
- auth/session-expired            401
- esign/factor-required           401 (when step-up needed)
- esign/factor-rejected           401
- tenant/boundary-violation        403
- rate-limit/exceeded             429
```

---

## 6. Versioning

Major version bump for breaking changes. Authentication API has the
strongest backward-compat discipline because customers' integrations
depend on it.

---

## 7. Wave target

L4 by W0.5; L7 by W12.

---

## 8. Decision phrase

```
E1_AUTHENTICATION_IDENTITY_API_BASELINE_LOCKED
NEXT: E2_AUTHORITY_API.md
```

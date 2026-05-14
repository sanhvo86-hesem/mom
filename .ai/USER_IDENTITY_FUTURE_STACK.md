# User Identity & Access Management — Recommended Future Stack

**Audience:** HESEM founder/owner, future architects, AI assistants extending the auth layer.

**Status:** Forward-looking design. Not implemented. The *current* SSOT contract is in `.ai/USER_IDENTITY_SSOT.md`; this document recommends where to move *next* when the team is ready to invest.

**Why this doc exists:** HESEM MOM today carries a custom PHP auth + bcrypt password storage + role keys in a `ROLES` const + RBAC permissions in a Postgres JSONB column. That stack got the system to ISO 9001:2026 readiness but is reaching its limits. To stay world-class in 3–5 years we need to plan the migration to a standards-based identity layer.

---

## Honest assessment of the current state

### What works today
- `users.json` is the write-primary identity SSOT, gitignored, mutated only via `DataSyncMutationService` with audit_events row + snapshot.
- `users` table is the database-side SSOT, dual-written via `AuthUserShadowSyncService`.
- `roles.permissions` JSONB column is the RBAC SSOT (per migration 173).
- `v_user_canonical` view is the canonical read source (per migration 178).
- `trg_employees_role_drift_audit` trigger surfaces dual-write divergence.
- `audit_events` table has hash-chained event sourcing (ISO ALCOA+ compliant).
- `mom/tools/release/check_user_identity_ssot.php` blocks future violations at CI.

### What hurts today
- **Bcrypt password storage** — old algorithm, not memory-hard. Argon2id is the current OWASP recommendation.
- **Custom PHP session management** — no rotation policy, no fingerprinting, vulnerable to fixation if cookies leak.
- **No federated SSO** — every user has a HESEM-managed password instead of using their Microsoft/Google work account.
- **MFA is TOTP-only** — passkeys (FIDO2/WebAuthn) are now the industry standard.
- **Role keys split across two `_ROLE_MIGRATE` mirrors** (`01-data-config.js` + `02-state-auth-ui.js`) — tracked tech debt.
- **`employees.employee_name/role_code/role_label` denormalized cache** — sync-protected by trigger but not structurally impossible. The drop attempted in migration 179→rolled back via 180 because the schema-authority registry generator (canonical_publication_orchestrator.py) has pre-existing bugs (`audit_event_chain` domain mapping, `business_contract_bundle` reference validation). Real fix needs the registry generator to be hardened first.
- **No column-level encryption for PII** — CCCD, phone, personal_email sit in plaintext in users.json + Postgres.
- **No row-level security (RLS)** for multi-tenant isolation — if HESEM ever onboards a second factory or external auditor, the current code-level checks aren't a defensible boundary.
- **No SCIM endpoint** — manual user lifecycle, no automated provisioning from HR system.

---

## Recommended target stack

Three independent options for the team to evaluate. They differ on operational complexity vs. control.

### Option A — Self-hosted Keycloak (recommended for HESEM)

**Why this fits HESEM specifically:**
- Self-hosted = data stays in Vietnam (no offshore PII transfer, no GDPR adequacy issues).
- Open source, no per-MAU pricing, no vendor lock-in.
- Battle-tested in regulated/manufacturing contexts (Red Hat ships it as Red Hat Build of Keycloak; Bosch, Siemens, Wabtec all run it).
- Provides OIDC, SAML, OAuth2, SCIM 2.0, WebAuthn, TOTP, account-recovery, account-lockout, password policies, theme customization — all out of the box.
- Java/Quarkus stack — adds one runtime dependency to your platform but the operational model is well-understood.
- Federation: connect Keycloak to Microsoft Entra ID (Azure AD), Google Workspace, LDAP/AD via standard adapters — users sign in with their work account if HESEM moves to one later.

**Architecture:**
```
                   ┌──────────────────────────────────────────┐
                   │ Browser / mobile app                     │
                   └────────────────┬─────────────────────────┘
                                    │ OIDC authorization code + PKCE
                                    ▼
                   ┌──────────────────────────────────────────┐
                   │ Keycloak (Quarkus, JVM)                  │
                   │ - Realm: hesem                            │
                   │ - Clients: mom-portal, mom-mobile, mom-api│
                   │ - Identity providers: optional Entra ID  │
                   │ - User federation: SCIM from HR system   │
                   │ - MFA: TOTP, WebAuthn passkeys, recovery │
                   │ - Password policy: Argon2id, length 12+, │
                   │   breach-check (HIBP)                    │
                   └────────────────┬─────────────────────────┘
                                    │ User database backing
                                    ▼
                   ┌──────────────────────────────────────────┐
                   │ PostgreSQL (existing instance)           │
                   │ - keycloak schema: user_entity, etc.     │
                   │ - public schema: users table is the      │
                   │   business-identity SSOT, syncs to       │
                   │   keycloak via SCIM.                      │
                   └──────────────────────────────────────────┘

                   ┌──────────────────────────────────────────┐
                   │ MOM Portal (PHP)                         │
                   │ - JWT validation via Keycloak JWKs       │
                   │ - Role mapping: JWT `realm_access.roles` │
                   │   → ROLES const + roles.permissions JSONB│
                   │ - Token refresh handled by mod_auth_openidc│
                   │   or php-jwt middleware                  │
                   │ - audit_events still written by app      │
                   └──────────────────────────────────────────┘
```

**Authorization split:**
- **Coarse-grained** (who can log in, what role they have, MFA enforced): Keycloak.
- **Fine-grained** (which fields they can edit on a CAPA, which suppliers they can quote): `roles.permissions` JSONB + custom policy engine, evaluated server-side at API call.

**Operational footprint:**
- 1 Keycloak container, 512MB RAM minimum, 1GB recommended.
- Shares the existing PostgreSQL.
- Backed up by existing `pg_dump` schedule.
- Realm export checked into git for IaC.

---

### Option B — Ory stack (Kratos + Keto + Oathkeeper)

**When this fits better:**
- If the team wants to stay in Go-tooling territory (no JVM ops).
- If you want each concern in its own service (identity vs policy vs proxy).
- If you anticipate scaling beyond a single factory and need genuinely cloud-native scaling.

**Trade-offs vs Keycloak:**
- More services to operate (3 binaries vs 1).
- Less batteries-included UI — Kratos has no admin console by default; you build it.
- Modern, well-engineered, but smaller community than Keycloak.

Not recommended for HESEM today — Keycloak gives 90% of the value with 30% of the operational complexity.

---

### Option C — Cloud-managed IdP (Auth0, Okta, Microsoft Entra External ID)

**When this fits:**
- If HESEM is willing to send user PII (email, full_name, MFA secrets) to a US cloud vendor.
- If you want a single bill instead of running your own service.
- If you're sure you won't outgrow the free tier (Auth0 free = 25k MAU, Entra External ID free = 50k MAU).

**Why NOT recommended for HESEM:**
- Vietnamese personal data law (Decree 13/2023) increasingly restrictive on cross-border PII transfer.
- ISO 9001:2026 customer audits will ask "where is the user data?" — "in our DC on Vietnamese soil" is the easy answer.
- Lock-in: migrating 1000 users out of Auth0 in 3 years is painful.
- Cost grows non-linearly past the free tier.

Use this option only for a pure-cloud SaaS rewrite, which HESEM isn't doing.

---

## Recommended phased migration plan

Each phase is independently shippable and reversible.

### Phase 0 — Tighten the current stack (1 sprint)
**Goal:** Close the bcrypt/MFA gaps before any architecture move.

- Migrate password hashes from bcrypt to Argon2id with `password_hash($p, PASSWORD_ARGON2ID, ['memory_cost' => 65536, 'time_cost' => 4, 'threads' => 3])`. Re-hash on next successful login.
- Add a password policy: minimum 12 chars, must not be in the HIBP breached-password list (call `https://api.pwnedpasswords.com` with k-anonymity).
- Enforce MFA on all `ROLES[role].admin === true` users (CEO, qa_manager, it_admin, hr_manager).
- Add session rotation: every authenticated request rotates the session ID; logout invalidates server-side.
- Add a `last_password_changed_at` column on `users` and force change at 365 days for privileged roles.
- Encrypt `users.metadata->>'cccd'` at rest with `pgcrypto` (`pgp_sym_encrypt` / `pgp_sym_decrypt`), key in env, never in audit logs.

**Outcome:** No more low-hanging compliance gaps. Foundation for Phase 1.

### Phase 1 — Stand Keycloak up alongside (1 sprint)
**Goal:** Keycloak runs but isn't authoritative yet.

- Deploy Keycloak via Docker, point at existing Postgres (new schema `keycloak`).
- Provision realm `hesem` with realistic password policy (Argon2id, complexity, expiry).
- Sync existing 80 users from `users` table → Keycloak via SCIM bulk import. Users get an email "set your new password" link. Keep the old PHP auth working in parallel.
- Add Keycloak as an OIDC identity provider option on the login page (button: "Sign in with HESEM SSO"). Old form-based login still works.
- Audit who uses which path.

**Outcome:** Keycloak proven in production for opt-in users. Old path untouched.

### Phase 2 — Enforce Keycloak for privileged roles (1 sprint)
**Goal:** No more bcrypt password for admins.

- Disable form-based login for `ROLES[role].admin === true` users. They MUST go through Keycloak (forces MFA + Argon2id).
- Replace MFA bypass paths in `mom/api.php` with JWT scope checks.
- Add SCIM endpoint at `/api/v1/scim/v2/Users` so an external HR system (or Keycloak) can push user-lifecycle events.

**Outcome:** All admins authenticate through Keycloak. MFA enforced. PHP code reads identity from JWT, not session cookie.

### Phase 3 — Migrate remaining users + retire custom auth (2 sprints)
**Goal:** Single auth path.

- Run a 30-day notice campaign: "Form login is being retired, set your SSO password."
- Convert remaining operators (CNC, deburr, QC) to Keycloak. Mobile-first: WebAuthn / passkeys on Android tablets at the shop floor.
- Once usage on form login drops to zero, remove the form login route.
- Drop `users.password_hash` column (Keycloak owns passwords).
- `AuthUserShadowSyncService` becomes a one-way sync FROM Keycloak TO `users` for the business projection (full_name, role, dept, title). The HR system can also write directly via SCIM.

**Outcome:** One auth path. Custom auth code deleted. Bcrypt gone from the repo.

### Phase 4 — Drop the duplicate `employees` columns (1 sprint)
**Goal:** Close the SSOT loop that migration 179→180 left open.

- Fix the registry generator bugs blocking migration 179 (`audit_event_chain` domain mapping in `generate-table-architecture.mjs`, business_contract_bundle validation in `generate_business_contract_bundle.py`).
- Refactor the remaining readers of `employees.employee_name/role_code/role_label` to use `v_user_canonical`. Use the CI guard's allowlist as the authoritative reader list.
- Migration 181: `ALTER TABLE employees DROP COLUMN employee_name, role_code, role_label;`
- Re-run `canonical_publication_orchestrator.py` to regenerate the registry.
- Remove the drift trigger (its target column is gone).

**Outcome:** Structurally impossible for `employees` to disagree with `users` on identity.

### Phase 5 — Row-level security + multi-tenancy (1 sprint, only when needed)
**Goal:** Defensible isolation if HESEM ever onboards a 2nd factory or external auditor.

- Add `org_plant_id` filter to every query via PostgreSQL Row-Level Security policies.
- Map Keycloak realm-roles to RLS roles: `mom_app_factory_a`, `mom_app_factory_b`, `mom_app_auditor`.
- Auditor role gets `SELECT` only, scoped by `org_plant_id`.
- This phase is no-cost if not needed, but the foundation should land in Phase 1 (the `users.org_plant_id` column already exists).

**Outcome:** Customer audits can read evidence without seeing the other factory's data.

### Phase 6 — Federate with Microsoft Entra ID / Google (when HESEM IT is ready)
**Goal:** Single corporate account for HESEM staff.

- Configure Keycloak's external identity provider for Entra ID / Google Workspace.
- New employees onboard via HR → Entra ID → SCIM → Keycloak → `users` table.
- Offboarding is one click in HR.

**Outcome:** True corporate SSO. New employee productive on day 1.

---

## What to NOT do

- **Do not write your own MFA flow.** Use Keycloak's WebAuthn / TOTP. Custom MFA = months of bugs.
- **Do not store secrets in `users.json`.** Move `password_hash`, `mfa_secret`, `cccd` to Postgres with `pgcrypto` *before* Phase 1 even if you keep custom auth.
- **Do not invent a new role keyword.** The ROLES const is the SSOT. Adding a new role = (a) add to `ROLES` const, (b) add to `roles` table via migration, (c) update RBAC policy in `roles.permissions`. Three places, all in this repo, all guarded by the CI check.
- **Do not assume Keycloak adoption means deleting Postgres `users`.** Keep `users` as the business-identity projection; Keycloak is the auth-identity authority. Two complementary roles, not redundant.
- **Do not skip Phase 0.** Bcrypt + no MFA + 12-char passwords without breach-check is below the floor for ISO 9001:2026 in 2026. Phase 0 alone delivers 70% of the compliance value of full Keycloak adoption.

---

## Reference reading

- Keycloak docs: https://www.keycloak.org/documentation
- OWASP Authentication Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html
- OWASP Password Storage Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
- NIST SP 800-63B (Digital Identity Guidelines, Authentication): https://pages.nist.gov/800-63-3/sp800-63b.html
- ISO/IEC 27001:2022 Annex A, control A.9 (Access Control).
- Vietnam Decree 13/2023 on Personal Data Protection.

---

## Decision call — when to start Phase 0

Start Phase 0 the next time the team has 1 sprint of slack. Do not wait for "the right moment" — bcrypt and the no-MFA defaults are silently aging. Phase 0 is 100% PHP work in the existing repo and is independently valuable even if Phases 1–6 never happen.

For Phase 1 (Keycloak), wait until:
- HESEM has at least 1 person who can read a Java stack trace (Keycloak operational debugging).
- OR HESEM is willing to use Red Hat Build of Keycloak with paid support.
- The team has time for the 2-week deploy + a 30-day soak period before turning on for production.

If neither is true, stay on Phase 0 indefinitely. The current architecture is *fine* at HESEM's scale with Phase 0 hardening.

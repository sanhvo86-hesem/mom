# HESEM Keycloak — Phase 1 deployment artifacts

This directory contains everything needed to stand up Keycloak on the HESEM
VPS in **parallel** to the existing PHP auth, per Phase 1 of
[.ai/USER_IDENTITY_FUTURE_STACK.md](../../.ai/USER_IDENTITY_FUTURE_STACK.md).

**Status:** artifacts only. NOT running in production yet. The team must
consciously trigger `bash scripts/up.sh` to deploy.

## Why it's not auto-deployed

Installing Docker + standing up a Java service on a production HESEM VPS
is a major operational change. It introduces:

- A new runtime (Docker engine, systemd unit `docker.service`).
- A new long-running JVM process (~768 MiB RAM commit).
- A new PostgreSQL database (`keycloak` schema, separate from `mom`).
- A new public-facing path under `/auth/` on the existing nginx vhost.
- A new pager target if Keycloak ever crashes.

An autonomous AI session can write the configs (this directory) but
should not flip the switch without the team's explicit go-ahead.

## What's here

| File | Purpose |
|---|---|
| `docker-compose.yml` | Single-service Keycloak 25.x bound to 127.0.0.1:8080, backed by existing PostgreSQL, with realm import on first start. |
| `realm/hesem-realm.json` | Realm definition: clients (mom-portal public + mom-api confidential), 18 RBAC roles matching HESEM's ROLES const, password policy (Argon2id 12+ char + complexity), TOTP MFA, WebAuthn support, brute-force lockout, VI/EN locales. |
| `scripts/up.sh` | Idempotent deploy: install Docker if missing, generate secrets file, ensure PG keycloak DB exists, `docker compose up -d`, wait for healthcheck. |
| `scripts/down.sh` | Stop the container (keeps DB + volume). |
| `scripts/sync-users-from-json.php` | One-shot SCIM-equivalent: push all 80 HESEM users from `users.json` into the running Keycloak realm via the Admin API. Idempotent; passwords NOT pushed (users do "forgot password" on first KC login). |

## Phase 1 deployment runbook

```bash
# On the VPS as root:

cd /var/www/eqms.hesemeng.com

# 1. Bring Keycloak up.
sudo bash tools/keycloak/scripts/up.sh
# Wait for the "Keycloak is UP." message.

# 2. Configure nginx to proxy /auth/ → 127.0.0.1:8080
#    (sample server block under nginx-snippet.conf in this directory once
#    written; not auto-applied because nginx changes need ops review)

# 3. Verify admin console reachable from your browser:
#    https://eqms.hesemeng.com/auth/
#    Log in as kc-admin / <password from /var/www/data-private/secrets/keycloak.env>

# 4. Sync the 80 HESEM users into the realm.
sudo -u www-data php tools/keycloak/scripts/sync-users-from-json.php \
  --kc-url http://127.0.0.1:8080/auth \
  --realm hesem \
  --admin-user kc-admin \
  --admin-password "$(grep KEYCLOAK_ADMIN_PASSWORD /var/www/data-private/secrets/keycloak.env | cut -d= -f2-)"

# 5. Test SSO from one volunteer admin account:
#    a) In Keycloak, send them a "Reset password" email.
#    b) They set a new Argon2id password under KC's policy.
#    c) From the MOM portal, click "Sign in with HESEM SSO".
#    d) OIDC redirect to KC, they log in, redirect back, session active.
#    Confirm the rest of the portal still works under the new JWT-derived role.

# 6. Once 1+ volunteer confirms, schedule the 30-day opt-in window.
#    During that window:
#    - Form login still works (PHP custom auth).
#    - KC login works (OIDC).
#    - admin_security_audit endpoint shows both populations.
```

## Tear-down (during the parallel-run period only)

```bash
sudo bash tools/keycloak/scripts/down.sh
# Container stops; PostgreSQL keycloak DB and docker volume preserved.
# To purge:
sudo docker volume rm hesem-keycloak_keycloak_data
sudo -u postgres dropdb keycloak
sudo -u postgres psql -c "DROP ROLE keycloak"
```

## What still needs writing before flipping to Phase 2

1. `nginx-snippet.conf` — proxy `/auth/` to `127.0.0.1:8080` with X-Forwarded headers.
2. PHP middleware to validate Keycloak-issued JWTs (introduce
   `mom/api/services/JwtAuthService.php` using the standard `firebase/php-jwt`
   library; verify against `/auth/realms/hesem/protocol/openid-connect/certs`).
3. Login UI button "Sign in with HESEM SSO" wired to the OIDC authorization-code
   flow (PKCE; redirect to `/auth/realms/hesem/protocol/openid-connect/auth`).
4. JWT-to-PHP-session bridge in `set_authenticated_session()` so the existing
   role/RBAC machinery continues to work without rewrite.
5. Role-mapper test: confirm `realm_access.roles` claim resolves to the same
   `ROLES[role]` entry that the existing custom auth produces.

Items 1–5 are concrete next steps for whoever picks up Phase 2. Each is
independently shippable.

## What this doc explicitly does NOT cover

- WebAuthn / passkey rollout to operators (Phase 3 — needs USB security keys
  or device-bound credentials for shop-floor tablets).
- Federation with Microsoft Entra ID / Google Workspace (Phase 6 — HESEM IT
  needs an Entra tenant).
- Multi-tenant realms (Phase 5 — only if HESEM onboards a second factory).

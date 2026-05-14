# User Identity Single Source of Truth — MANDATORY POLICY

**Audience:** AI assistants (Claude, Codex, GPT, etc.) and human developers working on this codebase.

**Status:** Authoritative. Violations are caught by `mom/tools/release/check_user_identity_ssot.php` and blocked by the deploy CI guard. CLAUDE.md and AGENTS.md reference this document.

**Scope:** Anything that identifies a human (username, employee_id, full_name, email, role, dept, title, position, avatar, mfa_enabled, phone, cccd, etc.). Customer-portal users (`portal_users`), supplier-portal users (`srm_supplier_portal_users`), and party-master entities (`party`) are intentionally separate and **not** covered by this doc.

---

## The hard rules

1. **No new user-data table.** Never `CREATE TABLE` with a `username`, `full_name`, `email`, `password_hash`, `role`, `dept`, `title`, or `employee_name` column unless the new table extends `hcm_*` (HR specialty data, FK-only to `hcm_employees.employee_id`) or is a portal-users subtype (customer/supplier). If you think you need a new user table, you don't — extend `users` or `hcm_employees` instead.

2. **No hardcoded role strings.** Role identifiers (`'ceo'`, `'cnc_operator'`, `'process_engineer'`, …) are defined exactly once in `mom/scripts/portal/01-data-config.js` as the `ROLES` const. Frontend code reads via `ROLES[key]` or `window.ROLES`. Backend reads via the `roles` table (RBAC SSOT per migration 173). Defaults are `DEFAULT_NEW_USER_ROLE` (frontend) / SQL DEFAULT on `users.primary_role_id` (backend). Both are guarded by load-time asserts.

3. **No direct write to `users.json` outside `DataSyncMutationService`.** Never `vi`, `sed`, `cat >`, `python -c "json.dump"`, or any direct file mutation of `mom/data/config/users.json`. All identity mutations go through the `admin_user_upsert` API → `DataSyncMutationService` → snapshot + audit_events row. This rule applies to the VPS too — see CLAUDE.md "MANDATORY: VPS deployment policy".

4. **No direct write to `users`, `employees`, or `hcm_employees` tables outside `AuthUserShadowSyncService`.** Application code reads through `v_user_canonical` and writes through the service. The service is the single dual-write boundary that keeps the three tables in sync. Anywhere else doing `INSERT INTO users` / `UPDATE employees SET role_code` will be flagged by the CI guard.

5. **Read through `v_user_canonical`.** When you need "the user record" or "this employee's role/dept/title", `SELECT FROM v_user_canonical WHERE …`. Do **not** JOIN `users + employees` manually — that pattern was the root cause of the 6-user role drift incident (canh.nguyen, duyen.doan, quan.tran, thi.le, tu.vu, vinh.do — see migration 178 background).

6. **No demo / seed / mock user injection at runtime.** Frontend code that needs a fake user for an empty state must render an empty placeholder, not push synthetic rows into `window.USERS` or `USERS`. The `let USERS = []` declaration in `01-data-config.js:11` is annotated *"Server-side auth SSOT. Admin screens must not inject local demo users."* — respect it.

7. **One bootstrap, one runtime.** For every `mom/data/config/foo.json` runtime file there is a `foo.bootstrap.json` git-tracked seed. Do **not** create a third file (`foo.local.json`, `foo.test.json`, `foo.dev.json`, …). The bootstrap+runtime pair is intentional; a third file is duplication. The bootstrap is the cold-start seed; runtime is the live mutable state.

8. **Role migration is centralized.** The `_ROLE_MIGRATE` map in `01-data-config.js:28-44` (and the legacy mirror in `02-state-auth-ui.js:2281`) is the one place to add a legacy-role-key rename. Do not invent ad-hoc migration logic per controller. The two `_ROLE_MIGRATE` mirrors are tracked as known technical debt; new code must reference the `01-data-config.js` version.

9. **`title` is JD-canonical, `jd_title` is the original.** `users.title` (and the file-side `users.json[user].title`) is normalized by `portal_auth_normalize_user_linkage()` against the JD catalog when `hcm_position_id` is set. The user-supplied title is preserved in `jd_title`. If you want to display the user-typed string, read `jd_title`; if you want the canonical position name, read `title`. Never invent a third title field.

10. **Audit every mutation.** Every `admin_user_upsert`, `admin_user_reset_password`, deactivation, role grant, MFA flip writes an `audit_events` row via `DataSyncMutationService`. If you're tempted to skip the audit for a "small admin fix", you are violating ISO ALCOA+ "Original" — reroute through the service.

---

## The architectural map

```
                  ┌─────────────────────────────────────────────┐
                  │ mom/data/config/users.json   (write-primary)│  ← gitignored runtime
                  │ mom/data/config/users.bootstrap.json (seed) │  ← git-tracked
                  └────────────────────┬────────────────────────┘
                                       │
                                       │ syncUser() — only legal writer
                                       ▼
                  ┌─────────────────────────────────────────────┐
                  │ AuthUserShadowSyncService::syncUser()       │
                  │ • Writes to users  (identity)                │
                  │ • Writes to hcm_employees (HR fields)        │
                  └────────────────────┬────────────────────────┘
                                       │
                ┌──────────────────────┼──────────────────────┐
                ▼                                             ▼
       ┌────────────────┐                            ┌─────────────────┐
       │  users table   │  ← identity SSOT in DB     │  hcm_employees  │  ← HR-specific
       │ username       │                            │  employee_id (FK)│
       │ full_name      │                            │  hcm_position_id │
       │ email          │                            │  payroll_group   │
       │ primary_role_id│ ──┐                        │  citizenship     │
       │ employee_id    │   │                        │  emergency_*     │
       └────────────────┘   │                        └─────────────────┘
                            ▼                                ▲
                  ┌──────────────────┐                       │
                  │  roles table     │                       │
                  │ role_id (PK)     │                       │
                  │ role_code        │  ← RBAC SSOT           │
                  │ role_label_vi    │  (migration 173)       │
                  │ permissions JSONB│                       │
                  └──────────────────┘                       │
                                                              │
                  ┌─────────────────────────────────────────┬─┘
                  │   v_user_canonical (READ source)        │
                  │   JOIN users + roles + hcm_employees    │  ← migration 178
                  │   Returns one row per non-deleted user. │
                  │   ALL READERS MUST USE THIS VIEW.       │
                  └─────────────────────────────────────────┘
```

**Quarantined / legacy:**
- `employees` table — exists for backwards compat (KPI counters, projections). Its identity columns (`employee_name`, `role_code`, `role_label`) are slated for removal in migration 179 once the last two readers (`mom/api.php:5046`, `mom/database/DataLayer.php:2244`) are refactored to `v_user_canonical`. **Do not add new readers to `employees`.** Drift on `employees.role_code` is detected by the `trg_employees_role_drift_audit` trigger and written to `audit_events.event_type='employees_role_drift_detected'`.

- `role_permissions.json` — deprecated (memory: architecture_rbac_authority.md). The SSOT is `roles.permissions` JSONB column.

**Out of scope (different users, intentionally separate):**
- `portal_users` — B2B customer portal accounts. Not HESEM employees.
- `srm_supplier_portal_users` — Supplier portal accounts. Not HESEM employees.
- `party` / `graphics_regulated_entity` — Entity registry for customers, vendors, parties.

---

## Recipes

### Add a new field to user identity

1. Add the column to the `users` table via a new migration (e.g. `179_users_add_<field>.sql`).
2. Extend `v_user_canonical` to expose the column.
3. Extend `AuthUserShadowSyncService::syncUser()` to write the field from `users.json`.
4. Extend the JSON schema in `users.bootstrap.json` to document the field.
5. Update `RUNTIME_CONFIG_REGEX` if your field affects deploy capture/restore.
6. Run `php mom/tools/release/check_user_identity_ssot.php` locally — should report **`user identity ssot clean`**.

### Read user data in a new feature

```php
// ✅ Correct
$row = $db->query('SELECT username, role_code, role_label, dept_code FROM v_user_canonical WHERE username = :u', [':u' => $username])->fetch();

// ❌ Forbidden — manual join, will drift
$row = $db->query('SELECT u.username, e.role_code FROM users u JOIN employees e ON e.user_id = u.user_id WHERE u.username = :u', [':u' => $username])->fetch();
```

### Mutate user data in a new feature

```php
// ✅ Correct — single legal writer
$service = new AuthUserShadowSyncService($rootDir);
$service->syncUser($userArray);  // also updates audit_events via api.php upsert path

// ❌ Forbidden — bypasses audit + breaks dual-write invariant
$db->exec("UPDATE users SET full_name = ... WHERE user_id = ...");
$db->exec("UPDATE employees SET employee_name = ... WHERE user_id = ...");
```

### Bulk import / data migration

Use `tools/vps-setup/scripts/data-push.sh --change-ref CR-XXX` per CLAUDE.md "MANDATORY: VPS deployment policy". Never `INSERT INTO users` from a one-off PHP CLI script.

---

## Enforcement

The CI guard `php mom/tools/release/check_user_identity_ssot.php` runs in `deploy.yml` between the repo-boundary check and the phpunit step. It scans the diff for:

- Hardcoded role-string literals in JS (e.g. `role: 'cnc_operator'`)
- New `CREATE TABLE` with forbidden identity columns
- `INSERT INTO users|employees|hcm_employees` outside the allowlisted writer files
- Direct `users.json` writes via `file_put_contents`, `vi`, `sed`, `cat >`, etc.

Allowlisted writer files (read by the guard):
- `mom/scripts/portal/01-data-config.js` (ROLES const, _ROLE_MIGRATE, DEFAULT_NEW_USER_ROLE)
- `mom/scripts/portal/02-state-auth-ui.js` (the duplicate _ROLE_MIGRATE — tracked tech debt)
- `mom/api/services/AuthUserShadowSyncService.php` (the dual-write service)
- `mom/api/services/DataSyncMutationService.php` (the JSON mutator)
- `mom/api.php` (the upsert handler that delegates to the service)
- `mom/database/migrations/*.sql` (schema authority)

If you genuinely need to write outside this allowlist, propose extending the allowlist in this file in the same PR — don't disable the guard.

---

## When in doubt

1. Read this doc.
2. Look at `v_user_canonical` definition in migration 178.
3. Look at `AuthUserShadowSyncService::syncUser()` for the dual-write pattern.
4. If still unclear, **leave the existing path alone** rather than inventing a parallel one. Drift is silent and expensive; conservatism is cheap.

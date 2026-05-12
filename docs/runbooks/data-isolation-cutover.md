# Runbook: Data / Source-Code Isolation Cutover (ADR-0013)

**Audience:** operators with `ssh eqms` access and PostgreSQL DBA rights.
**Decision:** [ADR-0013](../adr/0013-data-source-code-isolation.md).
**Migration:** [174_data_isolation_foundation.sql](../../mom/database/migrations/174_data_isolation_foundation.sql).
**Code surface:** `IdentityRepository`, `DataCollectionModeResolver`,
`AuditChainService`, `tools/backfill_identity_to_postgres.php`.

This runbook covers the **identity (users) collection only**. Sister
collections (`role_permissions`, `dcc_documents`, …) follow the same
pattern but get their own runbooks.

---

## 0. Mental model

Each collection lives in one of four modes, advancing left-to-right:

```
json_only ─▶ shadow_write ─▶ postgres_primary ─▶ postgres_only
```

The current mode is stored in PostgreSQL table `data_collection_state`
and read by the runtime on every request. **Mode flips are SQL UPDATEs,
not deploys.**

| Mode | Reads | Writes | Drift logged |
|---|---|---|---|
| `json_only` | JSON | JSON | no |
| `shadow_write` | JSON | JSON + PG | yes |
| `postgres_primary` | PG (fallback JSON) | PG + JSON | yes |
| `postgres_only` | PG | PG only | n/a |

---

## 1. Pre-flight (run on local laptop, not VPS)

```bash
# Confirm code is up to date and tests are green.
git pull origin main
cd mom
composer install
php -d memory_limit=1G vendor/bin/phpunit --testsuite Unit
php -d memory_limit=2G vendor/bin/phpstan analyse api/services tools
```

All must pass before touching production.

---

## 2. Apply migration 174 on the VPS

```bash
ssh eqms 'sudo cp -a /var/www/data-private \
    /var/backups/data-private-$(date +%F-%H%M)'
ssh eqms 'sudo cp -a /var/www/eqms.hesemeng.com/mom/data/config \
    /var/backups/site-config-$(date +%F-%H%M)'

# Standard deploy path (preferred): push to main, GitHub Actions
# applies migrations during deploy.
git push origin main

# Manual fallback (emergencies only):
ssh eqms 'sudo -n bash /var/www/eqms.hesemeng.com/tools/vps-setup/scripts/deploy.sh'
```

Verify migration landed:

```bash
ssh eqms 'sudo -u postgres psql -d eqms -c \
   "SELECT collection_key, mode FROM data_collection_state ORDER BY 1;"'
```

Expected output: 7 rows, all `mode='shadow_write'` for identity-related
keys, `json_only` for the rest.

---

## 3. Backfill PostgreSQL from `users.json`

Initial state: PG `users` table is empty (or partially populated).
JSON file is authoritative. We import every record, then verify.

### 3a. Dry-run

```bash
ssh eqms 'cd /var/www/eqms.hesemeng.com/mom \
    && php tools/backfill_identity_to_postgres.php --dry-run --verbose'
```

Read the printed summary:

- `agree=N json_only=0 pg_only=0 mismatch=0` → already consistent;
  skip to §4.
- Anything non-zero → expected on the very first run; proceed.

### 3b. Apply

```bash
ssh eqms 'cd /var/www/eqms.hesemeng.com/mom \
    && php tools/backfill_identity_to_postgres.php --apply \
        --actor=ops@hesem \
        --change-ref=ADR-0013-cutover-phase1'
```

Exit codes:

| Code | Meaning | Action |
|---|---|---|
| 0 | OK, no drift remaining | proceed |
| 3 | Drift remains | inspect `data_collection_drift`, fix, re-run |
| 4 | At least one user failed | inspect logs, fix data, re-run |

### 3c. Inspect any drift

```sql
SELECT record_key, direction, json_sha256, pg_sha256, diff_summary
  FROM data_collection_drift
 WHERE collection_key = 'users' AND resolved_at IS NULL
 ORDER BY detected_at DESC
 LIMIT 50;
```

For each row, decide:

- **`pg_won`** (DB is right) — leave as is, mark resolved.
- **`json_won`** (JSON is right) — re-apply the row from JSON via the
  admin UI, then mark resolved.
- **`manual_merge`** — edit fields manually, mark resolved.

```sql
UPDATE data_collection_drift
   SET resolved_at = now(),
       resolved_by = 'ops@hesem',
       resolution  = 'pg_won',         -- or 'json_won' / 'manual_merge'
       resolution_note = 'reason'
 WHERE drift_id = <id>;
```

---

## 4. Advance to `postgres_primary`

Preconditions (verify all):

- [ ] Migration 174 applied (§2).
- [ ] Backfill exit code 0 (§3b).
- [ ] `SELECT count(*) FROM data_collection_drift WHERE collection_key='users' AND resolved_at IS NULL;` returns **0**.
- [ ] `SELECT * FROM audit_event_chain_verify(0);` returns **no rows** (chain intact).

Advance:

```bash
ssh eqms 'cd /var/www/eqms.hesemeng.com/mom \
    && php tools/backfill_identity_to_postgres.php --apply \
        --actor=ops@hesem \
        --change-ref=ADR-0013-advance-pg-primary \
        --advance=postgres_primary'
```

The runtime now serves identity reads from PostgreSQL. JSON file is
still written on every mutation as a mirror.

### Smoke test

```bash
# Login through portal, then:
ssh eqms 'tail -n 50 /var/log/qms-data-sync.log'
```

You should see `identity_user_*` events and **no** read-fallback
warnings. If logs show `[IdentityRepository] readDb failed`, downgrade:

```sql
UPDATE data_collection_state
   SET mode = 'shadow_write',
       advanced_at = now(),
       advanced_by = 'ops@hesem',
       advance_change_ref = 'rollback'
 WHERE collection_key = 'users';
```

…and investigate.

---

## 5. Advance to `postgres_only` (final state)

**Wait at least 7 days** at `postgres_primary` before this step.
Watch `data_collection_drift` and `audit_event_chain` for
`shadow_drift_detected` events. Zero new drift for 7 days = safe to
cut JSON.

### 5a. Final verification

```sql
-- Chain intact:
SELECT * FROM audit_event_chain_verify(0);   -- expect 0 rows

-- No drift in last 7 days:
SELECT count(*) FROM data_collection_drift
 WHERE collection_key = 'users'
   AND detected_at > now() - interval '7 days';

-- All users have a corresponding row:
SELECT
    (SELECT count(*) FROM users WHERE source_system = 'AUTH_JSON') AS pg_count,
    (SELECT jsonb_array_length(payload->'users')
       FROM audit_event_chain
      WHERE event_type = 'identity_backfill_finished'
      ORDER BY chain_id DESC LIMIT 1) AS last_backfill_count;
```

### 5b. Advance + retire JSON

```bash
ssh eqms 'cd /var/www/eqms.hesemeng.com/mom \
    && php tools/backfill_identity_to_postgres.php --apply \
        --actor=ops@hesem \
        --change-ref=ADR-0013-advance-pg-only \
        --advance=postgres_only'

# Move users.json out of the runtime path. Do NOT delete — keep as a
# reference snapshot under data-private.
ssh eqms 'sudo mv /var/www/eqms.hesemeng.com/mom/data/config/users.json \
    /var/www/data-private/.snapshots/users.json.retired-$(date +%F)'
```

### 5c. Drop users.json from preserved-files whitelist

Edit `tools/vps-setup/scripts/_runtime-files.sh`:

```diff
 RUNTIME_CONFIG_FILES=(
-    users.json
     role_permissions.json
     ...
```

Update `mom/api/services/DataSyncMutationService.php::RUNTIME_CONFIG_FILES`
similarly. Commit and deploy.

---

## 6. Routine operations

### Verify audit chain integrity (cron candidate)

```sql
SELECT * FROM audit_event_chain_verify(0);
```

No rows = chain intact. Any row = compliance incident; investigate
immediately. Wire this into the monitoring stack and alert on non-empty
result.

### Inspect cutover dashboard

```sql
SELECT * FROM v_data_isolation_dashboard;
```

### Replay a drift scan

```bash
ssh eqms 'cd /var/www/eqms.hesemeng.com/mom \
    && php tools/backfill_identity_to_postgres.php --dry-run'
```

### Rollback a mode advance

`json_only ↔ shadow_write` and `shadow_write ↔ postgres_primary` are
trivially reversible — just `UPDATE data_collection_state SET mode = …`.

`postgres_only → postgres_primary` requires re-creating `users.json`
from the database first:

```bash
ssh eqms 'cd /var/www/eqms.hesemeng.com/mom \
    && php tools/export_identity_to_json.php > /tmp/users.json \
    && sudo install -o www-data -g www-data -m 0664 \
       /tmp/users.json /var/www/eqms.hesemeng.com/mom/data/config/users.json'
```

(`tools/export_identity_to_json.php` is built on demand if this
rollback path is ever exercised.)

---

## 7. Compliance evidence

After completing this runbook for the identity collection, the
following artefacts exist and demonstrate compliance:

| Artefact | Evidences |
|---|---|
| `audit_event_chain` table, 1 row per mutation, hash-linked | 21 CFR Part 11 §11.10(e), ISO 27001 A.8.2.3, NIST AU-10 |
| `data_collection_drift` table, all rows resolved | data-integrity QA gate |
| `audit_event_chain_verify(0)` returns 0 rows | tamper evidence |
| Migration 174 + ADR-0013 in git | change-control, design rationale |
| Deploy snapshots in `/var/www/data-private/.deploy-snapshots/` | recovery point objective |

Save the output of step 5a as `compliance/cutover-users-<date>.txt` for
the QMS evidence vault.

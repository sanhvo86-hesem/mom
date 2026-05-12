# Runbook: Data Isolation Phase 2 — DCC Document Bodies

**Audience:** operators with `ssh eqms` access and PostgreSQL DBA rights.
**Decision:** [ADR-0013](../adr/0013-data-source-code-isolation.md).
**Migration:** [175_dcc_document_body_storage.sql](../../mom/database/migrations/175_dcc_document_body_storage.sql).
**Code surface:** [`DocumentBodyRepository`](../../mom/api/services/DocumentBodyRepository.php),
[`tools/backfill_document_bodies_to_postgres.php`](../../mom/tools/backfill_document_bodies_to_postgres.php).
**Prerequisite:** Phase 1 (identity) complete — see
[data-isolation-cutover.md](data-isolation-cutover.md).

This runbook moves the controlled QMS document bodies (~942 HTML files
under `mom/docs/**`) from the source tree into the append-only,
sha256-verified PostgreSQL table `dcc_document_body`. The 4-stage
Strangler-Fig vocabulary from Phase 1 applies unchanged:

```
json_only ─▶ shadow_write ─▶ postgres_primary ─▶ postgres_only
```

Collection key: **`dcc_documents`** in `data_collection_state`.

---

## 0. Why a separate table for document bodies?

`dcc_document_header` (migration 150) holds metadata only. The HTML
body itself is the largest, most-frequently-edited piece of data and
is currently the primary deploy hazard:

| Risk | Today | After Phase 2 |
|---|---|---|
| `git pull` overwrites a portal-edited document | Possible (file is tracked) | Impossible — body lives in PG |
| Cannot diff revisions without filesystem snapshots | True | Every save is a new immutable row |
| Audit trail for content changes | Implicit (manifest + git log) | Explicit hash-chained `audit_event_chain` row |
| Developer commits accidentally overwrite portal edits | Common (pre-commit hook only warns) | Impossible — DB is canonical |

`dcc_document_body` is **append-only**. Every save creates a new row,
keyed by `(doc_code, revision, status, locale)`. Triggers reject any
`UPDATE`/`DELETE` (21 CFR Part 820.40 + 21 CFR Part 11 §11.10(c) —
verifiable copies must persist).

---

## 1. Pre-flight (laptop)

```bash
git pull origin main
cd mom
composer install
php -d memory_limit=1G vendor/bin/phpunit --testsuite Unit
php -d memory_limit=2G vendor/bin/phpstan analyse api/services tools tests
```

All green before touching production.

Phase 1 must be at `postgres_primary` or `postgres_only`:

```sql
SELECT collection_key, mode FROM data_collection_state
 WHERE collection_key IN ('users','dcc_documents');
```

---

## 2. Apply migration 175

Standard path:

```bash
git push origin main           # GitHub Actions deploys + migrates
```

Manual fallback:

```bash
ssh eqms 'sudo -n bash /var/www/eqms.hesemeng.com/tools/vps-setup/scripts/deploy.sh'
```

Verify:

```bash
ssh eqms 'sudo -u postgres psql -d eqms -c \
  "SELECT count(*) FROM dcc_document_body;"'
# → 0    (table created, empty)

ssh eqms 'sudo -u postgres psql -d eqms -c \
  "\\d dcc_document_body_current"'
# → view exists with 7 columns
```

---

## 3. Inventory pass (dry-run)

The CLI walks `mom/docs/{system,operations,forms,training,glossary}/**/*.html`,
parses each filename for `(doc_code, locale)`, and reports what would
be imported.

```bash
ssh eqms 'cd /var/www/eqms.hesemeng.com/mom \
    && php tools/backfill_document_bodies_to_postgres.php --dry-run --verbose' \
    | tee ~/dcc-backfill-dryrun-$(date +%F).log
```

Expected categories in the summary:

| Bucket | Meaning | Action |
|---|---|---|
| `imported` | Headers exist, file would import | proceed to §4 |
| `skipped_dup` | Already in PG with same sha256 | re-run is safe |
| `no_header` | Filename has a code but no `dcc_document_header` row | seed the header first |
| `preview` | `*.preview_rN_M.<locale>.html` snapshots | intentionally skipped |
| `failed` | Dry-run does not fail individual files | n/a |

If `no_header > 0`, run the header seeder (e.g.,
`php mom/tools/dcc-batch/migrate.php` or the appropriate domain
migration) and re-do step 3. Do **not** proceed with `imported` of
zero or with `no_header` non-zero.

---

## 4. Backfill apply

```bash
ssh eqms 'cd /var/www/eqms.hesemeng.com/mom \
    && php tools/backfill_document_bodies_to_postgres.php --apply \
        --actor=ops@hesem \
        --change-ref=ADR-0013-phase2-import \
        --verbose' \
    | tee ~/dcc-backfill-apply-$(date +%F).log
```

Exit codes:

| Code | Meaning | Action |
|---|---|---|
| 0 | All files imported | proceed to §5 |
| 3 | One or more files failed | inspect log, fix file, re-run (idempotent) |

The CLI writes two `audit_event_chain` rows per run:
`dcc_body_backfill_started` + `dcc_body_backfill_finished` (with full
tally + failures list). Verify:

```sql
SELECT recorded_at, event_type, payload->'tally' AS tally
  FROM audit_event_chain
 WHERE event_type LIKE 'dcc_body_backfill%'
 ORDER BY chain_id DESC LIMIT 10;
```

---

## 5. Wire `released_body_id` on every header (one-shot)

After backfill, each header still has `released_body_id IS NULL`.
Hydrate:

```sql
WITH ranked AS (
    SELECT body_id, doc_code, body_sha256,
           ROW_NUMBER() OVER (
               PARTITION BY doc_code
               ORDER BY CASE status
                   WHEN 'released'   THEN 0
                   WHEN 'approved'   THEN 1
                   WHEN 'in_review'  THEN 2
                   WHEN 'draft'      THEN 3
                   ELSE                   4
               END, created_at DESC
           ) AS rn
      FROM dcc_document_body
     WHERE locale = 'vi'
)
UPDATE dcc_document_header h
   SET released_body_id     = r.body_id,
       released_body_sha256 = r.body_sha256,
       released_at          = COALESCE(h.released_at, now())
  FROM ranked r
 WHERE r.rn = 1
   AND h.doc_code = r.doc_code
   AND h.released_body_id IS NULL;
```

Sanity check:

```sql
SELECT count(*) AS without_body
  FROM dcc_document_header
 WHERE released_body_id IS NULL;
-- expect 0
```

---

## 6. Advance to `shadow_write`

Preconditions:

- [ ] `failed=0` from §4
- [ ] `without_body=0` from §5
- [ ] `SELECT * FROM audit_event_chain_verify(0);` returns no rows

```bash
ssh eqms 'cd /var/www/eqms.hesemeng.com/mom \
    && php tools/backfill_document_bodies_to_postgres.php --apply \
        --actor=ops@hesem \
        --change-ref=ADR-0013-phase2-shadow-write \
        --advance=shadow_write'
```

From this point, every save through the portal **must** funnel through
`DocumentBodyRepository::saveVersion()`. (Wiring `DocumentController`
to the new repo is a follow-up PR — until that lands, shadow_write is
operationally identical to json_only because controllers still write
filesystem-only.)

---

## 7. Wire `DocumentController` (follow-up PR)

Replace direct calls to `store_version_file()` /
`save_doc_manifest()` in
[`DocumentController::saveDraft`](../../mom/api/controllers/DocumentController.php)
and `submitReview` / `approve` with calls to
`DocumentBodyRepository::saveVersion()`.

Pass `fs_relpath` so the file is also mirrored to disk during
`shadow_write` and `postgres_primary`. Keep the legacy filesystem
manifest writes for now — they will retire in the
`postgres_only` step.

---

## 8. Advance to `postgres_primary`

After 7 days at `shadow_write` with zero `dcc_body_saved` events
showing `db_ok=false` in their payload:

```sql
UPDATE data_collection_state
   SET mode = 'postgres_primary',
       advanced_at = now(),
       advanced_by = 'ops@hesem',
       advance_change_ref = 'ADR-0013-phase2-pg-primary'
 WHERE collection_key = 'dcc_documents';
```

Now portal renders pull body HTML from `dcc_document_body_current`
via `DocumentBodyRepository::findCurrent()`. Filesystem still
mirrored.

Smoke test: open ≥3 documents in the portal, verify content matches
last-known good state. Spot-check `audit_event_chain` for a
`dcc_body_saved` entry on each save.

---

## 9. Advance to `postgres_only` (final state)

After 7 days at `postgres_primary` with no `[DocumentBodyRepository]
readDb failed` log lines:

```sql
UPDATE data_collection_state
   SET mode = 'postgres_only',
       advanced_at = now(),
       advanced_by = 'ops@hesem',
       advance_change_ref = 'ADR-0013-phase2-pg-only'
 WHERE collection_key = 'dcc_documents';
```

Then:

1. **Untrack** `mom/docs/{system,operations,forms,training,glossary}/**/*.html`
   from git (use `git rm --cached`, commit, add to `.gitignore`).
2. **Move** the on-disk copies under `/var/www/data-private/docs-cache/`
   so they survive deploys but are no longer authoritative.
3. **Drop** `mom/docs/**/*.html` from `RUNTIME_DOC_DIRS` in
   `tools/vps-setup/scripts/_runtime-files.sh` and from the matching
   capture/restore loop in `deploy.sh`.

After this final cut, `git reset --hard` on the VPS cannot lose any
QMS document content under any failure mode.

---

## 10. Routine ops (Phase 2)

### Verify body integrity

```sql
-- Body sha256 trigger forbids INSERT mismatches; this scan catches
-- any historical row predating the trigger.
SELECT body_id, doc_code, revision
  FROM dcc_document_body
 WHERE encode(digest(body_html, 'sha256'), 'hex') <> body_sha256;
-- expect 0 rows
```

### Diff two revisions

```sql
SELECT
    a.revision AS from_rev,
    b.revision AS to_rev,
    length(b.body_html) - length(a.body_html) AS delta_bytes,
    b.created_by, b.created_at
  FROM dcc_document_body a
  JOIN dcc_document_body b USING (doc_code, locale)
 WHERE doc_code = 'pol-qms-001'
   AND a.created_at < b.created_at
 ORDER BY b.created_at;
```

### Roll back one document to a previous revision

Use the portal admin UI's "Revert to revision N" action — it calls
`DocumentBodyRepository::saveVersion()` with the old `body_html` and a
**new** revision label. The original immutable rows stay; the new row
becomes current.

Never `DELETE` from `dcc_document_body` directly — the trigger
rejects it, and the audit chain would break even if it didn't.

### Storage planning

```sql
SELECT
    doc_type,
    count(*)                                              AS bodies,
    pg_size_pretty(sum(body_size)::bigint)                AS total_size,
    pg_size_pretty(avg(body_size)::bigint)                AS avg_size
  FROM dcc_document_body b
  JOIN dcc_document_header h USING (doc_code)
 GROUP BY doc_type
 ORDER BY sum(body_size) DESC;
```

For the current 942-document corpus at ~50KB average HTML, expect
≈50 MB raw + JSONB metadata. Negligible vs. PostgreSQL TOAST limits
(1 GB per row, hundreds of TB per table).

---

## 11. Rollback (per-mode)

| From | To | How |
|---|---|---|
| `shadow_write` | `json_only` | `UPDATE data_collection_state SET mode='json_only'` |
| `postgres_primary` | `shadow_write` | same |
| `postgres_only` | `postgres_primary` | same — but remember to restore the filesystem cache from `dcc_document_body_current` first |

There is **no** rollback that destroys rows in `dcc_document_body`.
If a bad revision lands, the corrective action is **another save
with a new revision** — never a delete.

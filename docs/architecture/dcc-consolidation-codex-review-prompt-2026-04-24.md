# DCC Consolidation — Codex Review Prompt (2026-04-24)

Copy the block below into Codex and run. It tells Codex exactly what was
changed, why, how to verify against the live database (which Claude Code
did not have), and what specific failure modes to hunt. The goal is for
Codex to confirm international-standard compliance and surface any
defect Claude Code missed.

---

## Prompt to paste into Codex

You are auditing a completed DCC (Document Change Control) consolidation
sprint in the HESEM MOM ERP repository. Claude Code just finished a
multi-tranche upgrade that unified four parallel document-metadata
stores (legacy JSON state, legacy manifest, legacy docs_custom.json,
and the PostgreSQL `dcc_document_header` table) into a single DB-driven
pipeline, removing all hardcoded owner/approver/revision values from
the frontend and HTML. Every rendered field on a controlled QMS
document now flows from DB → API → renderer, with no hardcode in JS,
HTML, or PHP.

Your job is to verify the work is correct, complete, and meets
ISO 9001:2015 §7.5, ISO 13485 §4.2, FDA 21 CFR Part 11, FDA 21 CFR
Part 820.40, and EU Annex 11. Then run the live simulation suite
against the database and report any anomaly.

### Orientation — read these first, in order

1. `CLAUDE.md` (project guide) and `AGENTS.md`
2. `.ai/CONVENTIONS.md` — file-placement rules
3. `.ai/repo-map.json` — topology (836 tables, 155 migrations, 89 controllers)
4. `docs/architecture/dcc-consolidation-plan-2026-04-24.md` — master plan
5. `mom/contracts/objects/quality_improvement--document-control/contract.json`
6. `mom/contracts/objects/quality_improvement--document-control/dcc-document-header.standard.md`

### What changed (34 files, +955 / −96 LOC)

NEW files:
- `mom/database/migrations/155_dcc_consolidation.sql` — role catalog, doc-type catalog, immutable revision table, filename anchor, extended label seed
- `mom/tools/dcc-batch/backfill-from-legacy.php` — one-shot migrator: legacy JSON state → DCC DB, including per-revision body rows
- `mom/tools/dcc-batch/simulate.php` — end-to-end scenario harness (fresh / bad-writes / audit-trail / rename / all)
- `mom/tests/Unit/Services/DocumentControlServiceConsolidationTest.php` — 12 unit tests, all passing
- `docs/architecture/dcc-consolidation-plan-2026-04-24.md` — architecture spec

MODIFIED files:
- `mom/api/services/DocumentControl/DocumentControlService.php` — added `recordRevision()`, `markRevisionCurrent()`, `updateFilenameAnchor()`, `listRoles()`, `listDocTypes()`. Upgraded `release()` to INSERT into `dcc_document_revision`, flip `is_current`, update header. Upgraded `listRevisions()` to return `{bodies, transitions}`
- `mom/api/controllers/DocumentControlController.php` — added `listRoles()`, `listDocTypes()` endpoints
- `mom/api/routes/dcc-routes.php` — registered `GET /api/v1/dcc/roles` and `GET /api/v1/dcc/doc-types`
- `mom/api/controllers/DocumentController.php` — +242 LOC: bridge methods `bridgeDccApprove()`, `bridgeDccSubmitReview()`, `bridgeDccReject()`, `bridgeDccRename()`, `ensureDccHeader()`, `normaliseDccRevision()`. Each wraps the existing legacy write with a try/catch that also records the same event into the DCC DB (never rolls back legacy on DCC failure; logs `[dcc-bridge] ... failed: ...`)
- `mom/api/controllers/FileController.php` — +10 LOC: `renameDoc()` now calls `DocumentController::bridgeDccRename()` so the `dcc_document_header.filename` column stays in sync with disk
- `mom/api.php` — +16 LOC in the procedural `case 'rename_doc':` to call the same static bridge
- `mom/scripts/portal/02-state-auth-ui.js` — +216/−70 LOC: `updateDocViewerHeader()` now renders a `<div class="dcc-header">` placeholder that `window.DccHeader.render()` fills in via `GET /api/v1/dcc/documents/{code}/header`. `editDocMeta()` fetches `/api/v1/dcc/roles?class=owner|approver`, opens a native select modal, PATCHes via `/api/v1/dcc/documents/{code}/header`. No hardcoded owner/approver lists. Pencil Edit buttons are injected into the DCC ribbon after it renders
- `mom/scripts/portal/01-data-config.js` — −1 LOC: deleted `gd:{vi:'General Manager (EXE-01)',en:'General Manager (EXE-01)'}`. No remaining caller
- `mom/tools/dcc-batch/migrate.php` — +167/−8 LOC: the hardcoded `'V0', 'QA', 'CEO', 'draft', CURRENT_DATE` seed in the INSERT branch now reads the legacy `_state.json` (same probe path as backfill), falls back to `dcc_doc_type_catalog.default_owner_role` / `default_approver_role`, and only lands on `QA` / `CEO` / `V0` when both legacy data and catalog are absent
- `mom/contracts/objects/quality_improvement--document-control/contract.json` — added `dcc_document_revision`, `dcc_role_catalog`, `dcc_doc_type_catalog` in storage block; added 2 endpoints in api block
- `mom/contracts/objects/quality_improvement--document-control/dcc-document-header.standard.md` — updated §2.5 to reflect FK constraints to `dcc_role_catalog` and new `filename`/`filesystem_path` columns

AI index regenerated: `.ai/contracts-map.json`, `.ai/db-map/*.json`, `.ai/repo-map.json`, `.ai/route-map.json`, `.ai/symbols.json`.

### Why the change — the concrete defect being fixed

Before this sprint, screenshot of `QMS-MAN-001` showed four disjoint
values:

| UI location                        | Source                              | Value    |
|------------------------------------|-------------------------------------|----------|
| Viewer top ribbon (revision)       | Legacy JSON manifest                | `v2.0`   |
| Viewer top ribbon (owner)          | Legacy JSON state                   | `QA/QMS` |
| Viewer top ribbon (approver)       | Hardcoded `T('gd')` in JS           | `General Manager (EXE-01)` |
| DCC header ribbon (at body top)    | `dcc_document_header` (seeded once) | `V0.0, QA, CEO, 2026-04-23` |

Root cause: `DocumentController::approve()` wrote only to JSON,
`editDocMeta()` wrote only to local state, the DCC table sat at the
defaults migrate.php seeded with. Hardcoded options in JS arrays
(`['QA/QMS','Production',…]`, `['Tổng Giám Đốc','QMR',…]`) prevented
the UI from ever discovering the DB values even if they existed.

### Claude Code's verification results

- `php -l` on every modified/new file: PASS
- `composer --working-dir=mom run test` (full suite): 557 tests, 4866 assertions, 1 skipped, 0 failures
- `composer --working-dir=mom run analyse` on DCC files: 0 errors (20 pre-existing errors elsewhere, unrelated)
- `DB_PASS=skip php mom/tools/dcc-batch/audit.php`: 389/390 compliant, 1 pre-existing malformed fragment skipped
- `node --check` on modified JS files: PASS
- AI index regenerated successfully: 155 migrations, 836 tables recognised

Claude Code did NOT have live database access, so the following were
not executed and are your job:

### Your verification tasks

1. Apply migration 155 in a sandbox database:
   ```bash
   psql "$DB_URL" -f mom/database/migrations/155_dcc_consolidation.sql
   ```
   Confirm the `RAISE NOTICE` at the end reports non-zero role + doc-type counts. Confirm idempotency — run twice, second run no-ops.
2. Run the simulation harness end-to-end:
   ```bash
   DB_PASS=… php mom/tools/dcc-batch/simulate.php --scenario=all
   ```
   Every scenario MUST print PASS. If any prints FAIL, dump the SQL + params leading to the failure and propose a fix in the service layer (not the test).
3. Run backfill on a snapshot of production data:
   ```bash
   DB_PASS=… php mom/tools/dcc-batch/backfill-from-legacy.php --dry-run --verbose --filter-prefix=QMS-MAN
   ```
   Inspect the planned upserts and per-revision inserts for `QMS-MAN-001` (the screenshot-case). The backfilled revision should end at `V2.0`, effective date `2026-03-25`, owner+approver from legacy state (after single-role normalisation), `is_current = TRUE` on the latest approved revision. If the dry-run looks correct, apply without `--dry-run` and verify the `GET /api/v1/dcc/documents/QMS-MAN-001/header` payload now matches the legacy state.
4. Validate the NOT VALID foreign keys added to `dcc_document_header`:
   ```sql
   ALTER TABLE dcc_document_header VALIDATE CONSTRAINT fk_dcc_header_owner_role;
   ALTER TABLE dcc_document_header VALIDATE CONSTRAINT fk_dcc_header_approver_role;
   ```
   These should succeed after backfill. If they fail, a row still carries a role code not in `dcc_role_catalog` — either extend the catalog or clean the row.
5. Spot-check the viewer UI in a browser against `QMS-MAN-001`:
   - Open the portal, navigate to the doc.
   - Confirm the ribbon shows one set of values, not two.
   - Open the "Chỉnh sửa" modal for owner and approver; confirm the options come from `GET /api/v1/dcc/roles`.
   - Change the owner, save. Reload. Confirm the new value persists in DB and renders on the ribbon.
6. Re-run the DCC audit after backfill and UI change:
   ```bash
   DB_PASS=… php mom/tools/dcc-batch/audit.php
   DB_PASS=… php mom/tools/dcc-batch/verify-headers.php
   ```

### Specific failure modes to hunt

- **Silent DCC bridge swallowing**: every bridge method wraps errors in `try/catch { @error_log(...); }` so the legacy write never rolls back. Grep `/var/log/php*` (or the `error_log` target) for `[dcc-bridge]` after running a full approve cycle. Any such line is a latent bug; open it and propose a fix.
- **FK violation on legacy role codes**: legacy state might contain owner strings like `QA/QMS`, `Management`, `Quality`, `HR/Admin`. The backfill normalises these by splitting on `/` and picking the first token, then mapping through `dcc_role_catalog`. If no mapping exists for the token, backfill warns and leaves the field at the doc-type default. Audit the warnings; confirm no row silently got the wrong owner.
- **Revision regex mismatch**: legacy revisions like `"2.0"`, `"v2.0"`, `"2"` must become `V2.0`, `V2.0`, `V2`. The normaliser lives in `DocumentController::normaliseDccRevision()` (bridge) and in `backfill-from-legacy.php`. Test edge cases: empty string, leading whitespace, `"V2.0-beta"` (contains letters), `"v2,0"` (comma), should all be rejected by `recordRevision()`. Confirm `DocumentControlService::assertValidRevision()` rejects these.
- **Filename drift**: after `rename_doc` the `dcc_document_header.filename` column should match disk exactly. Rename a test doc through the portal, then `SELECT filename, filesystem_path FROM dcc_document_header WHERE doc_code = ?` and compare with `ls mom/docs/…`.
- **Locale leakage**: when `GET /api/v1/dcc/documents/{code}/header?locale=en` is fetched, the `title`, `subtitle`, `owner_role_code`, `approver_role_code` fields should be identical between `vi` and `en`; only the `labels` change. Verify no i18n string crept into a metadata column.
- **Multi-role CHECK**: try `UPDATE dcc_document_header SET owner_role_code = 'QA/QMS' WHERE …` directly in `psql`. It MUST fail with `ck_dcc_header_owner_single`. If it succeeds, the migration triggers are not installed correctly.
- **is_current uniqueness**: try `INSERT INTO dcc_document_revision … is_current = TRUE` for a doc that already has an is_current row. It must fail with `ux_dcc_revision_is_current` unique-violation. Only `markRevisionCurrent()` flips both sides atomically.
- **Append-only guard**: try `UPDATE dcc_document_revision SET approved_by = 'malicious' WHERE …`. Must fail with `dcc_document_revision.approved_by is immutable once set`.

### Standards compliance to cross-check

Confirm each of the following, citing the specific code location:

- **ISO 9001:2015 §7.5.3(b)**: identification of current revision ⇒ `dcc_document_revision.is_current` unique index + `dcc_document_header.revision` projection.
- **ISO 9001:2015 §7.5.3(c)**: obsolete documents retained ⇒ append-only trigger on `dcc_document_revision` + `status = 'obsolete'` transition preserved in `dcc_document_revision_history`.
- **FDA 21 CFR Part 11 §11.10(e)**: secure computer-generated timestamped audit trail ⇒ `dcc_document_revision_history` trigger `trg_dcc_history_immutable_upd` + `trg_dcc_history_immutable_del`.
- **FDA 21 CFR Part 11 §11.70**: electronic signature linkage ⇒ `dcc_document_revision.signature_event_id` FK path.
- **FDA 21 CFR Part 820.40**: approval before release + identification of changes ⇒ state machine rejects `draft → released`; `dcc_document_change_notice` required for release.
- **EU Annex 11 §9**: audit trails for GMP-relevant changes ⇒ every transition emits a history row with actor + role + timestamp.

### Known non-goals / out-of-scope (do not flag)

- JSON legacy stores (`state.json`, `manifest.json`, `docs_custom.json`, `doc_descriptions.json`) remain authoritative for legacy consumers. They become read-only mirrors in a later tranche (T5) after two release cycles of DCC leading.
- Pre-existing PHPStan errors in `EqmsLessonsLearnedController`, `EqmsAmlController`, `EqmsCsatController`, `EqmsEventsController`, `EqmsFaiController`, `EqmsSamplingPlansController` — unrelated to this sprint.
- Four `QA/QMS` strings in `02-state-auth-ui.js` still exist inside the `openQuickCreateModal` / `openCreateDocModal` / sidebar Category list. Those drive create-time category selection, not the edit-time viewer. Migration to the DCC picker is tracked for a later sprint.
- The DCC content-hash (`content_sha256`) is populated on bridge-approve but the PDF export pipeline does NOT yet verify it at render time. This is Part 11 §11.10(e) nice-to-have, not mandatory for basic compliance.

### Deliverables from you

A report in this exact format:

```
# DCC Consolidation Codex Audit — <date>

## Verification results
- Migration 155 apply: [PASS | FAIL + details]
- simulate.php --scenario=all: [PASS count / FAIL count, failing scenario trace]
- backfill --dry-run QMS-MAN: [matches expected | deviates + details]
- FK VALIDATE (owner_role, approver_role): [PASS | FAIL + offending rows]
- Browser spot-check QMS-MAN-001 ribbon consistency: [one value | still split]
- DCC audit: <compliant>/<total>
- verify-headers: <pass>/<total>

## Defects found
<numbered list, each with: location, root cause, proposed fix. Empty if none.>

## Standards compliance
<One bullet per clause above, citing file:line + evidence.>

## Recommendations
<Any tightening Codex sees that is safe to land in the same commit.>
```

If any defect is found, apply the minimal fix in the same branch,
re-run the full verification, and include the before/after diff in the
report. Do NOT roll back the legacy JSON bridge; it is intentional
transitional infrastructure per the master plan §9, tranche T5.

# DCC Consolidation — Master Plan (2026-04-24)

> **Goal:** eliminate the parallel store split between legacy JSON
> (`state.json` / `manifest.json` / `docs_custom.json`) and the DCC control
> plane (`dcc_document_header` + friends). Everything rendered in a
> controlled-document viewer must come from **DB → API → renderer**, with
> zero hardcode anywhere in JS, HTML, or PHP.
>
> **Driver:** screenshot of `QMS-MAN-001` showing 4 independent values
> (v2.0 vs V0.0, QA/QMS vs QA, General Manager (EXE-01) vs CEO, legacy
> status vs DCC status). The DCC table was seeded with defaults and never
> updated because `DocumentController::approve()` writes only to JSON.

## 1. Invariants (non-negotiable)

1. **Filename master** for: filesystem identity, canonical code,
   on-screen slug in the listing card. `qms-man-001-qms-manual.html` →
   code `QMS-MAN-001`.
2. **DB master** for: `title`, `subtitle`, `revision`, `effective_date`,
   `owner_role_code`, `approver_role_code`, `status`, `doc_type`,
   `iso_clause`, version history. HTML body NEVER contains these.
3. **API is the single read path.** `GET /api/v1/dcc/documents/{code}/header`.
   No frontend computes revision from `doc.rev`; no renderer reads the
   inline `data-dcc-bootstrap` as authoritative.
4. **Every write goes through `DocumentControlService`** — never
   `save_doc_state()` alone.
5. **Options come from DB** — owner / approver / doc_type dropdowns fetch
   from `dcc_role_catalog` / `dcc_doc_type_catalog`. No JS arrays.
6. **Labels come from DB** — `T('gd')`, `T('owner')`, `T('approver')`
   etc. for the DCC ribbon originate in `dcc_document_header_label`.

## 2. Dataflow after consolidation

```
 ┌────────────────────────────────────┐
 │  Frontend (02-state-auth-ui.js)    │
 │   updateDocViewerHeader(doc)       │
 │   ─ calls window.DccHeader.render()│
 │   ─ fetches GET /dcc/.../header    │
 │   ─ fetches GET /dcc/roles         │
 │   ─ no hardcoded labels/options    │
 └──────────────┬─────────────────────┘
                │HTTP (same-origin)
 ┌──────────────▼─────────────────────┐
 │  DocumentControlController         │
 │   ─ labels  → dcc_document_header_label
 │   ─ header  → dcc_document_header + locale variant
 │   ─ roles   → dcc_role_catalog          (NEW)
 │   ─ actions → DocumentControlService.transition
 └──────────────┬─────────────────────┘
                │
 ┌──────────────▼─────────────────────┐
 │  DocumentControlService            │
 │   approve/release/supersede        │
 │   ─ UPDATE dcc_document_header     │
 │   ─ INSERT dcc_document_revision   (NEW row per approval)
 │   ─ INSERT dcc_document_revision_history
 │   ─ optional: write content_sha256,
 │       filename, filesystem_path    (NEW cols)
 └──────────────┬─────────────────────┘
                │
 ┌──────────────▼─────────────────────┐
 │  PostgreSQL                        │
 │   dcc_document_header              (current metadata)
 │   dcc_document_revision            (NEW — immutable per-rev)
 │   dcc_document_revision_history    (append-only log)
 │   dcc_document_change_request      (DCR)
 │   dcc_document_change_notice       (DCN)
 │   dcc_document_header_label        (i18n labels)
 │   dcc_role_catalog                 (NEW — owner/approver picker)
 │   dcc_doc_type_catalog             (NEW — doc_type picker)
 └────────────────────────────────────┘

 Legacy JSON (`state.json`, `manifest.json`, `docs_custom.json`,
 `doc_descriptions.json`) is read-only mirror after T3, retired after
 two release cycles.
```

## 3. Schema changes — `155_dcc_consolidation.sql`

| Object | Purpose |
|---|---|
| `dcc_role_catalog` | Replace JS hardcode list (`QA/QMS`, `Production`, `CEO`, `GM`). `role_code`, `label_vi`, `label_en`, `role_class` ∈ {owner, approver, both}. Seeded with the full HESEM role set. |
| `dcc_doc_type_catalog` | Replace JS hardcode `DOC_TYPES`. Columns: `doc_type`, `label_vi`, `label_en`, `family_pattern`, `default_owner_role`, `default_approver_role`. |
| `dcc_document_revision` | Immutable per-release row: `revision_id`, `doc_code`, `revision`, `update_type`, `effective_date`, `content_sha256`, `content_path`, `filename`, `dcr_id`, `dcn_id`, `approved_by`, `approved_at`, `released_by`, `released_at`, `signature_event_id`, `is_current`. Unique `(doc_code, revision)`; partial unique on `is_current`. Append-only trigger. |
| `dcc_document_header` ALTER | Add `filename`, `filesystem_path`, `filename_checksum`. Unique index on `filename` where not null. |
| `dcc_document_header_label` seed | Add `owner_help`, `approver_help`, `status`, `effective_date`, etc. in `vi` + `en` (already mostly seeded; expand). |

All guarded by `IF NOT EXISTS` / `ON CONFLICT DO NOTHING`. Rollback block
at top.

## 4. Service-layer changes

### 4.1 `DocumentControlService`
- **New method** `recordRevision(string $docCode, array $input, string $actor)`:
  inserts one `dcc_document_revision` row, marks it `is_current`, flips
  prior row `is_current = FALSE`.
- **approve()** — still transitions to `approved`, but also writes one
  `dcc_document_revision` row with the revision the reviewer approved.
  `is_current` stays FALSE until `release()`.
- **release()** — already updates header.revision/effective_date. After
  this change, also sets `is_current = TRUE` on the matching revision
  row and clears prior.
- **listRevisions()** — now reads from `dcc_document_revision` (richer
  fields than `dcc_document_revision_history`).
- **listRoles()** — new, returns `dcc_role_catalog`.
- **listDocTypes()** — new, returns `dcc_doc_type_catalog`.

### 4.2 `DocumentController` (legacy file-based)
- `approve()` — after existing file-based work, call
  `DocumentControlService::recordRevision()` + `approve()` so DCC DB
  catches up. Wrapped in try/catch — a DB error must NOT roll back the
  filesystem write (degraded mode log only) during the transitional
  period, but logs a warning. After T5 retirement, the DB write becomes
  mandatory.
- `submitReview()`, `reject()`, `startNewRevision()`, `saveDraft()` —
  same pattern: emit a DCC state transition.

### 4.3 `DocumentControlController`
- `GET /api/v1/dcc/roles?class=owner|approver|both` — list roles.
- `GET /api/v1/dcc/doc-types` — list doc types.
- Existing endpoints unchanged in shape.

## 5. Frontend changes (no hardcode)

### 5.1 `02-state-auth-ui.js`
- `updateDocViewerHeader()` — delete the `dv-meta-grid` block at
  [line 3184-3193](mom/scripts/portal/02-state-auth-ui.js:3184). Replace
  with a `<div class="dcc-header" data-dcc-doc-code="${doc.code}">`
  placeholder that the DCC renderer fills in. The viewer keeps only the
  action toolbar (back, open-tab, download) — all metadata is the DCC
  ribbon's job.
- `editDocMeta()` — fetch `/api/v1/dcc/roles?class=owner` (or approver),
  populate a native `<select>` from the returned rows, `PATCH` the
  header via DCC API. Remove the "local-only" write comment.
- Delete `T('gd')` usage — approver label now comes from DB.

### 5.2 `03-editor-core.js`
- `getDocRevision()` — read from cached DCC header (injected by the
  renderer via `window.__dccCache`) instead of `state.revision`.

### 5.3 `01-data-config.js`
- Remove `gd:{vi:'General Manager (EXE-01)',…}` — dead after 5.1.

### 5.4 `11-dcc-header-renderer.js`
- Expose `window.DccHeader.getCached(code)` so other portal code can
  read the last-fetched header without a round-trip.

## 6. Migrate tool fix (`mom/tools/dcc-batch/migrate.php`)

- Remove the hardcoded `'V0', CURRENT_DATE, 'QA', 'CEO', 'draft'` seed
  at [line 324-326](mom/tools/dcc-batch/migrate.php:324).
- On INSERT for a code with an existing `state.json`, read the legacy
  state and use its `revision`, `effective_date`, `owner`, `approver`,
  `status` as the seed. Map legacy `approved` → DCC `approved`;
  legacy `effective` → DCC `released`.
- Only fall back to `V0 / draft / QA / CEO` when NO prior legacy data
  exists (a genuinely new doc).

## 7. Backfill tool — `mom/tools/dcc-batch/backfill-from-legacy.php`

One-shot idempotent script:

```
for every doc under mom/docs/**/*.html with a canonical code:
  read legacy state.json + manifest.json
  upsert dcc_document_header (revision, owner, approver, eff_date, status)
  for every version in manifest.json with status='approved'|'initial_release':
    insert dcc_document_revision (idempotent on (doc_code, revision))
  mark the highest-released revision is_current = TRUE
  insert audit row in dcc_document_revision_history if missing
```

Exits non-zero on failure. `--dry-run` + `--filter-prefix` supported.

## 8. Simulation / test plan

### 8.1 Unit tests (PHPUnit)
- `DocumentControlServiceConsolidationTest` — new. Scenarios:
  1. `recordRevision()` inserts row with `is_current=FALSE`.
  2. `release()` flips exactly one row to `is_current=TRUE`; prior
     falls to `FALSE`.
  3. Bad revision (`v2.0` lowercase, missing V prefix) rejected.
  4. Multi-role owner (`QA/QMS`) rejected by DB CHECK.
  5. Release without DCN throws `dcc_release_requires_dcn_not_found`.
  6. `recordRevision()` idempotent on retry (same `doc_code + revision`).
  7. `listRoles()` returns only active rows, respects `class` filter.

- `DocumentControlLegacyBridgeTest` — new. Scenarios:
  1. Calling `DocumentController::approve()` on a doc with only a
     legacy state.json now also writes a `dcc_document_revision` row.
  2. If DCC write fails, legacy state is still saved, warning logged.
  3. `rename_doc` → `upsertHeader` updates `filename` column.

### 8.2 Simulation scenarios (end-to-end)
Executed by a new script `mom/tools/dcc-batch/simulate.php`:
1. **Fresh doc (SOP-999)** — create, edit title, submit-review, approve,
   release, supersede, obsolete. Assert ribbon values at each step.
2. **Existing doc (QMS-MAN-001)** — backfill from legacy, confirm header
   matches legacy state, run approve→release cycle, confirm DCC table
   leads.
3. **Rename** — change title through the portal flow; filename + DB +
   rendered ribbon all update in lockstep.
4. **Bad writes** — assert CHECK constraints reject: multi-role owner,
   lowercase revision, future effective_date without DCN, status
   transition draft→released, etc.
5. **Locale** — fetch `/header?locale=en` vs `vi`; assert labels differ,
   metadata identical.
6. **Audit trail** — every transition inserts one
   `dcc_document_revision_history` row, never mutates prior rows.

### 8.3 Existing audits re-run
```bash
DB_PASS=… php mom/tools/dcc-batch/audit.php          # C1–C10 still pass
DB_PASS=… php mom/tools/dcc-batch/verify-headers.php # T1–T10
composer --working-dir=mom run analyse               # PHPStan 0 errors
composer --working-dir=mom run test                  # no regressions
```

## 9. Execution sequencing

| Tranche | Work | Done when |
|---|---|---|
| T1 | Migration 155 + catalogs + triggers | `psql` dry-run passes; migration idempotent |
| T2 | Service methods + controller endpoints + unit tests | PHPUnit green on new suite |
| T3 | Migrate.php fix + backfill tool + simulate.php | Scenarios 1–6 pass |
| T4 | Frontend de-hardcode (viewer, editDocMeta, renderer cache, dead label removal) | No `'QA/QMS'`, no `T('gd')`, no `gd:` label remaining |
| T5 | Legacy approve() bridged to DCC | End-to-end sim confirms DCC leads |

All tranches fit in one commit stack; each is independently revertable.

## 10. File placement (per CONVENTIONS.md)

| File | Location | Reason |
|---|---|---|
| `155_dcc_consolidation.sql` | `mom/database/migrations/` | SQL migration |
| `DocumentControlService.php` | `mom/api/services/DocumentControl/` | Existing file, additive changes |
| `DocumentControlController.php` | `mom/api/controllers/` | Existing file, additive changes |
| `DocumentController.php` | `mom/api/controllers/` | Existing file, bridge hook |
| `backfill-from-legacy.php` | `mom/tools/dcc-batch/` | DCC batch tool cluster |
| `simulate.php` | `mom/tools/dcc-batch/` | Simulation scenarios |
| `DocumentControlServiceConsolidationTest.php` | `mom/tests/Unit/Services/` | PHPUnit cluster |
| `02-state-auth-ui.js`, `03-editor-core.js`, `01-data-config.js`, `11-dcc-header-renderer.js` | `mom/scripts/portal/` | Frontend modules |
| `migrate.php` | `mom/tools/dcc-batch/` | Existing, fix seed logic |
| Plan doc (this file) | `docs/architecture/` | Reference documentation |

# DCC — VPS Verification Prompt for Codex (2026-04-24)

Follow-up to `dcc-consolidation-codex-review-prompt-2026-04-24.md`. That
prompt covered the initial consolidation sprint. After the user ran
the VPS in a browser, two defects remained:

1. **Revision still out of sync** — viewer top ribbon and version
   history showed `v2.0` but the DCC header below the title still
   showed `V1.0` after the approve flow. Root cause: the legacy
   approve path in `DocumentController::approve()` bridged
   `recordRevision` into DCC but never updated
   `dcc_document_header.revision`/`effective_date`. Only
   `DocumentControlService::release()` updated those, and the legacy
   workflow has no release ceremony. Fixed in commit `15076b97`.
2. **Edit mode missing Save / Submit / Cancel buttons** — entering
   edit mode via `startEdit()` in `04-workflow-actions.js` did not
   call `updateDocViewerHeader(doc)`, so the top toolbar kept showing
   view-mode buttons ("Tạo bản chỉnh sửa mới", "Ẩn chi tiết",
   "Quay lại", "Mở tab") instead of swapping to
   ("Lưu nháp", "Gửi xem xét", "Hủy sửa"). Same issue on
   `cancelEdit()` exit path. Fixed in commit `bcc8159b`.
3. **Non-HTML file viewer fallback** hardcoded `'QA/QMS'` when both
   DCC cache and legacy state were empty. Replaced with
   `window.DccHeader.getCached(code)` lookup + `—` placeholder so
   missing metadata is visible and never synthesises an invalid
   multi-role string. (Not yet committed as of this prompt; check
   `git status` in your workspace.)

Copy the block below into Codex, run against a full VPS deployment
with a real PostgreSQL database, and report back.

---

## Prompt to paste into Codex

You are verifying a production fix pair for the HESEM MOM ERP DCC
consolidation sprint. Two defects observed in the live portal at
`semeng.com/mom/portal.html` on `QMS-MAN-001` have been addressed and
need on-VPS confirmation. Orient yourself via `CLAUDE.md`, `.ai/`
index, and the two architecture docs:

- `docs/architecture/dcc-consolidation-plan-2026-04-24.md`
- `docs/architecture/dcc-consolidation-codex-review-prompt-2026-04-24.md`

### The two fixes

**Fix A (commit `15076b97` — DCC header revision projection)**

File: `mom/api/controllers/DocumentController.php` around line 1693
in method `bridgeDccApprove()`. After `DocumentControlService::approve()`,
the bridge now also runs:

```php
$this->data->execute(
    "UPDATE dcc_document_header
     SET revision = :rev, effective_date = :eff, updated_by = :actor
     WHERE doc_code = :c",
    [':rev' => $normalisedRev, ':eff' => $effective, ':actor' => $actor, ':c' => $canonical]
);
$svc->markRevisionCurrent($canonical, $normalisedRev, $actor);
```

Rationale: legacy "approve" is the terminal publish step (no separate
DCN / release ceremony). Without this extra UPDATE, the DCC ribbon
locks at whatever the table was seeded with, because
`recordRevision()` only writes `dcc_document_revision`, not the
header projection.

**Fix B (commit `bcc8159b` — edit-mode toolbar refresh)**

File: `mom/scripts/portal/04-workflow-actions.js`, two call sites:
- `startEdit()` → `_activateEditor()`: added
  `try{ updateDocViewerHeader(doc); }catch(e){}` right after
  `renderWorkflowPanel(doc);` so the top toolbar swaps to edit-mode
  buttons (Save Draft / Submit for Review / Cancel).
- `cancelEdit()` end: added the same call after
  `renderVersionHistory(doc);` so the toolbar reverts when leaving
  edit mode.

**Extra (pending commit)**

- `mom/scripts/portal/04-workflow-actions.js` near line 2293 — replaces
  hardcoded fallback `doc.owner || 'QA/QMS'` in the non-HTML iframe
  srcdoc with `DccHeader.getCached(code)?.owner_role_code || '—'`.
- `mom/scripts/portal/11-dcc-header-renderer.js` — new public API
  `window.DccHeader.getCached(docCode)` exposes the in-memory cache
  populated by `render()`. `_clearCache()` also clears header cache.

### Your verification tasks

Work on a clone of the VPS database (or a dev database with the full
migration 150–155 chain applied and at least one doc that has been
approved through legacy):

1. **Reproduce the original defect in a snapshot taken BEFORE fix A**
   so you have a delta baseline. Run:
   ```sql
   SELECT doc_code, revision, effective_date, owner_role_code, approver_role_code, status
   FROM dcc_document_header WHERE doc_code = 'QMS-MAN-001';
   ```
   Note the revision before fix, then roll forward to HEAD and verify
   the header now matches `SELECT revision FROM dcc_document_revision WHERE doc_code='QMS-MAN-001' AND is_current`.
2. **Run a full approve cycle via HTTP** against the VPS (use `curl`
   with the CSRF token obtained from `/api/v1/auth/session`). Sequence:
   a. `POST /api/v1/eqms/control-plane/documents/submit-review`
      body `{ "code":"SIM-REL-001", "base_path":"...", "updateType":"minor" }`
   b. `POST /api/v1/eqms/control-plane/documents/approve`
      body `{ "code":"SIM-REL-001", "base_path":"...", "effective_date":"2026-04-25", "title":"Simulated doc" }`
   After each call, SELECT against `dcc_document_header`,
   `dcc_document_revision`, and `dcc_document_revision_history` for
   `SIM-REL-001`. Expected outcomes:
   - `dcc_document_header.revision` matches the manifest revision
     the legacy flow bumped to.
   - Exactly one `dcc_document_revision` row where `is_current=TRUE`.
   - `dcc_document_revision_history` has one row per state transition.
3. **Browser check** (VPS URL, two tabs):
   - Tab 1: open `QMS-MAN-001`. Viewer top ribbon revision and DCC
     ribbon revision MUST match. Version history panel "Hiện tại"
     entry version MUST match both.
   - Tab 2: click "Tạo bản chỉnh sửa mới" → status becomes draft,
     "Chỉnh sửa" button appears. Click it. Expected: top toolbar
     replaces "Quay lại / Mở tab" with "Lưu nháp / Gửi xem xét / Hủy
     sửa". If the top toolbar stays empty or shows the view-mode
     buttons, fix B regressed.
   - Click "Hủy sửa". Expected: toolbar reverts to view-mode buttons.
   - Run DevTools console:
     `await fetch('/api/v1/dcc/documents/QMS-MAN-001/header').then(r=>r.json())`
     — confirm the payload matches the ribbon contents 1:1 (same
     `revision`, `owner_role_code`, `approver_role_code`,
     `effective_date`, `status`).
4. **Run simulation harness on VPS DB**:
   ```bash
   DB_PASS=… php mom/tools/dcc-batch/simulate.php --scenario=all
   ```
   All PASS. Failing scenarios include trace + SQL.
5. **Bridge unit tests**:
   ```bash
   composer --working-dir=mom test -- --filter DocumentControlServiceConsolidation
   ```
   15/15 PASS expected.
6. **DCC audit + verify-headers** against the VPS database:
   ```bash
   DB_PASS=… php mom/tools/dcc-batch/audit.php
   DB_PASS=… php mom/tools/dcc-batch/verify-headers.php
   ```
   Full pass (no new violations). 389/390 "fully compliant" is the
   current baseline; 1 skip is `SKIP_malformed_no_head` (a pre-existing
   HTML fragment, not caused by this sprint).
7. **Re-scan for hardcode leaks** using these exact greps:
   ```bash
   grep -rn "T('gd')" mom/scripts/portal/
   grep -rn "'QA/QMS'" mom/scripts/portal/
   grep -rn "'General Director'" mom/scripts/portal/
   grep -rn "'Tổng Giám Đốc'" mom/scripts/portal/
   grep -rn "gd:{" mom/scripts/portal/
   ```
   Allowed remaining matches:
   - `02-state-auth-ui.js` lines ~3817 / ~3822 / ~4676 / ~4743 —
     create-doc modal defaults, explicitly deferred to T6 per plan.
   Everything else must be 0. Any new match elsewhere is a regression
   — fix by fetching from `/api/v1/dcc/roles` or
   `DccHeader.getCached()`.

### Specific failure modes to hunt (Fix A / Fix B regressions)

- **Fix A silent failure**: `bridgeDccApprove` wraps the full block
  in `try/catch` with `@error_log('[dcc-bridge] approve …')`. If the
  UPDATE fails silently (missing column, FK violation, etc.), the
  legacy approve still returns 200 but DCC stays stale. Check the
  PHP error log after every approve; any `[dcc-bridge] approve` line
  is a latent defect.
- **Fix A race on `is_current`**: `markRevisionCurrent()` expects
  `recordRevision()` to have inserted first. If `recordRevision()` is
  a no-op (same `doc_code + revision` already exists), the UPDATE
  still runs and flips correctly. Verify by running two approve
  cycles with the same revision label (legacy quirk where a rejected
  review is re-submitted at the same version) — second cycle must
  not duplicate the row.
- **Fix B race on `updateDocViewerHeader` call**: the fix wraps in
  `try/catch{}` to silence missing globals during unit-testing/SSR.
  Confirm in the browser that clicking Edit → Save → Cancel leaves
  the toolbar in the correct state for each transition by running:
  ```js
  document.getElementById('doc-header-toolbar').innerText
  ```
  after each click and comparing against expected text.
- **Fix B stale state after server round-trip**: `saveDraft` and
  `submitForReview` both reload state from the server; confirm
  `updateDocViewerHeader` runs again after those async calls complete
  (lines 1020-1060 / 1830-1900 in `04-workflow-actions.js` already
  call it, so this should be fine — but verify).
- **getCached miss**: `DccHeader.getCached()` returns null before the
  first render. Any caller that treats null as an error (instead of
  falling through to a legacy path) will crash on first paint.
  Review the iframe srcdoc consumer: it must accept null and fall
  through to legacy state.

### Standards cross-check

Cite file:line for each:

- ISO 9001:2015 §7.5.3(b) — identification of current revision ⇒
  after Fix A, `dcc_document_header.revision` = last approved
  revision AND `dcc_document_revision.is_current` unique index
  enforces exactly one row.
- FDA 21 CFR Part 11 §11.10(e) — audit trail ⇒
  `dcc_document_revision_history` append-only trigger. Verify via
  a denied `UPDATE dcc_document_revision_history SET to_status = 'x'`.
- FDA 21 CFR Part 820.40(a) — approval prior to issuance ⇒ state
  machine rejects `draft → released`. Verify via
  `DocumentControlService::release()` with a `draft` header —
  must throw `dcc_invalid_transition`.

### Deliverable format

```
# DCC VPS Verification — <date>

## Fix A — Revision projection
- Pre-fix baseline (SELECT dcc_document_header QMS-MAN-001): <revision>
- Post-fix (same query): <revision, matches legacy manifest? yes/no>
- Simulation fresh scenario: PASS / FAIL + trace
- Bridge unit tests: <pass>/<total>

## Fix B — Edit-mode toolbar
- Click Edit → toolbar innerText: <snippet>
- Click Cancel → toolbar innerText: <snippet>
- Click Edit → Save → toolbar innerText: <snippet>

## Hardcode leak sweep
- T('gd'): 0 / <match count>
- QA/QMS outside create modals: 0 / <match count>
- General Director / Tổng Giám Đốc: 0 / <match count>
- gd:{ : 0 / <match count>

## DCC audit
- audit.php: <compliant>/<total>
- verify-headers.php: <pass>/<fail>

## Standards compliance
- ISO 9001 §7.5.3(b): <file:line evidence>
- Part 11 §11.10(e): <evidence>
- Part 820.40(a): <evidence>

## Defects found
<numbered list; empty if none>
```

If any defect is found, apply the minimal fix, re-run this full
checklist, and include before/after in the report. Do not touch the
legacy JSON store removal (tranche T5); it is intentionally deferred.

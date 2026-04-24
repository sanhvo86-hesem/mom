# DCC Document Header — Authoring Standard

> **Audience:** every author (human or AI) who creates or edits a controlled
> QMS document under `mom/docs/**`.
> **Status:** binding. Documents that violate this standard fail
> `mom/tools/dcc-batch/audit.php` and are blocked from release.
> **Companion:** `contract.json` (workflow state machine, API surface).

This is the **single source of truth** for the visual + structural pattern
that every controlled document must satisfy. It complements the runtime
contract in `contract.json`, which governs the state machine and DB schema.

---

## 1. What is the DCC header?

The DCC (Document Change Control) header is a **two-part contract**:

1. **Head bootstrap** — a small inline `<script>` in `<head>` that loads
   `dcc-header.css` and `11-dcc-header-renderer.js` with cache-busting.
2. **Body placeholder** — a single `<div class="dcc-header">` near the top
   of `<div class="page-body">`. The renderer turns it into the
   logo-+-title-+-metadata ribbon shown at the top of every released doc.

The **values** (title, subtitle, revision, owner, approver, …) are NEVER
hardcoded into the HTML body. They live in PostgreSQL table
`dcc_document_header` and are fetched at render time via
`GET /api/v1/dcc/documents/{doc_code}/header`.

---

## 2. Mandatory pattern

### 2.1 Filename

Every controlled doc MUST live under `mom/docs/<domain>/<…>/<file>.html`
and the filename MUST start with the canonical doc code:

| Family pattern                | Example filename                                     | Canonical code        |
| ----------------------------- | ---------------------------------------------------- | --------------------- |
| `qms-man-NNN[-…]`             | `qms-man-001-qms-manual.html`                        | `QMS-MAN-001`         |
| `pol-qms-NNN[-…]`             | `pol-qms-001-quality-policy.html`                    | `POL-QMS-001`         |
| `sop-NNN[-…]`                 | `sop-102-quality-policy-objectives.html`             | `SOP-102`             |
| `wi-NNN[-…]`                  | `wi-301-cnc-setup.html`                              | `WI-301`              |
| `frm-NNN[-…]`                 | `frm-403-scar.html`                                  | `FRM-403`             |
| `annex-NNN[-…]`               | `annex-101-role-based-access-map.html`               | `ANNEX-101`           |
| `jd-<role>`                   | `jd-chief-executive-officer.html`                    | `JD-CHIEF-EXEC…`      |
| `dept-<name>`                 | `dept-quality-assurance.html`                        | `DEPT-QUALITY-…`      |

The canonical code is always **upper-case**, dash-separated, and stops at
the first numeric suffix for numbered families. Authors must NOT bake the
verbose title into the code (e.g. `QMS-MAN-001-QMS-MANUAL` is wrong —
the canonical form is `QMS-MAN-001`, the verbose part lives in the DB title).

### 2.2 Head bootstrap

EXACTLY this snippet must appear once, immediately AFTER `</title>` (or
after `<meta charset>` / `<head>` if `<title>` is absent):

```html
<script>
/* DCC Header bootstrap — computes absolute URLs from location.pathname so the
 * stylesheet + renderer load correctly regardless of how the document is
 * served (direct, portal iframe + <base href="../"> injection, doc_stream, …).
 * The explicit `?v=…` query string busts browser + service-worker caches
 * whenever the DCC header CSS or renderer ships a new revision. */
(function () {
  var DCC_VERSION = '<YYYY-MM-DD-N>';   /* bump on every renderer/CSS change */
  var appBase = (location.pathname.indexOf('/mom/') === 0) ? '/mom' : '';
  var css = document.createElement('link');
  css.rel = 'stylesheet';
  css.href = appBase + '/styles/dcc-header.css?v=' + DCC_VERSION;
  css.setAttribute('data-dcc-header-stylesheet', '1');
  document.head.appendChild(css);
  var js = document.createElement('script');
  js.defer = true;
  js.src = appBase + '/scripts/portal/11-dcc-header-renderer.js?v=' + DCC_VERSION;
  document.head.appendChild(js);
})();
</script>
```

The marker comment `/* DCC Header bootstrap` is how the audit + migrate
tools detect presence — keep it intact.

### 2.3 Body placeholder

EXACTLY this structure must appear once, at the **top** of
`<div class="page-body">` (or at the top of `<body>` if no page-body):

```html
<!-- DCC Document Change Control header (values served by /api/v1/dcc; bootstrap seed is preview-only) -->
<div class="dcc-header"
     data-dcc-doc-code="<CANONICAL_CODE>"
     data-dcc-locale="vi"
     data-dcc-logo="<RELATIVE_PATH_TO_HESEM_LOGO_SVG>"
     data-dcc-bootstrap='<JSON_SEED>'></div>
```

| Attribute               | Required | Notes                                                                 |
| ----------------------- | -------- | --------------------------------------------------------------------- |
| `class="dcc-header"`    | yes      | The renderer locates placeholders by this class.                      |
| `data-dcc-doc-code`     | yes      | The canonical code (must match filename-derived code).                |
| `data-dcc-locale`       | yes      | `vi` for HESEM (default). `en` only for English-only docs.             |
| `data-dcc-logo`         | yes      | Relative path to `assets/hesem-logo.svg` (depth-correct `../`).        |
| `data-dcc-bootstrap`    | optional | JSON seed for first-paint before the API responds. Renderer overrides. |

The placeholder is a **self-closing div** (`></div>`). Do NOT put body
content inside it — the renderer overwrites whatever is there.

### 2.4 Forbidden legacy markup

The following MUST NOT appear in a compliant document. The migrate script
removes them automatically; new authors must not re-introduce them:

| Forbidden                                                       | Why                                          |
| --------------------------------------------------------------- | -------------------------------------------- |
| `<div class="form-header">…</div>`                              | Old hardcoded header — replaced by DCC.      |
| `<div class="title"><strong class="doc-name">…</div>`           | Old title block — values now in DB.          |
| `<div class="meta"><div class="row">…Mã / Phiên bản / Owner…`   | Old metadata ribbon — DCC ribbon shows this. |
| Hardcoded title / subtitle inside the `iso-map` section heading | ISO heading is `Chuẩn mực áp dụng …`.        |

### 2.5 DB row

A row in `dcc_document_header` MUST exist for every controlled file, keyed
on the canonical code. Required columns:

| Column                  | Source                                                                    |
| ----------------------- | ------------------------------------------------------------------------- |
| `doc_code`              | Canonical from filename (must match `data-dcc-doc-code`).                 |
| `title`                 | Human-readable title (English or Vietnamese, never the bare code).        |
| `subtitle`              | Vietnamese descriptor (optional, but recommended).                        |
| `doc_type`              | Row in `dcc_doc_type_catalog` (`MAN, POL, SOP, WI, FRM, ANNEX, JD, DEPT, ORG, REF, TRN`). |
| `revision`              | `V0`, `V1`, `V2`, … (regex `^V\d+(\.\d+)?$`).                             |
| `effective_date`        | ISO date (`YYYY-MM-DD`).                                                  |
| `owner_role_code`       | FK → `dcc_role_catalog.role_code` (single role — regex still rejects `/`, `,`, `;`, `|`, whitespace). Default comes from `dcc_doc_type_catalog.default_owner_role` for this doc_type. |
| `approver_role_code`    | FK → `dcc_role_catalog.role_code` (single role). Default from `dcc_doc_type_catalog.default_approver_role`. |
| `status`                | `draft → in_review → approved → released → superseded → obsolete`.        |
| `filename`              | Current filename on disk (migration 155). Filename is master for slug; DB tracks it to enforce uniqueness. |
| `filesystem_path`       | Path relative to repo root. Populated by rename pipeline.                 |

Rows are CREATED via `POST /api/v1/dcc/documents/upsert` (preferred) or
the batch tool. UPDATES go through `PATCH /api/v1/dcc/documents/{code}/header`.
Direct SQL writes are forbidden outside the migrate tool.

---

## 2.6 Subtitle (Vietnamese description) — source-of-truth chain

The Vietnamese subtitle that appears under the title in the header ribbon
has FOUR potential storage locations. They MUST stay in sync. Authority
order (highest wins on render):

| # | Location                                              | Used by                                       | Notes                                              |
| - | ----------------------------------------------------- | --------------------------------------------- | -------------------------------------------------- |
| 1 | `dcc_document_header.subtitle` (PostgreSQL)           | DCC ribbon renderer (live, via API)           | **Render authority.** Empty here → no subtitle on screen. |
| 2 | `data-dcc-bootstrap.header.subtitle` (HTML attribute) | First-paint flash before API responds         | Should match (1). Migrate seeds it from (1) at injection time. |
| 3 | `doc_descriptions.json[doc_code]` (legacy file)       | Listing-card description (legacy fallback)    | Mirror of (1). `rename_doc` writes to both.        |
| 4 | `<span class="sub-vn">…</span>` (legacy HTML markup)  | Pre-DCC layout only — should not exist anymore | Migrate strips this when injecting the placeholder. |

When the migration tool seeds (1) for a new doc, it walks this priority
chain to find the best available value:
**`<span class="sub-vn">` → bootstrap seed → `doc_descriptions.json[code]` → null.**

When the user edits a doc via the portal "Chỉnh Sửa Tài Liệu" modal:
1. `rename_doc` writes the new value to **(3)**.
2. `POST /api/v1/dcc/documents/upsert` writes the new value to **(1)**.
3. The renderer re-fetches and updates the on-screen ribbon.

**Never edit (2) or (4) directly.** (2) is overwritten by (1) on every
render; (4) is forbidden post-migration (§2.4).

---

## 3. Edit flow (what happens when a user clicks "Chỉnh Sửa Tài Liệu")

```
┌───────────────────────────────────────────────────────────────────┐
│ User edits ID / title / VN description in the portal modal       │
└───────────────────────────┬───────────────────────────────────────┘
                            │
                            ▼
┌───────────────────────────────────────────────────────────────────┐
│ POST /mom/api.php?action=rename_doc                                │
│   → renames file on disk if code or title slug changed             │
│   → updates <title> tag + form-header in HTML body                 │
│   → updates doc_descriptions.json (legacy mirror)                  │
└───────────────────────────┬───────────────────────────────────────┘
                            │
                            ▼
┌───────────────────────────────────────────────────────────────────┐
│ POST /api/v1/dcc/documents/upsert                                  │
│   → canonicalizes doc_code (strips suffix)                         │
│   → INSERT or UPDATE dcc_document_header                           │
│   → if old_doc_code provided + differs, RENAME row in place        │
│     (FK ON UPDATE CASCADE handles DCRs / DCNs / history)           │
└───────────────────────────┬───────────────────────────────────────┘
                            │
                            ▼
┌───────────────────────────────────────────────────────────────────┐
│ Browser refreshes:                                                 │
│   • DCC overlay re-fetches /api/v1/dcc/documents?limit=500         │
│     → updates `doc.__displayDesc` for the listing card             │
│   • rescanDocs() re-scans filesystem for the renamed file          │
│   • renderDocuments() + renderSidebar() repaint                    │
│   • If doc viewer is open, DCC header renderer re-fetches /header  │
└───────────────────────────────────────────────────────────────────┘
```

**Filename is master** for: filesystem identity, slug, on-screen `title`
in listing card and breadcrumb.
**DB is master** for: `doc_code` (ID badge), `subtitle` (VN description),
`revision`, `owner`, `approver`, `effective_date`, `status`.

---

## 4. Tools

| Tool                                       | Purpose                                                                |
| ------------------------------------------ | ---------------------------------------------------------------------- |
| `mom/tools/dcc-batch/audit.php`            | Read-only structural check (C1–C10). Exits non-zero on violations.     |
| `mom/tools/dcc-batch/migrate.php`          | Idempotent migrate / fix. Applies the standard to legacy docs.         |
| `mom/tools/dcc-batch/verify-headers.php`   | Simulates the rendered ribbon per row; verifies template conformance.  |
| `mom/tools/dcc-batch/lib.php`              | Shared utilities (filename → code, title extraction, HTML mutators).   |

**Scope:** HTML files only. Excel forms (`*.xlsx`) are NOT covered by these
tools — they cannot host an inline `<script>` and continue to use the
legacy `doc_descriptions.json` + `scan_cache` flow for the listing card.
The `audit` and `verify-headers` tools intentionally skip non-HTML.

Common invocations (from project root, `DB_PASS` set):

```bash
# Check structural compliance (C1–C10), exit 1 if anything violates
DB_PASS=… php mom/tools/dcc-batch/audit.php

# Simulate the rendered ribbon for every doc and verify template conformance
DB_PASS=… php mom/tools/dcc-batch/verify-headers.php
DB_PASS=… php mom/tools/dcc-batch/verify-headers.php --verbose      # show 3 sample renders

# Preview what migrate would do for SOP-* docs only
DB_PASS=… php mom/tools/dcc-batch/migrate.php --dry-run --filter-prefix=SOP --verbose

# Apply migration (idempotent — safe to re-run any time)
DB_PASS=… php mom/tools/dcc-batch/migrate.php

# Force re-injection (bumps DCC_VERSION cache-bust everywhere)
DB_PASS=… php mom/tools/dcc-batch/migrate.php --force-bootstrap
```

The verifier also checks per-row template invariants:

| Code  | Invariant                                                          |
| ----- | ------------------------------------------------------------------ |
| T1    | `title` non-empty AND not equal to bare `doc_code`                 |
| T2    | `doc_code` matches `^[A-Z][A-Z0-9]+(?:-[A-Z0-9]+)*$`               |
| T3    | `doc_type` ∈ {MAN,POL,SOP,WI,FRM,ANNEX,JD,DEPT,ORG,REF,TRN}         |
| T4    | `revision` matches `^V\d+(\.\d+)?$`                                 |
| T5    | `effective_date` matches `^\d{4}-\d{2}-\d{2}$`                      |
| T6    | `owner_role_code` non-empty, single-role (no `/,;|whitespace`)      |
| T7    | `approver_role_code` non-empty, single-role                         |
| T8    | `status` ∈ {draft, in_review, approved, released, superseded, obsolete} |
| T9    | `subtitle` is null OR a trimmed non-empty string                   |
| T10   | (HTML only) `data-dcc-doc-code` matches DB doc_code                 |
| X     | No DB orphan rows; no file-on-disk without DB row                  |

After any change to `dcc-header.css` or `11-dcc-header-renderer.js`, bump
the `DCC_VERSION` constant in `mom/tools/dcc-batch/lib.php` AND run
`migrate.php --force-bootstrap` to push the new stamp into every doc.

---

## 5. Audit checks (compliance criteria)

| Code  | Check                                                              | Bucket if failed              |
| ----- | ------------------------------------------------------------------ | ----------------------------- |
| C1    | HTML readable                                                      | `C1_unreadable`               |
| C2    | Canonical doc_code derivable from filename                         | `C2_no_canonical_code`        |
| C3    | DCC bootstrap script present in `<head>`                           | `C3_missing_bootstrap`        |
| C4    | DCC body placeholder present                                       | `C4_missing_placeholder`      |
| C5    | `data-dcc-doc-code` matches filename canonical                     | `C5_placeholder_code_mismatch`|
| C6    | No legacy `<div class="form-header">` remaining                    | `C6_legacy_form_header`       |
| C7    | No legacy `<div class="title"><strong class="doc-name">` outside DCC| `C7_legacy_title_block`       |
| C8    | DB row exists in `dcc_document_header`                             | `C8_missing_db_row`           |
| C9    | DB title is non-empty and not the bare code                        | `C9_empty_db_title`           |
| C10   | DB doc_type is one of the valid enum values                        | `C10_invalid_db_doc_type`     |

Files without a `<head>` tag are reported under `SKIP_malformed_no_head`
and are NOT counted as violations — they are content fragments, not real
documents.

---

## 6. AI authoring instructions

When asked to **create a new controlled document**:

1. Determine the canonical code (e.g. `SOP-456`) and the filename
   (`sop-456-<short-slug>.html`).
2. Place the file under the correct domain folder — see
   `.ai/repo-map.json` and `.ai/contracts-map.json`.
3. Start from a recently-migrated peer (e.g. `mom/docs/operations/sops/01-SOP-100/sop-102-…html`)
   and copy its `<head>` bootstrap + body placeholder verbatim.
4. Replace ONLY the `data-dcc-doc-code`, `data-dcc-logo` (path depth),
   and the `data-dcc-bootstrap` JSON seed.
5. Do NOT add any `<div class="form-header">`, `<div class="title">`, or
   `<div class="meta">` block — those are forbidden (§2.4).
6. Create the DB row by either:
   - Calling `POST /api/v1/dcc/documents/upsert` with `doc_code`, `title`,
     `subtitle`; OR
   - Running `php mom/tools/dcc-batch/migrate.php --filter-prefix=<CODE>`
     after you've placed the file on disk.
7. Run `php mom/tools/dcc-batch/audit.php --filter-prefix=<CODE>` and
   confirm `Fully compliant: 1` before considering the task done.

When asked to **edit an existing document's title/description**:

- Use the portal's "Chỉnh Sửa Tài Liệu" modal — it goes through the
  authoritative path (`rename_doc` + DCC upsert).
- Do NOT edit `data-dcc-bootstrap` directly — the renderer overrides from
  the API on every render, so any inline edit is wasted and will drift.

---

## 7. Versioning & change control

This standard itself is governed by `contract.json` in the same directory.
Material changes (renaming attributes, adding/removing required fields,
changing the script anchor location) require:

1. A migration step in `mom/tools/dcc-batch/migrate.php`.
2. A new `DCC_VERSION` stamp in `mom/tools/dcc-batch/lib.php`.
3. Updated audit checks to enforce the new requirements.
4. A pull request that updates this `.md` file in the same commit.

The audit script is the executable form of this standard — if the audit
passes, the doc is compliant. Treat the audit as the test, this `.md` as
the test plan.

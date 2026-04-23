# Codex QA Prompt — DCC Document Header Standardization

> Drop-in prompt for **OpenAI Codex / GPT / Claude / any code-aware LLM**
> to perform a final visual + structural audit of the 387 controlled QMS
> documents migrated to the DCC header standard.
>
> Hand this prompt + SSH access (`root@103.110.87.55`) to the agent.

---

## Mission

Verify that every controlled HTML document under
`/var/www/eqms.hesemeng.com/mom/docs/**` renders a header that conforms
EXACTLY to the canonical reference document and the DCC header standard.

**Canonical reference:** `mom/docs/system/quality-manual/qms-man-001-qms-manual.html`
**Specification:** `mom/contracts/objects/quality_improvement--document-control/dcc-document-header.standard.md`

---

## What "compliant" means

A compliant document MUST satisfy ALL of these in order:

### (A) Head bootstrap (line ≈ 6–25)
- `<title>` present
- Immediately after `</title>`, a `<script>` containing the marker
  `/* DCC Header bootstrap` that injects `dcc-header.css` and
  `11-dcc-header-renderer.js` with a cache-busting `?v=…` query string.

### (B) Body placeholder
- A single `<div class="dcc-header" data-dcc-doc-code="<CANONICAL_CODE>" …></div>`
  near the top of `<div class="page-body">`.
- `data-dcc-doc-code` MUST match the canonical code derived from the filename.
- `data-dcc-locale="vi"` (or `en` for English-only docs).
- Self-closing div — no body content inside the placeholder.

### (C) NO redundant content between dcc-header and the first real content anchor
The first real-content anchor is one of: `<div class="iso-map">`,
`<div class="form-sheet">`, `<div class="doc-content">`, `<div class="cover">`,
`<div class="preface-block">`, `<div class="hero">`, `<div class="note">`
(when it's a content note, not a header note), `<div class="section">`, `<h2>`.

The following blocks MUST NOT appear anywhere in the body — they duplicate
the DCC ribbon and must be stripped:

| Forbidden block                                                                                                      | Marker token                            |
| -------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| `<div class="form-header">…</div>`                                                                                   | `class="form-header"`                   |
| `<div class="doc-header">…</div>` (or `doc-header stack`, etc.)                                                      | `class="doc-header"`                    |
| `<div class="title"><strong class="doc-name">…</strong>…</div>`                                                      | `class="doc-name"`                      |
| `<div class="title"><strong>CODE — Title</strong>…</div>`                                                            | `class="title">` followed by `<strong>CODE` |
| `<div class="meta"><div class="row"><b>Code:</b>…</div>…</div>`                                                      | `<b>Code:</b>` inside a row             |
| `<div class="card"><div class="badge"><span class="dot"></span>CODE</div><h1>CODE - Title</h1>…</div>`               | `card`+`badge`+`dot`+code               |
| Standalone `<h1>CODE - Title</h1>` within first 4096 chars after dcc-header (where CODE matches `[A-Z]+-[A-Z0-9]+…`) | h1 with code-prefix                     |

### (D) Database row
- Row exists in `dcc_document_header` keyed on the canonical code.
- `title` non-empty and not equal to the bare code.
- `subtitle` is either null OR a Vietnamese description.
- `doc_type` ∈ {MAN, POL, SOP, WI, FRM, ANNEX, JD, DEPT, ORG, REF, TRN}.
- `revision` matches `^V\d+(\.\d+)?$` (default `V0`).
- `effective_date` is ISO `YYYY-MM-DD`.
- `owner_role_code` and `approver_role_code` are single-role (no `/`, `,`, `;`, `|`, whitespace).
- `status` ∈ {draft, in_review, approved, released, superseded, obsolete}.
- For HTML docs, `data-dcc-doc-code` in the body must equal `dcc_document_header.doc_code`.

---

## Pre-built tooling (run these FIRST and report their output)

```bash
# Compliance check (structural). Exit 0 if 100% compliant (excluding
# the known certificate-template fragment).
DB_PASS='<from /etc/php/8.5/fpm/pool.d/mom.conf>' \
  php mom/tools/dcc-batch/audit.php

# Template-render simulation. Verifies every DB row produces a
# template-conformant ribbon.
DB_PASS='…' php mom/tools/dcc-batch/verify-headers.php
DB_PASS='…' php mom/tools/dcc-batch/verify-headers.php --verbose
```

Expected baseline:
- audit.php:        `Fully compliant: 389 / 390` (1 SKIP_malformed expected for `certificate-template.html`)
- verify-headers:   `Template-conformant: 387 / 387`

If either tool reports drift, run:
```bash
DB_PASS='…' php mom/tools/dcc-batch/migrate.php          # idempotent fix
```

---

## Manual visual cross-check (your job)

Pick at least 25 documents covering ALL of these categories, fetch the
body slice immediately after the dcc-header placeholder, and verify it
matches the rules above. Sample evenly:

| Category                   | Path glob                                                            | Sample count |
| -------------------------- | -------------------------------------------------------------------- | ------------ |
| Quality Manual             | `mom/docs/system/quality-manual/**/*.html`                           | 1            |
| Policies                   | `mom/docs/system/policies/**/*.html`                                 | 2            |
| Department Handbooks       | `mom/docs/system/organization/02-Department-Handbooks/*.html`        | 3            |
| Job Descriptions           | `mom/docs/system/organization/03-Job-Descriptions/**/*.html`         | 3            |
| RACI / Authority           | `mom/docs/system/organization/04-RACI-Authority/*.html`              | 1            |
| SOPs                       | `mom/docs/operations/sops/**/*.html`                                 | 3            |
| Work Instructions          | `mom/docs/operations/work-instructions/**/*.html`                    | 3            |
| ANNEX (References)         | `mom/docs/operations/references/**/*.html`                           | 3            |
| SYS-OPS Guides             | `mom/docs/training/system-ops/01-System-Guides/SYS-OPS-*.html`       | 2            |
| MRR Pack                   | `mom/docs/training/system-ops/03-MRR-Pack/*.html`                    | 2            |
| Competency / Training      | `mom/docs/training/competency/**/*.html`                             | 2            |

For each sample, run via SSH:

```bash
ssh root@103.110.87.55 "python3 -c \"
import re
d=open('<ABS_PATH>').read()
m=re.search(r'<div[^>]*class=.dcc-header.*?></div>(.{0,1500})',d,re.S)
print(re.sub(r'\\\\s+',' ',m.group(1))[:800] if m else 'NO PLACEHOLDER')
\""
```

Classify each as:
- **PASS**: First non-whitespace child after dcc-header is a real content anchor (see list in section C above).
- **FAIL**: Any forbidden block appears. State the exact pattern.

---

## Final deliverable

A markdown report containing:

1. **audit.php output** verbatim (Fully compliant / With violations counts)
2. **verify-headers.php output** verbatim
3. **A 25+ row table** with columns: `# | code | path | verdict (PASS/FAIL) | bad_pattern (if FAIL)`
4. **Summary**: PASS rate, list of any new bad patterns discovered (i.e. patterns not listed in section C), recommended action for each.
5. **Regression check**: Pick 3 documents that the user has personally edited via the portal "Chỉnh Sửa Tài Liệu" dialog (look for `updated_by` ≠ `'dcc-batch'` in the DB) and verify the user's edits ARE preserved (they should be — the migrate is supposed to be idempotent and not overwrite manual edits).

---

## Boundary rules

- DO NOT modify any HTML file or DB row without explicit user approval.
- DO NOT touch Excel forms (`*.xlsx`) — they are out of scope per user.
- DO NOT widen the strip patterns to remove legitimate content blocks — when in doubt, FAIL the audit and ask.
- The `certificate-template.html` fragment is EXPECTED to fail audit (no `<head>`); it's a partial include, not a standalone doc.

---

## Why this matters

These 387 controlled documents are the operating fabric of HESEM's QMS
(ISO 9001:2015, AS9100D, FDA 21 CFR Part 820.40 compliance). The DCC ribbon
is the **identity card** of every controlled document — its consistency
proves the entire document control system is governed, auditable, and
ready for ISO certification. A single non-conformant doc undermines the
audit trail.

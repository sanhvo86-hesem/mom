# HESEM MOM ERP — Claude Code Guide

## MANDATORY: Read Before Doing Anything

**Follow the 4-phase workflow in `.ai/AI-WORKFLOW.md` — no exceptions.**

Quick mandatory sequence every session:
1. Read `.ai/CONVENTIONS.md` — WHERE to put files
2. Read `.ai/repo-map.json` — project topology
3. Read `AGENTS.md` — governance rules
4. THEN locate → plan → execute → verify

**NEVER create files at repo root. NEVER place reports inside `mom/docs/`.**

## MANDATORY: Graphics Authority Link (no-hardcode rule)

**Every UI module resolves visual parameters through the Graphics Authority.
Never hardcode colors, font stacks, font sizes, spacing, radius, shadows,
motion durations, or any other visual token in JS, inline style, or HTML.**

- **Backend authority:** `graphics_token_catalog` + `graphics_token_value` tables
  (migration `148_graphics_authority_tables.sql`). Legacy file authority:
  `mom/data/config/design-system-config.json` — read via
  `DesignTokenCatalogService` so both JSON_ONLY and POSTGRES_PRIMARY modes work.
- **Frontend authority:** `window.GraphicsAuthority.tokens.read('<token_key>')`
  in `mom/scripts/portal/00bb-graphics-authority.js`. For CSS, bind to the
  `css_variable` declared in `graphics_token_catalog` (e.g. `--brand-primary`).
- **Every edit widget must run a simulation scene before committing.** Use
  `ControlKit.*` widget factories — they already stage into the draft buffer
  and expose a Simulate button. Never build a new edit UI that writes directly
  to `HmTheme.saveAdminConfig` or bypasses `PreviewScenes.openSimulationModal`.
- **Adding a new visual parameter:** add a row to `graphics_token_catalog`
  (via a new migration or the admin UI), declare it in the appropriate
  `graphics_component_contract.overridable_tokens` array, add a renderer to
  `PreviewScenes.renderers` if the parameter needs its own scene. Only then
  may a UI module call `GraphicsAuthority.tokens.read()` on the new token_key.
- **When editing an existing module:** before you add any visual literal,
  search `graphics_token_catalog` for an existing token; if one exists, use
  it; if not, add a token first. Hex colors in JS, `'16px'` string padding,
  inline font-family strings, and hardcoded motion durations in diff review
  will be rejected.
- **Preview / simulation is non-optional.** Every "save" action in an admin
  graphics UI MUST flow through `GraphicsAuthority.preview.simulate()` which
  records a row in `graphics_simulation_run` as evidence.
- **Bridge for legacy globals:** `_hmSet`, `_hmSetWithUnit`, and
  `_admGraphicsMarkChange` are preserved as aliases that delegate to
  `GraphicsAuthority.tokens.stage()` / `draft.recordChange()`. Do not call
  them in new code; use the namespaced API.

## MANDATORY: DCC Document Header Standard (controlled docs under mom/docs/**)

**Every controlled QMS document under `mom/docs/**` MUST satisfy the DCC
header pattern.** No exceptions for new authorship.

- **Spec:** `mom/contracts/objects/quality_improvement--document-control/dcc-document-header.standard.md`
- **Audit (executable test):** `php mom/tools/dcc-batch/audit.php`
- **Migrate / fix (idempotent):** `php mom/tools/dcc-batch/migrate.php`

In short:
- Filename starts with the canonical doc code (e.g. `qms-man-001-…html`).
- `<head>` contains the DCC bootstrap `<script>` (after `</title>`).
- `<body>` contains a single `<div class="dcc-header" data-dcc-doc-code="…">`
  near the top of `<div class="page-body">`.
- A row exists in `dcc_document_header` keyed on the canonical code.
- NO legacy `<div class="form-header">`, `<div class="title">`, or
  `<div class="meta">` blocks remain.

**Filename is master** for: filename, slug, on-screen title in listing card.
**DB is master** for: doc_code (ID badge), VN subtitle, revision, owner,
approver, effective_date, status. Renderer
`mom/scripts/portal/11-dcc-header-renderer.js` fetches DB values via
`GET /api/v1/dcc/documents/{code}/header`.

When creating a new doc, copy the head bootstrap + body placeholder verbatim
from a recent peer (e.g. `mom/docs/operations/sops/01-SOP-100/sop-102-…html`).
When editing title / description, use the portal "Chỉnh Sửa Tài Liệu" modal —
it routes through `rename_doc` + DCC upsert. Never edit the inline
`data-dcc-bootstrap` JSON directly; the renderer overrides it on every
render so the edit will be lost.

## AI Context Loading Protocol

**ALWAYS read the index files FIRST before opening any source file.**
This repository has 54 controllers, 122 services, 137 SQL migrations, and 67 contract objects.
The `.ai/` directory is a pre-built knowledge index that lets you find the right file in seconds.

### Step-by-step context loading

1. **`.ai/repo-map.json`** — Start here. Project topology, namespace map, infra services, file counts.
2. **`.ai/route-map.json`** — Find which controller + method handles a given route or action key.
3. **`.ai/db-map/index.json`** — Grep for table name to find its domain. Then read `.ai/db-map/<domain>.json` for full details. Do NOT read the full `.ai/db-map.json` (280K) unless you need cross-domain analysis.
4. **`.ai/contracts-map.json`** — Find which domain owns a resource and which table stores it.
5. **`.ai/symbols.json`** — Grep for a class or method name to find its file path. Do NOT read the full file.
6. **`.ai/module-summaries/<domain>.md`** — Business rules, gotchas, entry points for that domain.

**Only AFTER reading the index, open the minimal set of source files needed.**
Do NOT scan unrelated files. Do NOT read entire directories.

### Token-efficient lookup patterns

```
# Find which domain owns a table:
Grep "table_name" in .ai/db-map/index.json → get domain → Read .ai/db-map/<domain>.json

# Find which file contains a class:
Grep "ClassName" in .ai/symbols.json → get file path → Read that file

# Find which controller handles a route:
Grep "action_key" in .ai/route-map.json → get controller + method
```

### Domains

| Slug | Key | Summaries file |
|------|-----|----------------|
| Master Data | `master_data` | `.ai/module-summaries/master-data.md` |
| Planning & Production | `planning_production` | `.ai/module-summaries/planning-production.md` |
| Quality Improvement | `quality_improvement` | `.ai/module-summaries/quality-improvement.md` |
| Finance | `finance` | `.ai/module-summaries/finance.md` |
| Inventory & Logistics | `inventory_logistics` | `.ai/module-summaries/inventory-logistics.md` |
| Procurement | `procurement_supplier_quality` | `.ai/module-summaries/procurement.md` |
| Commercial & Customer | `commercial_customer` | `.ai/module-summaries/commercial-customer.md` |
| Maintenance & EHS | `maintenance_ehs` | `.ai/module-summaries/maintenance-ehs.md` |
| Analytics | `analytics` | `.ai/module-summaries/analytics.md` |
| MES Execution | `mes_execution` | `.ai/module-summaries/mes-execution.md` |
| Traceability | `traceability_serialization` | `.ai/module-summaries/traceability.md` |
| Core Infrastructure | `core_infrastructure` | `.ai/module-summaries/core-infrastructure.md` |

### When proposing changes, always state

- Which module/domain is affected
- Which endpoint(s) are involved (`route-map.json`)
- Which table(s) are read/written (`db-map/<domain>.json`)
- Regression surface (what else might break)

---

## Project overview

- **Stack:** PHP 8.5+, PostgreSQL, Redis, RabbitMQ
- **Entry point:** `mom/api/index.php`
- **Autoload:** `mom/composer.json` (PSR-4)
- **Namespaces:** `MOM\Api\Controllers\`, `MOM\Api\Services\`, `MOM\Services\`, `MOM\Database\`
- **Middleware pipeline:** CORS → ApiKey → Auth → RateLimit → Audit
- **Data layer:** 4-mode strategy (JSON_ONLY → SHADOW_WRITE → POSTGRES_PRIMARY → POSTGRES_ONLY)

## Re-generating the index

When source files change significantly, re-run:

```bash
php tools/scripts/ai-index/generate.php --verbose
# or
composer --working-dir=mom run ai:index
```

JSON files are fully regenerated. Module summary `.md` files are never overwritten.

# HESEM MOM ERP — Claude Code Guide

## MANDATORY: Read Before Doing Anything

**Follow the 4-phase workflow in `.ai/AI-WORKFLOW.md` — no exceptions.**

Quick mandatory sequence every session:
1. Read `.ai/CONVENTIONS.md` — WHERE to put files
2. Read `.ai/repo-map.json` — project topology
3. Read `AGENTS.md` — governance rules
4. THEN locate → plan → execute → verify

**NEVER create files at repo root. NEVER place reports inside `mom/docs/`.**

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

- **Stack:** PHP 8.2+, PostgreSQL, Redis, RabbitMQ
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

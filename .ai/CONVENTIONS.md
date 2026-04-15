# HESEM MOM ERP — File Placement Conventions

> This document is the SINGLE SOURCE OF TRUTH for where to place files.
> ALL AI agents MUST follow these rules — regardless of which tool is used.
> Humans should follow them too.

## AI Tool Entry Points

Each AI tool reads a different config file. All of them point here.

| AI Tool | Config File | Status |
|---------|-------------|--------|
| Claude Code | `CLAUDE.md` | ✓ |
| OpenAI Codex / GPT agents | `AGENTS.md` | ✓ |
| GitHub Copilot | `.github/copilot-instructions.md` | ✓ |
| Cursor | `.cursorrules` | ✓ |
| Windsurf | `.windsurfrules` | ✓ |
| Aider | `.aider.conf.yml` | ✓ |
| Any other agent | Read `AGENTS.md` + this file | ✓ |

## Directory Map

```
/                                 # Repo root — config files ONLY
├── .ai/                          # AI knowledge index (auto-generated, do NOT edit JSON)
│   ├── db-map/                   # Per-domain table index (auto-generated)
│   ├── module-summaries/         # Per-domain business context (human-editable)
│   ├── CONVENTIONS.md            # THIS FILE — file placement rules
│   ├── repo-map.json             # Project topology
│   ├── db-map.json               # Full table index (compact)
│   ├── symbols.json              # PHP class/method index
│   ├── contracts-map.json        # Domain contract objects
│   └── route-map.json            # API route index
├── .claude/                      # Claude Code config
├── .github/workflows/            # CI/CD pipelines
├── docs/                         # Reference documentation (NOT served by app)
│   ├── api/                      # API specifications
│   ├── architecture/             # Architecture decisions and specs
│   ├── audits/                   # Security and compliance audits
│   ├── backend/                  # Backend specifications
│   ├── benchmark/                # Gap analysis, scorecards
│   ├── operations/               # Operational governance (M365, SharePoint)
│   ├── release/                  # Release notes and merge gates
│   └── standards/                # QMS standards (numbered governance docs)
│       ├── templates/            # Master templates (referenced by code)
│       └── reference/            # Reference materials (referenced by code)
├── tools/                        # Build, automation, and utility scripts
│   ├── scripts/                  # Categorized scripts
│   │   ├── ai-index/             # AI index generator
│   │   ├── encoding/             # Unicode/encoding repair
│   │   ├── form-repair/          # Form document repair
│   │   ├── language-polish/      # Vietnamese language cleanup
│   │   ├── sop-rewrite/          # SOP generation
│   │   └── ...                   # Other script categories
│   ├── engines/                  # Translation and processing engines
│   ├── data/                     # Reference data for scripts
│   └── vps-setup/                # VPS deployment scripts
├── _reports/                     # Generated CI/test reports (gitignored OK)
│   ├── observability/
│   ├── release-candidate/
│   └── runtime-assurance/
├── mom/                          # APPLICATION SOURCE CODE
│   ├── api/                      # PHP API layer
│   │   ├── controllers/          # HTTP controllers
│   │   ├── services/             # Business logic services
│   │   └── middleware/           # Request middleware
│   ├── contracts/                # Domain contracts and schemas
│   │   └── objects/              # Per-domain object definitions
│   ├── database/                 # Data layer
│   │   └── migrations/           # SQL migrations (numbered)
│   ├── data/                     # Runtime data and config
│   │   ├── registry/             # Generated registry reports
│   │   └── config/               # Runtime configuration
│   ├── assets/                   # Static assets (style.css, app.js, logos — served by app)
│   ├── design/                   # Frontend design system
│   ├── docs/                     # App-served documents (DO NOT MOVE)
│   │   ├── ai-prompts/           # AI context and prompt docs
│   │   ├── forms/                # QMS forms (served by FileController)
│   │   ├── training/             # Training matrices (served by app)
│   │   ├── system/               # System docs (served by app)
│   │   └── operations/           # SOPs, WIs (served by app)
│   ├── ops/                      # Operations
│   │   ├── local-runtime/        # Local dev (docker-compose, router)
│   │   └── vps/                  # VPS deploy scripts
│   ├── release/                  # Release manifests and receipts
│   ├── scripts/                  # Frontend JavaScript
│   ├── styles/                   # CSS stylesheets
│   ├── tests/                    # PHPUnit tests
│   ├── tools/                    # PHP tools (release, schema, bootstrap)
│   └── vendor/                   # Composer dependencies (gitignored)
├── CLAUDE.md                     # Claude Code guide (KEEP at root)
├── AGENTS.md                     # Agent governance rules (KEEP at root)
└── [web files]                   # index.html, index.php, robots.txt, favicon.ico
```

## Placement Rules

### Where to put NEW files

| You are creating... | Put it in | Example |
|---|---|---|
| AI prompt or context doc | `docs/ai-prompts/` | `backend-upgrade-prompt-2026-04-15.md` |
| Architecture spec or decision | `docs/architecture/` | `event-sourcing-decision.md` |
| API specification | `docs/api/` | `billing-api-contracts.md` |
| Backend specification | `docs/backend/` | `CACHE_INVALIDATION_SPEC.md` |
| Security or compliance audit | `docs/audits/` | `agent7-network-security.md` |
| Benchmark or gap analysis | `docs/benchmark/` | `oee-benchmark-q2-2026.md` |
| Release gate or notes | `docs/release/` | `v2.2-release-gate.md` |
| QMS standard (numbered) | `docs/standards/` | `37-new-standard.md` |
| Standard template | `docs/standards/templates/` | `frm-template.xlsx` |
| Build or automation script | `tools/scripts/<category>/` | `tools/scripts/encoding/fix-utf8.py` |
| Reference data for scripts | `tools/data/` | `word-list.txt` |
| Generated CI/test report | `_reports/<category>/` | `_reports/security/scan-report.json` |
| Generated registry report | `mom/data/registry/` | `wave7-report.json` |
| Release manifest or receipt | `mom/release/` | `v2.2.manifest.json` |
| QMS form (HTML, served) | `mom/docs/forms/frm-NNN-*/` | `FRM-501-Production-Order.html` |
| Training content (served) | `mom/docs/training/` | `training-matrix-new.html` |
| System doc (served by app) | `mom/docs/system/` | `closure-tranche19.md` |
| Operations doc (served) | `mom/docs/operations/` | `sops/SOP-301.html` |
| PHP controller | `mom/api/controllers/` | `BillingController.php` |
| PHP service | `mom/api/services/` | `BillingService.php` |
| SQL migration | `mom/database/migrations/` | `138_billing_tables.sql` |
| Domain contract | `mom/contracts/objects/` | `finance--billing/contract.json` |
| PHP tool (release/schema) | `mom/tools/` | `verify_billing.php` |

### What NEVER to put at root

- Documentation files (*.md except CLAUDE.md, AGENTS.md)
- Python/PHP/JS scripts
- JSON data files
- Word/Excel documents
- Generated reports or artifacts

### Naming conventions

| Convention | Example |
|---|---|
| kebab-case for files/folders | `world-class-gap-analysis.md` |
| Numbered prefix for ordered files | `01-immutable-rules.md` |
| `frm-NNN-` prefix for QMS forms | `FRM-403-SCAR.html` |
| Date suffix for versioned files | `authority-2026-04-15.md` |
| UPPER_SNAKE for backend specs | `POSTGRES_MIGRATION_SPEC.md` |
| PascalCase for PHP classes | `BillingController.php` |
| snake_case for SQL migrations | `138_billing_tables.sql` |

### Code-referenced paths (DO NOT MOVE without code changes)

These directories are hardcoded in PHP controllers and services:

- `mom/docs/forms/` — FileController, FormEngine, path mappings
- `mom/docs/training/` — FileController, document portal scanning
- `mom/docs/system/` — FileController, protected system folder
- `mom/docs/operations/` — FileController, protected operations folder
- `mom/assets/` — DocumentController, static asset serving (style.css, app.js, logos)
- `docs/standards/templates/` — Test validation references
- `docs/standards/reference/` — GraphicsGovernanceRepository patterns

# GitHub Copilot Instructions — HESEM MOM ERP

## Mandatory Workflow
Follow `.ai/AI-WORKFLOW.md` before every task:
1. ORIENT: read `CONVENTIONS.md`, `repo-map.json`, `AGENTS.md`
2. LOCATE: Grep index files to find classes/tables/routes
3. PLAN: state exact file paths before creating anything
4. VERIFY: run PHPStan + PHPUnit after changes

NEVER place files at repo root. NEVER place reports or dev docs in `mom/docs/`.

## Project Orientation
1. Read `.ai/repo-map.json` first — project topology, 54 controllers, 122 services, 137 migrations
2. To find a table: Grep `.ai/db-map/index.json` → read `.ai/db-map/<domain>.json`
3. To find a class/method: Grep `.ai/symbols.json`
4. To understand a domain: read `.ai/module-summaries/<domain>.md`
5. Full context loading protocol: see `CLAUDE.md`

## Code Conventions
- PHP 8.2+, PSR-4, `declare(strict_types=1)`, `final class`
- Never suggest Laravel/Symfony/framework migration
- Always add file-based fallback for infrastructure (Redis, RabbitMQ, S3)
- Follow CacheService pattern: try primary → catch Throwable → fallback → log
- Middleware pipeline: CORS → ApiKey → Auth → RateLimit → Audit

## When proposing changes, state
- Which domain is affected
- Which table(s) are read/written
- What else might break (regression surface)

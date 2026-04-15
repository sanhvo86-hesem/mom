# GitHub Copilot Instructions — HESEM MOM ERP

## File Placement
Read `.ai/CONVENTIONS.md` before creating any file.
NEVER place files at the repo root directory.

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

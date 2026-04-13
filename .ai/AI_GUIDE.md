# AI Knowledge Index — HESEM MOM ERP

This directory contains a pre-built knowledge index of the codebase.
**Read these files before opening any source file** to reduce token usage.

---

## Index files

| File | What it contains | When to use |
|------|-----------------|-------------|
| `repo-map.json` | Project topology: stack, namespaces, entrypoints, infrastructure service locations, counts | Always read first |
| `route-map.json` | Every API route → controller → method → services → domain | When you need to find which file handles a request |
| `db-map.json` | Every SQL table → migration file, primary key, foreign keys, related services | When touching database schema or queries |
| `contracts-map.json` | Domain contract objects → canonical resource, primary table, workflow state model | When working with a specific business object |
| `symbols.json` | Every PHP class → public methods → file path | When you know a class/method name but not its file |
| `module-summaries/<domain>.md` | Business rules, gotchas, entry points per domain | When you need business context, not just code location |

---

## Recommended loading sequence for any task

```
1. repo-map.json          ← orient: what kind of project, where things live
2. route-map.json         ← find: which controller/action is involved
3. contracts-map.json     ← find: which domain and table owns the data
4. db-map.json            ← find: schema details, foreign keys
5. module-summaries/X.md  ← understand: business rules and gotchas
6. symbols.json           ← locate: exact file path for a class/method
      ↓
Open only the 5–15 files actually needed
```

---

## Example prompts using this index

**Bug fix:**
> Read `.ai/route-map.json` to find the controller for action `order_create`.
> Then read `.ai/module-summaries/planning-production.md` for business rules.
> Then open only `mom/api/controllers/OrderController.php` and the relevant service.

**Add a database field:**
> Read `.ai/db-map.json` to find which migration defines `work_orders`.
> Read `.ai/contracts-map.json` to find the contract `planning_production--work-orders`.
> Then edit: the next migration file + the contract + the relevant controller/service.

**Trace a data flow:**
> Read `.ai/route-map.json` to find the endpoint.
> Read `symbols.json` to find which services are involved.
> Open those services sequentially, tracing the call chain.

---

## Regenerating this index

```bash
php tools/scripts/ai-index/generate.php --verbose
```

Or via Composer:
```bash
composer --working-dir=mom run ai:index
```

**JSON files:** fully regenerated on every run (safe to re-run anytime).
**Module summaries:** created once as stubs, never overwritten — edit them freely.

---

## File sizes (approximate after first generation)

| File | Typical size |
|------|-------------|
| `repo-map.json` | ~5 KB |
| `route-map.json` | ~80 KB |
| `db-map.json` | ~200 KB |
| `symbols.json` | ~60 KB |
| `contracts-map.json` | ~100 KB |
| `module-summaries/*.md` | ~2 KB each |

Reading `repo-map.json` + one `module-summaries/*.md` + relevant section of `route-map.json`
costs roughly **3,000–8,000 tokens** instead of scanning hundreds of source files.

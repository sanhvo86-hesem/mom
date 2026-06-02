# MDA Deprecation And Archive Plan

Decision scope: pre-production runtime-closure candidate.

| File or surface | Action | Reason |
|---|---|---|
| `MasterDataService::create/update/delete/changeStatus/approvePendingChange` | REWRITE | Governed mutation now returns `domain_command_required`. Keep read/list/detail projection. |
| `PostgresMasterDataRepository` delete-all projection rewrites | DELETE | Full-list rewrites are not allowed for governed authority/history/pending/archive paths. |
| JSON order/MES runtime bridge in PG_ONLY mode | ARCHIVE | JSON may remain compatibility bridge only; PG_ONLY reads PostgreSQL authority or fails closed. |
| `mom/scripts/portal/13-master-data-control.js` mutation workflow | MERGE | Workspace remains read-only projection and requires command reanchor for changes. |
| `mom/data/registry/status-options.json` duplicates | ARCHIVE | Keep as generated/projection input until workflow-status-authority generator supersedes it. |
| Historical MDA reports | KEEP | Do not delete history; add this closure report as a newer evidence set. |

Deletion or migration of legacy routes should happen only after callers are inventoried and command replacements are wired.

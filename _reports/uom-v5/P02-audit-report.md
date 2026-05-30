# P02 Audit Report

Branch: codex/uom-v5-no-guess-20260530
SHA at start: 247b1fbeabfe8bd07feb3d2265a8c2ec0ec625a4

## Audit

- REPO_EVIDENCE: Inventory includes contracts, migrations, services, controller, route, OpenAPI, UI scripts, tests, and prior reports.
- REPO_EVIDENCE: Suggested prompt greps were performed over rule version and lifecycle terms.
- REPO_EVIDENCE: `.ai/db-map/index.json` was used to find table domains; UoM tables are currently `unclassified`.
- REPO_EVIDENCE: P02 changed only `_reports/uom-v5/` report artifacts and the tracked sequential ledger.

## Mandatory Questions

1. Multi-site/supplier/language risk: Existing item policy/alias tables exist, but domain maturity remains partial. P12/P15 own.
2. Factor-only affine/log/contextual risk: Affine/log guards exist; full category matrix absent. P05/P08 own.
3. Naked numbers: MEASVAL exists, but scanner/backlog still needed. P09/P15 own.
4. Canonical/quarantine bypass: Alias unknown quarantine exists, but ambiguity contract is incomplete. P06 owns.
5. AI authority: AI advisory logging exists and comments deny AI approval. P04/P14 still must prove no permission bypass.
6. Permission bridge: First-user bridge and manifest permission gap are confirmed. P04 owns.
7. Schema/service drift: Confirmed P0 `version` vs `rule_version`. P03 owns.
8. Cache stale risk: Confirmed P0 cache key drift. P03/P13 own.
9. Rollback: P02 rollback is report deletion plus ledger restore.
10. Replay evidence: MEASVAL hash service exists; full replay simulation belongs to P09/P14/P16.

## Gate Result

PASS_WITH_WARNINGS. The warnings are precisely the contradictions P02 was required to expose.

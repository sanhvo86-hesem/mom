# MDA Performance Traceability Baseline

- Gate: PASS
- Dataset: 2870 nodes / 7200 edges
- Generated at: 2026-06-02T01:35:55+00:00

| Query | P50 ms | P95 ms | P99 ms |
|---|---:|---:|---:|
| adjacency_lookup | 0 | 0.0001 | 0.0028 |
| trace_export_page_500 | 0.0274 | 0.0285 | 0.0394 |

| Check | Result |
|---|---:|
| synthetic_dataset_seeded | PASS |
| cursor_export_uses_continuation_or_complete | PASS |
| inventory_service_mentions_wip_ledger | PASS |
| inventory_service_mentions_genealogy_or_recall | PASS |
| quality_hold_service_uses_subject_graph | PASS |
| command_gateway_uses_idempotency | PASS |
| migration_index_for_reauth_or_sod | PASS |

Known limits:
- No live PostgreSQL seed was started by this local gate; production-like P95/P99 still requires the validation package dataset.
- Synthetic trace graph proves cursor semantics and local algorithm cost only.

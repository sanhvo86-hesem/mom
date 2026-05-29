# P15 Main

## Source-truth audit

| claim_id | claim | source_tag | exact_source_path_or_url | confidence | risk_if_wrong | verification_action | status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| P15-CLAIM-001 | repo already defines JSON_ONLY, SHADOW_WRITE, POSTGRES_PRIMARY, and POSTGRES_ONLY modes. | REPO_EVIDENCE | `docs/backend/POSTGRES_MIGRATION_AND_SYNC_SPEC.md`; `.ai/repo-map.json` | High | migration mode semantics may drift | keep cutover bound to these four modes | verified |
| P15-CLAIM-002 | current code still uses partial JSON paths and fallback behavior in runtime. | REPO_EVIDENCE | `docs/backend/POSTGRES_MIGRATION_AND_SYNC_SPEC.md`; `mom/database/DataLayer.php`; `mom/database/RuntimeShadowSync.php` | High | silent authority split | require reconciliation and fallback telemetry | verified |
| P15-CLAIM-003 | drift tool baseline exists but needs broader enforcement. | REPO_EVIDENCE | `mom/tools/audit_runtime_authority_consistency.php`; `docs/backend/POSTGRES_MIGRATION_AND_SYNC_SPEC.md` | High | false cutover confidence | expand blocker conditions | verified |
| P15-CLAIM-004 | previous prompts define the missing collection crosswalk and release-package dependencies. | REPO_EVIDENCE | `_reports/.../MDA_COLLECTION_CROSSWALK.csv`; `_reports/.../MDA_COMMAND_CATALOG.csv` | High | migration may omit governed collections | carry crosswalk and command coverage into cutover | verified |
| P15-CLAIM-005 | NIST governance still supports rehearsed recovery and defined ownership for cutover decisions. | CURRENT_OFFICIAL_REFERENCE | [NIST CSF](https://www.nist.gov/cyberframework) | Medium | rollback ownership may be underspecified | keep explicit owner and restore drill gates | verified |

## Authority decisions

1. No domain switches to `POSTGRES_ONLY` until reconciliation, restore drill, and fallback-free stability window pass.
2. Collection crosswalk is authoritative for legacy-to-target mapping and drift reports.
3. Rollback from `POSTGRES_PRIMARY` is allowed only while dual-write evidence and event log continuity remain intact.
4. Archived JSON is evidence/export only after `POSTGRES_ONLY`; APIs may not silently read it.

## Repair pass applied in P15

1. Published `MDA_COLLECTION_CROSSWALK.csv`.
2. Published `MDA_MIGRATION_TEST_PROTOCOL.md`.
3. Explicitly tied fatal drift to missing governed record, unknown status, duplicate key, broken FK, ledger mismatch, or fallback read after stability window.
4. Rebound cutover by domain rather than one global flag flip.

## Decision token

`P15_PASS_WITH_CONTROLLED_GAPS`

# eQMS/MOM Control Plane Closure Register

Updated: 2026-04-14

## Closure Criteria

This register is the backend closure ledger for the current world-class audit wave. A claim is not closed unless there is evidence in source code, migrations, API routes, tests, and operational gates.

| Class | Closure rule | Current disposition |
|---|---|---|
| P0 | Must be remediated in this wave. No waiver accepted. | Closed by fail-closed controls, canonical writers/readers, and CI gate evidence below. |
| P1 | Must be remediated or explicitly waived with owner, review date, and exit condition. | Non-waived P1 count is 0; WORM provider is dependency-waived. |
| P2 | May remain in the roadmap if non-blocking and documented. | Tracked as deferred roadmap. |

## Closed P0 Evidence

| Finding | Closure evidence |
|---|---|
| Controlled-source contamination by browser/test/report/runtime artifacts | P0/P1 spill files are removed from the Git index and filesystem. `php mom/tools/release/check_repo_boundary.php` now exits 0 only when P0/P1 are clean and prints P2 warnings separately. Current gate result: 33 P2 warnings, P0/P1 clean. |
| Runtime services depended on generated `mom/data/registry` as source authority | `table-registry.json` was moved to controlled contract authority at `mom/contracts/table-registry.json`; `RegistryService` and `CanonicalManufacturingSpineService` fallback to the controlled contract without reintroducing `mom/data/registry` P1 artifacts. |
| Boundary scanner was not a promotion gate | `.github/workflows/ci.yml` and `.github/workflows/deploy.yml` run `php mom/tools/release/check_repo_boundary.php` before lint/test/deploy. |
| Legacy document HTML/archive mutation was authoritative | `DocumentController` write actions now return 410 through `LegacyWriteSurfacePolicy`; document write authority must use control-plane commands. |
| Legacy online form JSON/counter mutation was authoritative | `FormController` submit, record-id consumption, draft save, and offline draft upload now return 410 through `LegacyWriteSurfacePolicy`. |
| Legacy evidence vault upload/link mutation was authoritative | `EvidenceController` upload and generic link now return 410 through `LegacyWriteSurfacePolicy`; controlled evidence must finalize through `/api/v1/eqms/evidence/finalize` or command API. |
| Legacy product passport JSON writes were a second genealogy authority | `ProductPassportController` create/add-event now return 410 unconditionally through `LegacyWriteSurfacePolicy`. |
| Post-release order edits were field-list bypassable | `OrderWorkflowService` now requires released change authority for every effective field edit in released/active/running/inspection/in-production/setup/on-hold states. |
| Caller-supplied change authority could be forged | `ControlPlaneCommandService` strips caller authority proof, resolves canonical authority through `ChangeAuthorityService`, and `ControlPlaneCommandGuard` requires service-resolution metadata for final/released field mutation. |
| Change lifecycle was not end-to-end executable | `ChangeLifecycleCommandService` now controls request/order transitions, persists affected/resulting/effectivity/training/verification/effectiveness rows, blocks release until lifecycle gates pass, and requires emergency rollback controls. |
| Genealogy write endpoint could mutate authority directly | `GenealogyGraphService` now requires a released change order covering the exact object, exact field path, and active effectivity before accepting direct edge facts. |
| Genealogy graph projection was not materialized | `GenealogyGraphService` writes `genealogy_nodes`, `genealogy_edges`, and `as_manufactured_snapshots`; `asManufacturedThread()` reads the projected graph/snapshot rather than the flat fact table. |
| 5M was a standalone check rather than a release gate | `ChangeLifecycleCommandService` blocks release when `traceability_5m_obligations` has blocked gates for affected/resulting objects. |
| Runtime authority still reported genealogy as compatibility-only | `RuntimeAuthorityService` merges `GenealogyGraphService::probe()` and reports `canonical_genealogy_graph` when the DB-backed graph is active; the old read model is deprecated read-only. |
| Evidence package builder was not runtime-wired | `EvidenceFinalizationService` invokes `EvidencePackageBuilder` from a live finalization API, persists canonical record/version/artifact/publication rows, and fails unless original artifact, canonical payload, readable snapshot, manifest, and publication state are present. |
| Regulated audit sink had a duplicate JSONL authority in Postgres mode | `DataLayer::logEvent()` no longer writes JSONL when Postgres is active; JSONL remains only a non-Postgres migration fallback. |
| Periodic evaluation had scheduling without closure evidence | `PeriodicEvaluationService::close()` now requires terminal state evidence: digest or audit-pack export for passed/failed, waiver signature for waived, and persists completion linkage. |

## Accepted Waivers

| Waiver | Severity | Owner | Review date | Rationale | Exit condition |
|---|---|---|---|---|---|
| Production WORM/Object Lock provider adapter | P1 | IT/System Admin + QA/QMS | 2026-05-31 | The local repo cannot prove cloud bucket/container immutability without selecting and provisioning a provider. Local content-addressed storage remains a development bridge only. | Implement provider-specific adapter for S3 Object Lock, Azure Immutable Blob, or equivalent; add overwrite/delete refusal tests against provisioned immutable storage. |

## Deferred P2 Roadmap

| Item | Reason it is P2 | Exit condition |
|---|---|---|
| Tracked prompt files and `mom/docs/tmp` design scratch files | Scanner reports them as P2 warnings only; they do not affect deployable runtime authority after P0/P1 cleanup. | Move to an external prompt/archive lane or convert to controlled standards if retained. |
| Full operator dashboard for periodic evaluation | Backend register/API exists; full UI workflow is product-surface work. | Add closure dashboard, escalation worker, and audit-pack linkage UI. |
| Legacy read compatibility cleanup | Write authority is closed; read compatibility can remain during migration. | Replace read models with canonical projections and remove JSON reads after migration sign-off. |
| Durable downloadable audit-pack bundle | Manifest builder and package completeness checks exist; durable bundle storage/retrieval is product-surface depth, not a current authority blocker. | Add `AuditPackExportService`, persisted bundle metadata, retrieval endpoint, and hash-verifiable export artifact. |
| Productized change impact/effectivity explorer | Backend gates and lifecycle rows exist; explorer UX/API depth remains roadmap. | Add impact-matrix query service over affected/resulting/effectivity/conflict/training/read-ack data. |

## Operational Metrics Required

| Metric | Target |
|---|---|
| `repo_boundary_p0_p1_count` | 0 before CI/deploy promotion. |
| `legacy_write_surface_denials_total` | Nonzero attempts investigated; no successful governed legacy writes. |
| `post_release_field_edit_denials_total` | Every denied edit includes object, field path, state, actor, and missing authority. |
| `genealogy_projection_lag_seconds` | Defined by worker once projector scheduling is enabled. |
| `traceability_5m_block_rate` | Visible by operation class and object type. |
| `evidence_finalization_failures_total` | Any missing package component blocks finalization and is reviewable. |
| `publication_dead_letter_count` | Actionable queue, reviewed by QA/QMS and IT. |
| `periodic_evaluation_closure_overdue_count` | 0 overdue terminal closures without owner escalation. |
| `as_manufactured_graph_snapshot_missing_count` | 0 when release requires canonical genealogy. |

## Final Closure Audit Result

Six-agent closure loop result after remediation:

- Platform governance/repo hygiene: P0 = 0, non-waived P1 = 0.
- Document/form/evidence control: P0 = 0, non-waived P1 = 0.
- Change authority/configuration control: P0 = 0, non-waived P1 = 0.
- MES/genealogy/digital thread: P0 = 0, non-waived P1 = 0.
- Regulated records/data integrity: P0 = 0, non-waived P1 = 0.
- Product benchmark: P0 = 0, non-waived P1 = 0; WORM provider remains accepted P1 waiver; durable audit-pack bundle and productized impact/effectivity explorer remain P2 roadmap.

## Non-Authority Legacy Surfaces

The following paths may remain for read/import compatibility only and must not be used as governed write authority:

- `data/evidence/vault.json`, `data/evidence/custody.json`, `data/evidence/links.json`
- `data/online-forms/entries/*.json`, `data/online-forms/drafts/*.json`
- `config/record_counters.json`, `config/form_control_registry.json`
- `data/passports/passports.json`, `data/passports/events.json`
- document HTML/archive version files used by legacy document controller actions

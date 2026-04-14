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
| Controlled-source contamination by browser/test/report/runtime artifacts | P0/P1 spill files are removed from the Git index and filesystem. `php mom/tools/release/check_repo_boundary.php` now exits 0 only when P0/P1 are clean and prints P2 warnings separately. Current gate result: 7 P2 prompt-file warnings, P0/P1 clean. |
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

## 2026-04-14 Closure Wave Re-Audit Remediation Evidence

| Finding closed | Closure evidence |
|---|---|
| Runtime lanes under `mom/data` were still tracked as controlled source | Runtime artifacts for audit logs, online form entries/drafts, rate-limit files, dispatch/ERP/MES/order/passport/upload records, schema-studio workspaces, and backup/cache JSON were removed from the Git index with `git rm --cached`; `.gitignore` keeps them local-only. `RepoBoundaryScanner` now classifies those lanes as P1 if they re-enter tracked source. |
| Release discipline was template-only | `ReleaseGovernanceBuilder` and `mom/tools/release/build_release_governance.php` now generate deterministic release manifests, promotion receipts, and reverse-sync intake payloads without writing transient artifacts into controlled source. |
| Finalization carried signature metadata only in manifests | `EvidenceFinalizationService` now persists supplied `signature_events` against the locked `evidence_version`, using manifest/package hashes as the signed payload binding when caller-supplied hashes are absent. |
| Legacy evidence reads looked authoritative | `CanonicalEvidenceReadService` and `GET /api/v1/eqms/evidence/package` expose canonical evidence record/version/artifact/signature/publication packages. Legacy `EvidenceController` read/search/verify responses now return `read_authority=legacy_compatibility_read_only` with canonical paths. |
| Change request/order lifecycle diverged from the canonical state machine | `ChangeLifecycleCommandService` now uses `draft -> submitted -> triage -> approved_for_order` for CR and `draft -> impact_assessment -> in_review -> approved -> released -> implemented -> closed` for CO. Migration `114_world_class_closure_lifecycle_constraints.sql` aligns DB checks and maps old CR statuses. |
| Resulting objects could be orphaned from affected objects | Resulting object persistence now resolves and stores `affected_object_id`; ambiguous/missing affected scope fails the command instead of creating a floating resulting object. |
| WIP disposition, rollback, and emergency controls were schema-only in command paths | Change-order creation now persists `wip_dispositions`, `rollback_requirements`, and `emergency_change_controls`; release readiness consumes rollback/emergency rows as canonical sources. |
| Genealogy unsupported node types silently became evidence records | `GenealogyGraphService` now validates node ontology before writes/projection and throws `unsupported_genealogy_node_type` for unknown types. |
| Order workflow/status authority still allowed stale status sets | `WorkflowStatusAuthorityService` and `mom/tools/release/check_workflow_status_authority.php` now fail promotion when SO/JO/WO workflow tables reference legacy status sets. `table-registry.json` now uses `sales_order_status_runtime`, `job_order_status_runtime`, and `work_order_status_runtime` for SO, JO, `work_orders`, and singular MES `work_order`; migrations `115`-`120` map legacy aliases and add SO/JO/WO constraints. |

Verification evidence:

- `php -l` passed for changed control-plane, evidence, change-control, genealogy, route, controller, tool, and test files.
- `APP_ENV=test DB_PASSWORD=test_password vendor/bin/phpunit --filter 'WorldClassControlPlaneExecution|OrderWorkflowEngineeringReadiness|OrderServiceEngineeringGate|SecurityHardeningRegression' --testdox`: 44 tests, 224 assertions, passed.
- `php mom/tools/release/check_repo_boundary.php`: P0/P1 clean, 7 P2 prompt-file warnings.
- `php mom/tools/release/build_release_governance.php --artifact=manifest --change-authority=CO-WORLDCLASS-CLOSURE`: emitted a valid release manifest hash.
- `php mom/tools/release/check_workflow_status_authority.php`: workflow status authority clean.
- `./composer analyse -- --memory-limit=1G`: PHPStan completed with no errors.
- `./composer test`: 436 tests, 2442 assertions, 1 skipped, passed on the current `codex/worldclass-closure-20260414-1512` closure branch after Agent 2/3/5 P1 remediation.
- `./composer check`: PHPStan plus PHPUnit completed with no errors; 436 tests, 2442 assertions, 1 skipped on the current closure branch.

## 2026-04-14 15:12 Agent 2 P1 Closure Addendum

| Finding closed | Closure evidence |
|---|---|
| Document release/supersede authority was service-level exact but DB CHECK did not allow exact `release`/`supersede`/`withdraw` effects | `mom/database/migrations/125_change_effect_exact_release_semantics.sql` updates `plm_change_affected_objects.requested_effect`; the base control-plane migration uses the same enum; `DocumentRevisionCommandService` no longer lets generic `revise` authorize release or supersede. |
| Final document revision replay proof lacked a mandatory immutable anchor | `DocumentRevisionCommandService` now requires `manifest_hash_sha256` for released/superseded/obsolete/withdrawn revisions and includes it in idempotency equivalence checks; focused tests cover missing manifest and replay conflict. |
| Evidence signature ceremony auto-filled the signer-visible hash | `EvidenceFinalizationService` no longer fills `displayed_record_hash_sha256`; `ElectronicSignatureService` requires it from the ceremony payload and finalization rejects signed payload hashes that are not part of the evidence package. |
| Idempotency proof was incomplete | `WorldClassControlPlaneExecutionTest` now covers replay conflicts for document revision, form issuance, form submission attempt, validation result, evidence record, and evidence version. |
| Schema validation proof did not go through the form command path | Tests now cover missing required fields and type mismatch through `EqmsFormExecutionService` and `FormIssuanceCommandService::recordSubmissionAttempt()`. |
| Empty-schema form validation accepted caller hashes without parsed payload | `EqmsFormExecutionService` now requires parsed payload for every submission attempt before it will return a canonical payload hash; focused tests cover empty schema/rules with missing parsed payload. |

## 2026-04-14 15:12 Agent 3 / Agent 5 Blocking P1 Closure Addendum

| Finding closed | Closure evidence |
|---|---|
| E-signature ceremony still accepted caller-supplied re-auth fields without server challenge consumption | `ElectronicSignatureChallengeService` and migration `126_e_signature_auth_challenges.sql` add server-issued, expiring, one-time challenges bound to signer/action/payload/displayed hash; `EvidenceFinalizationService` consumes the challenge before persisting `signature_events`; focused tests cover invalid challenge rejection. |
| E-signature challenge consumption treated missing trusted signer/session/org as wildcard | `EqmsControlPlaneController` overwrites finalization signer/session/org from authenticated request context; `EvidenceFinalizationService` rejects signer mismatch; `ElectronicSignatureService` passes only trusted principal/session/org context into `ElectronicSignatureChallengeService`; SQL now requires matching non-null params when a challenge row is bound; focused tests cover valid bound consumption, missing trusted session rejection, and authenticated signer mismatch. |
| Final evidence package was not content-bound to accepted source submission attempt | `EvidenceFinalizationService` now compares final package canonical payload hash and original artifact hash against the latest accepted submission validation row; focused tests cover canonical payload mismatch and original artifact mismatch. |
| Audit pack org-scope assertion could false-fail because summarization dropped `org_id` | `AuditPackExporter` preserves `org_id` in evidence package and audit timeline summaries; `AuditPackExportService` test proves org-scoped package/event rows remain visible after manifest assembly. |
| VPS deployment authority accepted wildcard objects, empty fields, missing effectivity, and broad effects | `VpsService` requires release manifest hash, exact manifest object, exact target environment, exact release manifest ref/hash in effectivity scope, exact action plus promotion intent fields, and exact deployment requested effect; focused regression tests cover wildcard/empty/wrong/missing cases. |
| Shared post-release change authority allowed wildcard object/field/effectivity and substitute effects | `ChangeAuthorityService` strict controlled-lifecycle mode uses canonical `plm_change_affected_objects` plus `plm_change_effectivities`, skips legacy broad authorization, requires exact object/effect/field, and rejects empty effectivity; focused tests cover wildcard object, empty fields, broad effect, missing effectivity row, and empty effectivity scope. |
| MOM/MES execution states were post-release in order workflow but not strict in shared change authority | `ChangeAuthorityService::isControlledLifecycle()` now includes `running`, `inspection`, `setup`, `on_hold`, and `in_production`; `OrderWorkflowRepositoryBoundaryTest` proves a `running` job order rejects broad legacy authority and passes only with exact canonical object/field/effect/effectivity authority. |

Verification evidence for this addendum:

- `APP_ENV=test DB_PASSWORD=test_password vendor/bin/phpunit tests/Unit/Services/WorldClassControlPlaneExecutionTest.php --testdox`: 69 tests, 334 assertions, passed.
- `APP_ENV=test DB_PASSWORD=test_password vendor/bin/phpunit tests/Unit/Services/ChangeAuthorityServiceTest.php --testdox`: 8 tests, 28 assertions, passed.
- `./composer analyse -- --memory-limit=1G`: PHPStan completed with no errors over 223 files.
- `./composer test`: 436 tests, 2442 assertions, 1 skipped, passed.
- `./composer check`: PHPStan plus PHPUnit completed with no errors; 436 tests, 2442 assertions, 1 skipped.

## 2026-04-14 10:02 Closure Re-Audit Cycle

Branch: `codex/worldclass-closure-20260414-1002`

Six-agent re-audit result before remediation:

| Agent scope | P0 | P1 | P2 / residual |
|---|---:|---:|---|
| Platform governance / repo hygiene | 0 | 0 | Ignored tmp/prompt/package-boundary hygiene and promotion archive productization. |
| Document / form / evidence control | 0 | 4 | Canonical document writer, canonical form issuance/submission writer, runtime template/schema split proof, and retention binding were not yet evidenced. |
| Change authority / configuration control | 0 | 0 | Field-authority token one-shot consumption remains P2 unless used as a security token. |
| MES / genealogy / digital thread | 0 | 0 | Productized explorer and broader graph ontology round-trip tests remain P2. |
| Regulated records / data integrity | 0 | 0 | Legacy report provenance, route-level evidence-package test, and provider-backed WORM remain P2/waiver. |
| Product capability benchmark | 0 | 0 | Cockpit/explorer surfaces remain P2 product roadmap. |

Remediation implemented on the branch:

| Finding closed | Closure evidence |
|---|---|
| Document control had schema but no canonical writer proof | `DocumentRevisionCommandService` writes `doc_families`, `doc_revisions`, `doc_effectivities`, and `doc_distributions`; `/api/v1/eqms/documents/revisions` exposes the governed route; `WorldClassControlPlaneExecutionTest::testDocumentRevisionCommandServicePersistsCanonicalDocumentControlRows` proves no legacy `docs_custom.json` write authority is used. |
| Form issuance/submission had schema but no canonical writer proof | `FormIssuanceCommandService` writes `frm_issuances` and `frm_submission_attempts`; `/api/v1/eqms/forms/issuances` and `/api/v1/eqms/forms/submission-attempts` expose governed routes; `WorldClassControlPlaneExecutionTest::testFormIssuanceCommandServicePersistsIssuanceAndSubmissionAttemptWithoutLegacySchemas` proves runtime version semantics use `frm_template_revision_id` and `frm_schema_version_id`, not `form_schemas` or `record_counters.json`. |
| Final evidence retention was modeled but not bound to the lifecycle | `RetentionLockService` creates an active `retention_locks` row during `EvidenceFinalizationService::finalize`; `CanonicalEvidenceReadService::package` now returns `retention_locks`; existing evidence finalization/read tests assert the retention lock path. |
| Schema Studio system registry view depended on runtime registry files | `SchemaStudioController` falls back from `data/registry/*.json` to controlled `mom/contracts/*.json`; the portal exposes workspace and read-only `system_contract_registry` views distinctly; `SchemaStudioRegistryFallbackTest` proves contract fallback and relation restoration when runtime registry is missing. |
| Static analysis gate was blocked by redundant enum fallback | `GenericCrudService` now treats registry `statusSet()` option `value` as required contract data instead of silently defaulting to an empty string; PHPStan passes. |

Verification evidence for this cycle:

- `php -l` passed for new document/form/retention services, changed evidence services, EQMS controller, and focused tests.
- `APP_ENV=test DB_PASSWORD=test_password vendor/bin/phpunit --filter WorldClassControlPlaneExecutionTest --testdox`: 28 tests, 162 assertions, passed.
- `APP_ENV=test DB_PASSWORD=test_password vendor/bin/phpunit --filter SchemaStudioRegistryFallbackTest --testdox`: 2 tests, 14 assertions, passed.
- `./composer analyse -- --memory-limit=1G`: PHPStan completed with no errors.

Current closure status after remediation:

- P0 = 0.
- Non-waived P1 = 0.
- Remaining items are accepted waiver or planned P2 roadmap only.

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
| Release package boundary validator | Source boundary gate is P0/P1 clean; package-level archive validation of ignored tmp/prompt/vendor/cache paths remains hardening. | Add a release-pack validator that proves generated release bundles exclude ignored scratch/runtime lanes. |
| Field authority token one-shot consume | Canonical change authority already blocks unauthorized post-release edits; if `eqms_field_change_authorization` is treated as a one-shot token, replay consumption should be explicit. | Add atomic `consumed_at` write and double-use denial test, or document the table as compatibility/reference evidence only. |
| Productized canonical document/form cockpit | Backend writer routes now exist; full operator/auditor UX remains product surface. | Add dashboard/search/version UX over `doc_*` and `frm_*` canonical tables. |

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

## 2026-04-14 21:40 Agent 5 Chain-Proof Closure Addendum

| Late audit finding | Closure evidence |
|---|---|
| Finalization audit event was present but not chain-verifiable under the regulated audit contract. | `EvidenceFinalizationService` now persists/replays `evidence.finalized` with deterministic event id, aggregate advisory lock, aggregate sequence, previous hash, canonical `AuditTrail.canonicalHashRecord.v1` hash, and `metadata.audit_chain.event_hash`. |
| Audit-pack readiness accepted syntactic finalization markers. | `AuditPackExportService` selects `aggregate_sequence`, `event_hash`, and `prev_hash`; `AuditPackExporter` requires finalization event hash, chain hash, sequence, and package-hash match before reporting `ready`. |
| Missing proof-of-completion for chain failure path. | `WorldClassControlPlaneExecutionTest` now covers rejection of a finalization event without chain proof plus the finalization persistence path; latest `composer check` passed with PHPStan clean and 461 PHPUnit tests / 2681 assertions / 1 skipped. |

## 2026-04-14 22:05 Agent 4 Genealogy / 5M Closure Addendum

| Late audit finding | Closure evidence |
|---|---|
| Genealogy fact replay, reverse-cycle checks, recursive cycle checks, node identity, and snapshot hash identity were still globally keyed. | Migration `130_genealogy_scope_identity_and_5m_gate.sql` drops global uniqueness and adds scoped unique indexes for `genealogy_edge_facts`, `genealogy_nodes`, and `as_manufactured_snapshots`; `GenealogyGraphService` now scopes reverse-cycle checks, recursive traversal, replay lookup, fact conflict target, node conflict target, and snapshot conflict target. |
| Shopfloor production could be accepted without authoritative 5M evaluation or waiver. | `ShopfloorExecutionService::buildProductionLog()` now requires `GenealogyGraphService::evaluateAndPersist5M()` for production-relevant reports; any waiver must be server-verified through `signature_events` plus consumed challenge; `appendProductionReportEvent()` rejects production logs without a complete/waived/not-applicable gate. |
| Missing proof-of-completion for shopfloor 5M closure. | `ShopfloorExecutionServiceTest` covers failure without authoritative store, caller-supplied waiver rejection, and success with a persisted authoritative gate; `WorldClassControlPlaneExecutionTest` covers scoped genealogy SQL and migration evidence; latest `composer check` passed with PHPStan clean and 461 PHPUnit tests / 2681 assertions / 1 skipped. |

## 2026-04-14 22:20 Main Sync Boundary Closure Addendum

| Late sync finding | Closure evidence |
|---|---|
| Latest `origin/main` introduced segmented registry artifacts that were valid governed registry outputs but still classified as uncontrolled generated reports by the repo boundary scanner. | `RepoBoundaryScanner` now allows `mom/data/registry/system-contract-runtime-projections.segments/*.json`; `WorldClassControlPlaneExecutionTest` covers the allowed path and `php tools/release/check_repo_boundary.php` reports `repo boundary clean`. |

## 2026-04-14 22:55 Final Authority Closure Addendum

| Late audit finding | Closure evidence |
|---|---|
| Audit-pack export completeness and per-package proof were still under-specified. | `AuditPackExportService` attaches publication and retention records; `AuditPackExporter` requires publication/retention proof and finalization proof for every package hash. |
| Document release authority remained syntactic. | `DocumentRevisionCommandService` validates release signature challenge proof or governed `controlled_import_receipts` rows from migration `131_world_class_closure_authority_proof.sql`. |
| Change release signature, idempotency, training, WIP, and emergency controls were not strict enough. | `ChangeReleaseSignatureValidator`, `ChangeLifecycleCommandService`, and `EffectivityGateService` now require consumed challenge proof, idempotency ledger proof, full release package hash, authoritative training proof, WIP disposition closure, and signed emergency waiver proof. |
| Shopfloor 5M waiver was caller-shaped and DB mirror omitted 5M columns. | `ShopfloorExecutionService` verifies waiver signatures against `signature_events` plus consumed challenge and `ShopfloorExecutionPersistenceService` writes migrated 5M columns. |
| OpenAPI parity was curated. | `api/openapi.yaml` now covers every EQMS control-plane route and tests parse all runtime routes. |

Validation:
- `php tools/release/check_repo_boundary.php`: `repo boundary clean`.
- `php tools/release/check_workflow_status_authority.php`: `workflow status authority clean`.
- `vendor/bin/phpunit tests/Unit/Services/WorldClassControlPlaneExecutionTest.php`: 78 tests, 483 assertions, passed.
- `vendor/bin/phpunit tests/Unit/Services/ShopfloorExecutionServiceTest.php`: 48 tests, 179 assertions, passed.
- `composer check`: PHPStan clean; 461 tests, 2681 assertions, 1 skipped, passed.

Accepted governance waiver:
- Tracked manifest self-binding limitation: a manifest committed in the same Git tree cannot contain its own final commit SHA. External CI/deployment packaging must generate the post-merge promotion manifest and deploy receipt bound to the merge commit.

## 2026-04-14 22:48 Agent 2 Retention Schema Closure Addendum

| Late audit finding | Closure evidence |
|---|---|
| Audit-pack retention attachment was a false closure because `AuditPackExportService` queried `retention_locks.aggregate_type/aggregate_id`, while migration `106_eqms_world_class_control_plane.sql`, `RetentionLockService`, and `CanonicalEvidenceReadService` use canonical `object_type/object_id`. | `AuditPackExportService` now queries `object_type = 'evidence_record'`, `object_id = ANY(...)`, and migration-valid `lock_state = 'active'`; retention grouping uses `object_id`; `AuditPackExporter` no longer accepts impossible lock states; `WorldClassControlPlaneExecutionTest` adds a focused schema-parity test that rejects `aggregate_type/aggregate_id` retention SQL. |

Validation:
- `composer test -- --filter AuditPackExportService`: 3 tests, 18 assertions, passed.
- `composer test -- --filter WorldClassControlPlaneExecutionTest`: 79 tests, 490 assertions, passed.
- `php tools/release/check_repo_boundary.php`: `repo boundary clean`.
- `php tools/release/check_workflow_status_authority.php`: `workflow status authority clean`.
- `composer check`: PHPStan clean; 462 tests, 2688 assertions, 1 skipped, passed.

## Non-Authority Legacy Surfaces

The following paths may remain for read/import compatibility only and must not be used as governed write authority:

- `data/evidence/vault.json`, `data/evidence/custody.json`, `data/evidence/links.json`
- `data/online-forms/entries/*.json`, `data/online-forms/drafts/*.json`
- `config/record_counters.json`, `config/form_control_registry.json`
- `data/passports/passports.json`, `data/passports/events.json`
- document HTML/archive version files used by legacy document controller actions

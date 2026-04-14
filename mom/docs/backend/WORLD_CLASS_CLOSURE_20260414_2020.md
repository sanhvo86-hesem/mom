# World-Class Closure Register - 2026-04-14 20:20

Branch: `codex/worldclass-closure-20260414-2020`
Base branch: `main`
Original base head: `c7c3cdaa0c83`
Synced base head: `7d3500918270`
Sync strategy: `git fetch origin main` then `git merge --ff-only origin/main`
Record state: pre-merge controlled closure register for the branch-level remediation pass.

This register is the governed delivery package for the 20:20 closure branch. It is intentionally source-controlled because it records audit findings, remediations, waivers, validation evidence, and merge gates. It is not a prompt dump or generated scratch report.

## A. Residual Prompt Debt Register

| Debt item | Severity | Disposition | Closure evidence in this branch |
|---|---:|---|---|
| Branch was created from an older `main` while `origin/main` moved | P0 | Closed | Branch was fast-forwarded to `origin/main` head `7d3500918270` before code changes; repo boundary and workflow authority gates passed after sync. |
| Previous closure artifacts did not govern this exact branch | P1 | Closed | Added branch-specific closure register plus manifest, promotion receipt, and reverse-sync intake for `worldclass-closure-20260414-2020`. |
| Evidence finalization could accept a merely `valid` submission attempt | P1 | Closed | `EvidenceFinalizationService` now requires the source submission attempt state to be exactly `accepted`; focused test proves `valid` is rejected. |
| Evidence finalization had no mandatory authoritative audit event | P1 | Closed | Finalization now persists or replays an `audit_events` row of type `evidence.finalized`, fails closed if the authoritative audit store cannot confirm it, and binds it to evidence record/version/package hashes. |
| Retention lock path could silently continue without persisted lock evidence | P1 | Closed | Final evidence finalization now throws `retention_lock_required_for_final_evidence` when no lock row or lock id is persisted. |
| Audit pack export could report ready without finalization audit timeline | P1 | Closed | `AuditPackExporter` now rejects packages with persisted evidence packages but no finalization audit event. |
| Audit pack event query over-included same-type aggregate events | P1 | Closed | `AuditPackExportService` now scopes audit events to the requested aggregate id plus exact evidence package ids/hashes. |
| Final evidence package hash depended on mutable packaging timestamp | P1 | Closed | `EvidencePackageBuilder` now emits a stable `record_content_hash_sha256` over original, canonical, readable, publication, and manifest content while keeping package timestamp metadata separate. |
| Direct released document creation lacked signature ceremony evidence | P1 | Closed | `DocumentRevisionCommandService` now requires release signature evidence or a controlled import receipt for direct released revisions. |
| Read acknowledgement could close a group distribution with one actor | P1 | Closed | Group/role/department/site/plant distributions no longer become complete from a single actor acknowledgement; only individual/user rows complete directly. |
| Change endpoints were auth-only | P1 | Closed for API path | `EqmsControlPlaneController` now gates CR/CO create/transition and as-manufactured query with explicit role policies and passes actor roles to the lifecycle service. |
| Change lifecycle lacked transition governance, reason, SoD, and released signature checks | P1 | Closed for service/API path | `ChangeLifecycleCommandService` enforces reason, role, segregation-of-duties when roles are supplied, and signature evidence on released transitions. |
| Effectivity conflict detection was passive | P1 | Closed | New `EffectivityConflictService` evaluates overlaps and persists open conflicts with idempotency hash before CO release. |
| Change release side effects were declared but not DB-visible | P1 | Closed to minimum executable standard | New `ChangeReleaseSideEffectService` freezes affected objects, marks resulting objects released, marks effectivities active, and enqueues training gate events. |
| Resulting objects could orphan from affected objects | P1 | Closed | Migration `127_change_resulting_object_scope_and_snapshot_current.sql` backfills and enforces `plm_change_resulting_objects.affected_object_id NOT NULL`. |
| Manufacturing timeline/history accepted caller-supplied org scope | P1 | Closed | `ManufacturingEventController` now rejects caller scope fields and injects authenticated session scope. |
| As-manufactured thread endpoint accepted caller-supplied scope and was auth-only | P1 | Closed | `EqmsControlPlaneController::asManufacturedThread()` now requires traceability read role and injects session org/site/plant/department scope. |
| Genealogy facts used default source ids not bound to fact content | P1 | Closed | `GenealogyGraphService` derives default `source_event_id` from a canonical fact fingerprint and treats conflicting replay as `genealogy_edge_fact_replay_conflict`. |
| Genealogy fact conflict handling could mutate semantic content | P1 | Closed | Fact insert now uses `ON CONFLICT DO NOTHING` plus replay-equivalence assertion instead of semantic update. |
| Multiple current as-manufactured snapshots could exist | P1 | Closed | Migration supersedes duplicates and adds unique partial current-snapshot index; service supersedes previous current snapshots before insert. |
| EQMS control-plane routes lacked OpenAPI coverage | P1 | Closed | `api/openapi.yaml` now documents issuance, submission attempt, finalization, change order, audit pack, and as-manufactured query contracts and error states. |
| Graph publication worker, WORM adapter, daily digest worker, full training task lifecycle, and full as-built closure | P1 | Dependency-waived | External/provider/product rollout dependencies are documented in the accepted waiver register with owner, review date, and exit criteria. |

## B. Branch Creation Details

| Field | Value |
|---|---|
| Default branch | `main` |
| Working branch | `codex/worldclass-closure-20260414-2020` |
| Worktree | `/Users/a10/Documents/mom-worktrees/worldclass-closure-20260414-2020` |
| Creation | `git worktree add -b codex/worldclass-closure-20260414-2020 /Users/a10/Documents/mom-worktrees/worldclass-closure-20260414-2020 main` |
| Required sync | `git fetch origin main`; `git merge --ff-only origin/main` |
| Force push used | No |
| Direct changes on default branch | No |

## C. Six Individual Agent Reports

| Agent | Current-state findings | P0/P1/P2 defects | Benchmark gap | Remediation and proof |
|---|---|---|---|---|
| 1. Platform governance and repo hygiene | Branch was stale versus `origin/main`; previous release evidence did not bind this branch; source boundary gates existed and passed after sync. | P0 stale branch; P1 branch-specific manifest/receipt/reverse-sync missing; P2 prompt hygiene. | NIST SP 800-128-style controlled baselines require known promotion state, not undocumented branch drift. | Fast-forward sync to `origin/main`; add branch manifest/receipt/reverse-sync; rerun boundary and workflow authority checks. |
| 2. Document/form/evidence control | Evidence, document, and distribution models existed but several finality gates were still permissive. | P1 accepted-vs-valid source attempt, missing finalization audit event, retention lock not fail-closed, direct released doc signature gap, group acknowledgement over-completion. | Connected QMS requires document-change-training-evidence linkage with final records controlled by ceremony and durable event evidence. | Hardened finalization, retention, audit event, direct release signature, and read ack semantics; added focused tests. |
| 3. Change authority/configuration control | CR/CO tables existed but release execution was closer to workflow than configuration control. | P1 auth-only endpoints, weak SoD/reason/signature, passive conflict detection, missing side effects, orphan resulting objects. | Windchill-class PLM patterns require affected objects, resulting objects, effectivity, verification, and executed implementation effects. | Added role gates, lifecycle governance, `EffectivityConflictService`, `ChangeReleaseSideEffectService`, and migration 127. |
| 4. MES/MOM/genealogy/digital thread | Event ledger and genealogy primitives existed; endpoint scope and replay semantics were weak. | P1 caller-supplied scope, fact source not content-bound, semantic mutation on replay, multiple current snapshots. | SAP/Siemens-class MOM traceability needs scoped genealogy, dates/times, 5M context, and deterministic as-manufactured records. | Injected session scope, content-bound fact fingerprinting, replay conflict detection, and current snapshot uniqueness. |
| 5. Regulated electronic records/data integrity | Audit and package services existed; fail-closed proof and package/event linkage were incomplete. | P1 no finalization audit event, audit pack timeline false-ready, broad event query, weak stable content hash. | Part 11/ALCOA+/Annex 11 patterns require attributable events, durable auditability, preserved content and meaning, and retrievable packages. | Added finalization audit event, exact audit pack scope, timeline guard, stable record content hash, and tests. |
| 6. Product capability benchmark | Foundations existed but several differentiators were partial or undocumented in API contracts. | P1 OpenAPI coverage gap; P1 publication/WORM/training/full closure remain dependency or roadmap; P2 product UI depth. | SAP DM, Siemens Opcenter, and PLM-class systems expose operational monitors, impact explorers, and audit-ready export surfaces. | Added OpenAPI contracts and waiver/roadmap discipline; retained operational workers as explicit dependency-waived items. |

## D. Merged Brutal Re-Audit

| Issue | Severity | Root cause | Subsystems affected | Benchmark reference | Exact remediation path | Closure evidence required |
|---|---:|---|---|---|---|---|
| Branch drift before remediation | P0 | Feature branch was not based on current `origin/main`. | Repo governance, merge safety. | NIST SP 800-128 controlled baseline discipline. | Fast-forward branch to `origin/main` before edits. | `merge-base --is-ancestor origin/main HEAD`, repo gates clean. |
| Evidence source attempt not acceptance-strict | P1 | Validation state and business acceptance state were conflated. | Form execution, evidence finalization. | Connected QMS evidence acceptance. | Require `frm_submission_attempts.submission_state = accepted`. | Unit test proving `valid` fails. |
| Finalization no audit-event proof | P1 | Evidence persistence and audit trail were not transactionally evidenced. | Evidence, audit, audit pack. | Part 11 and ALCOA+ event attribution. | Persist/replay `evidence.finalized` event or fail closed. | Audit insert/replay test and audit-pack finalization-event guard. |
| Retention not fail-closed | P1 | Local retention row could be absent while finalization succeeded. | Evidence, retention. | Annex 11 record retention and availability. | Require persisted lock id for final evidence. | Unit test proving failure when lock is not persisted. |
| Change authority too close to workflow | P1 | Lifecycle states did not execute release implementation controls. | Change, document, training, effectivity. | PLM affected/resulting/effectivity patterns. | Add transition governance, effectivity conflict persistence, side-effect service. | Focused lifecycle tests and migration 127. |
| Group document ack over-completion | P1 | Distribution audience semantics were not separated from user acknowledgement rows. | Document control, training/read-understand. | Connected QMS training linkage. | Only individual/user audience rows complete on one actor ack. | SQL assertion in document control test. |
| Genealogy replay not deterministic | P1 | Default source id was not fact-content-bound and conflict update mutated facts. | MES, genealogy, audit. | Siemens/SAP genealogy and as-manufactured trail. | Canonical fact fingerprint, conflict as replay conflict, current snapshot uniqueness. | Focused genealogy tests and migration 127. |
| API contracts incomplete | P1 | EQMS control-plane operations were implemented but not externally contract-governed. | API, integrations, test strategy. | Best-in-class platform API clarity. | Add OpenAPI paths, responses, and error codes. | `api/openapi.yaml` updated. |

## E. Benchmark Matrix Vs World-Class Systems

| Benchmark source | Capability bar | Current branch position | Remaining gap |
|---|---|---|---|
| SAP Digital Manufacturing / SAP ME genealogy patterns | Shop-floor events and SFC/material genealogy should preserve component, operation, resource, date/time, and as-built context. | Genealogy facts are content-fingerprinted, scoped, and current snapshots are unique. | Full closure builder and impact explorer remain Wave 5. |
| Siemens Opcenter/MOM traceability patterns | MOM should coordinate work order execution, genealogy, quality execution, traceability, and analytics. | MOM/MES write/query endpoints now enforce scope and role gates for key paths. | MES bridge still needs package-flow conversion and deterministic full graph closure. |
| PTC Windchill-class PLM change | Change must identify affected objects, resulting objects, effectivity, implementation, verification, and effectiveness. | Resulting objects require affected object; release evaluates conflict and executes side effects. | UI/API for effectivity manager and affected/resulting object browser remains roadmap. |
| Connected QMS | Document control, evidence, training, audit packs, and change control must be linked. | Evidence and document release paths are stricter; training outbox event is created on CO release. | Full training task lifecycle and R&U completion gate remains dependency-waived. |
| FDA Part 11 / ALCOA+ | Electronic records require attributable, legible, contemporaneous, original, accurate, complete, consistent, enduring, and available controls. | Final evidence now has original/canonical/readable/manifest/publication state plus audit event and retention lock. | Provider WORM receipt and daily digest worker are dependency-waived. |
| EU Annex 11 | Computerized systems require validated controls, security, audit trails, backup, archival, and change control. | Audit trail and change authority are hardened; release docs capture validation evidence. | Periodic evaluation dashboard/digest automation remains planned. |
| NIST SP 800-128 | Secure configuration management requires controlled baselines, configuration changes, monitoring, and evidence. | Branch sync, manifest, receipt, reverse-sync, and blocking validation are recorded. | P2 prompt-file hygiene and branch deletion evidence remain post-merge tasks. |

External sources refreshed without sending repository content:
- [SAP ME product genealogy guide](https://help.sap.com/http.svc/rc/3305c5014fba4a6895ff6142c1288dba/15.2/en-US/sap_me_products_how_to_guide_en.pdf)
- [Siemens Opcenter MOM overview](https://webinars.sw.siemens.com/en-US/opcenter-for-fine-chemicals/)
- [PTC Windchill quick start guide](https://support.ptc.com/WCMS/files/171531/en/PTC_J7721_Windchill_QSG_EN_r5.pdf)
- [NIST SP 800-128](https://csrc.nist.gov/pubs/sp/800/128/upd1/final)
- [Microsoft Graph large file upload](https://learn.microsoft.com/en-us/graph/sdks/large-file-upload)
- [European Commission EudraLex Volume 4 Annex list](https://health.ec.europa.eu/medicinal-products/eudralex/eudralex-volume-4_en)
- [FDA data integrity guidance PDF](https://www.fda.gov/downloads/drugs/guidances/ucm495891.pdf)

## F. Target-State Architecture

| Bounded context | Authority objects | State machine / rules | Service/API owner |
|---|---|---|---|
| Document Control | `doc_families`, `doc_revisions`, `doc_effectivities`, `doc_distributions`, `doc_read_acknowledgements` | Draft -> review -> released -> superseded/withdrawn; released direct create requires signature/import receipt; group ack cannot complete from one actor. | `DocumentRevisionCommandService`, document APIs. |
| Form and Template Control | `frm_families`, `frm_template_revisions`, `frm_schema_versions`, `frm_issuances`, `frm_submission_attempts` | Template revision and schema version remain separate; offline Excel is carrier only; source submission must be accepted before final evidence. | `EqmsFormExecutionService`, EQMS form APIs. |
| Evidence Control | `evidence_records`, `evidence_versions`, `evidence_artifacts`, `signature_events`, `retention_locks`, `evidence_publications` | Draft/accepted/finalized/amended/superseded; finalization requires canonical package, signature event, retention lock, and finalization audit event. | `EvidenceFinalizationService`, `EvidencePackageBuilder`, evidence APIs. |
| Change Authority | `plm_change_requests`, `plm_change_orders`, affected/resulting/effectivity/training/verification/review tables | CR/CO lifecycle requires role, reason, SoD, signature on release, effectivity conflict evaluation, and release side effects. | `ChangeLifecycleCommandService`, `EffectivityConflictService`, `ChangeReleaseSideEffectService`. |
| Publication and Retention | `evidence_publications`, `publication_attempts`, `publication_receipts`, `immutable_storage_objects`, `retention_locks` | Publication is async and separate from acceptance/finalization; SharePoint is read-only/discovery publication target. | Publication orchestrator and future Graph worker. |
| Genealogy / Manufacturing Traceability | `mes_operational_event_ledger`, `genealogy_edge_facts`, `genealogy_edges`, `as_manufactured_snapshots`, 5M obligation tables | Scope comes from session; facts are content-fingerprinted; current snapshots are unique; replay mismatch fails. | `GenealogyGraphService`, MES controllers. |
| Audit and Integrity | `audit_events`, `integrity_digests`, `integrity_exceptions`, `periodic_evaluations`, `audit_pack_exports` | Append-only audit event store; audit packs must include finalization timeline; daily digest worker remains next wave. | `AuditTrail`, `AuditPackExportService`, `AuditPackExporter`. |

## G. Wave-By-Wave Implementation Backlog

| Wave | Objective | DB migrations | Services/classes | APIs | Workers/jobs | Tests | Acceptance criteria | Metrics | Rollback risks | Closure evidence |
|---|---|---|---|---|---|---|---|---|---|---|
| 0 | Repo hygiene and release discipline | None in this branch | Release scanners only | None | None | Boundary and workflow gates | Branch current with `origin/main`, manifest/receipt/reverse-sync present | Gate pass/fail, stale branch age | Merge blocked if main moved | Manifest, receipt, reverse-sync, gate output |
| 1 | Control-plane foundation | `127_change_resulting_object_scope_and_snapshot_current.sql` | Change/evidence/document/genealogy services hardened | OpenAPI EQMS additions | Training outbox enqueue on CO release | WorldClassControlPlaneExecutionTest | No permissive P1 closure without DB evidence | Finalization failures, CO release conflicts | Schema backfill may fail if orphan data cannot map affected object | Migration, tests, PHPStan |
| 2 | Offline issuance and online finalization | Existing evidence/form migrations retained | `EvidenceFinalizationService`, `EvidencePackageBuilder` | Evidence finalization API | Future package builder worker | Accepted vs valid, retention fail-closed, audit event tests | Final evidence includes original, canonical, readable, manifest, publication state, audit event, retention lock | Finalization fail rate, replay conflicts, retention lock creation | Legacy valid-only attempts must be accepted before finalization | Tests and OpenAPI errors |
| 3 | Change authority, effectivity, training gate | Migration 127 conflict idempotency fields | `ChangeLifecycleCommandService`, `EffectivityConflictService`, `ChangeReleaseSideEffectService` | Change order create/transition API | Training gate outbox | Change lifecycle focused tests | Released CO has role, reason, SoD, signature, no blocking conflict, side effects persisted | CO conflict count, training event lag | Existing orphan resulting objects need cleanup | Migration and tests |
| 4 | Publication, immutable evidence package, audit pack | Existing publication/audit pack schema retained | `AuditPackExportService`, `AuditPackExporter` | Audit pack API | Future Graph, WORM, daily digest jobs | Audit pack finalization event guard | Audit pack is scope-only DB assembled and fails without finalization event | Export duration, missing timeline count | External storage dependency | Tests and waiver register |
| 5 | Genealogy, digital thread, impact explorer | Migration 127 snapshot uniqueness | `GenealogyGraphService` | As-manufactured query API | Future graph closure worker | Genealogy replay/current snapshot tests | Facts are immutable/replay-safe and queries scoped | Replay conflict count, graph closure duration | Legacy duplicate current snapshots must be superseded | Migration and tests |

## H. Path-By-Path Patch Map

| Path | Action | What changed | Required tests |
|---|---|---|---|
| `mom/api/services/WorkflowEngine.php` | Keep | No broad workflow rewrite; change authority is handled in specialized services to preserve MVC/router semantics. | Existing workflow status authority scanner. |
| `mom/api/services/AuditTrail.php` | Keep | No direct change; finalization now writes required `audit_events` through DB in `EvidenceFinalizationService`. | `AuditTrailIntegrityTest`, audit pack tests. |
| `mom/api/services/Evidence/EvidenceFinalizationService.php` | Refactor | Requires accepted source attempt, persisted retention lock, finalization audit event, and record content hash in metadata. | Evidence finalization tests. |
| `mom/api/services/Evidence/EvidencePackageBuilder.php` | Refactor | Adds stable `record_content_hash_sha256` independent from package creation timestamp. | Evidence finalization package assertions. |
| `mom/api/services/Evidence/AuditPackExportService.php` | Refactor | Exact aggregate/package scoped audit event loading. | Audit pack scope tests. |
| `mom/api/services/Evidence/AuditPackExporter.php` | Refactor | Fails ready audit pack when finalization event is missing. | `testAuditPackExporterFailsWithoutFinalizationAuditEvent`. |
| `mom/api/services/DocumentControl/DocumentRevisionCommandService.php` | Refactor | Release signature/import receipt required; group ack no longer completes distribution. | Document release/read ack tests. |
| `mom/api/services/ChangeControl/ChangeLifecycleCommandService.php` | Refactor | Transition governance, release signature, conflict evaluation, release side effects, request hash metadata. | Change lifecycle tests. |
| `mom/api/services/ChangeControl/EffectivityConflictService.php` | Create | Persists effectivity overlap conflicts with idempotency hash. | Change order release path tests. |
| `mom/api/services/ChangeControl/ChangeReleaseSideEffectService.php` | Create | Executes DB-visible affected/resulting/effectivity/training side effects on CO release. | Change order release path tests. |
| `mom/api/services/OrderWorkflowService.php` | Keep | No change; strict post-release authority from earlier branch remains the boundary. | Existing order workflow authority tests. |
| `mom/api/services/Traceability/GenealogyGraphService.php` | Refactor | Session scope support, content-bound source id, replay equivalence, current snapshot uniqueness. | Genealogy focused tests. |
| `mom/api/controllers/EqmsControlPlaneController.php` | Refactor | Role gates for CR/CO and traceability read; session scope injection; OpenAPI alignment. | Controller-level integration tests are next P2. |
| `mom/api/controllers/ManufacturingEventController.php` | Refactor | Rejects caller-supplied scope and injects session scope filters. | Existing controller smoke tests plus future scoped API tests. |
| `mom/api/openapi.yaml` | Refactor | Adds EQMS control-plane contracts and state-aware error codes. | `composer check` and future OpenAPI contract lint. |
| `mom/database/migrations/*` | Create/update | Adds migration 127 and README range update. | Migration review and DB dry-run in deployment. |
| `mom/docs/backend/*` | Create | Adds this closure register. | Boundary scanner. |
| `mom/release/*` | Create | Adds manifest, promotion receipt, reverse-sync intake. | Boundary scanner and branch review. |

## I. Migration Plan

| Migration | Operation | Safety check | Rollback note |
|---|---|---|---|
| `127_change_resulting_object_scope_and_snapshot_current.sql` | Backfill `affected_object_id` on resulting objects from matching CO affected objects. | Abort if unmapped resulting rows remain before `NOT NULL`. | Do not roll back after enforcing traceability unless downstream data is restored from backup. |
| `127_change_resulting_object_scope_and_snapshot_current.sql` | Add `effectivity_conflicts.idempotency_key`, `metadata`, and unique index. | Existing rows receive stable hash over conflict object/scope. | Dropping idempotency loses duplicate detection evidence. |
| `127_change_resulting_object_scope_and_snapshot_current.sql` | Supersede duplicate current snapshots and add unique partial index. | Keeps newest current row by timestamp/id. | Rollback can reintroduce multiple current snapshots and is not recommended after production writes. |

## J. API Contract List

| Endpoint | Request model | Response model | State-aware errors |
|---|---|---|---|
| `POST /api/v1/eqms/forms/issuances` | Template revision, schema version, subject, issuance policy, idempotency key | Issuance id, state, package metadata | `duplicate_issuance`, `template_revision_not_released` |
| `POST /api/v1/eqms/forms/submission-attempts` | Issuance id, original artifact hash, parsed payload, carrier metadata | Attempt id, validation state, canonical hash | `duplicate_submission_attempt`, `schema_validation_failed` |
| `POST /api/v1/eqms/evidence/finalize` | Source attempt, original artifact, canonical payload, readable snapshot, signatures, publication state | Evidence record/version, package hashes, retention lock, audit event | `source_submission_attempt_not_accepted`, `retention_lock_required_for_final_evidence`, `finalization_audit_event_required` |
| `POST /api/v1/eqms/change-orders` | CR ref, affected objects, resulting objects, effectivity, training, verification | CO id, lifecycle state, idempotency metadata | `duplicate_change_order`, `affected_object_required` |
| `POST /api/v1/eqms/change-orders/transition` | CO id, target state, reason, release signature, actor roles | Updated state, readiness, release side effects | `change_order_transition_role_not_authorized`, `effectivity_conflict_open`, `change_order_release_signature_required` |
| `POST /api/v1/eqms/audit-packs` | Scope type/id only | Audit pack manifest and completeness state | `audit_timeline_missing_finalization_event`, `audit_pack_scope_required` |
| `GET /api/v1/eqms/genealogy/as-manufactured` | Subject type/id; session supplies scope | Scoped nodes, edges, current snapshot | `traceability_read_not_authorized`, `caller_scope_not_authoritative` |

## K. Worker/Job List

| Worker/job | Current state | Required next implementation |
|---|---|---|
| `change.release.side_effects` | Synchronous service now persists minimum release side effects. | Move to idempotent background job if release effects become long-running. |
| `training.gate.enqueue` | Outbox event is emitted on CO release. | Build task generator, assignment, read-and-understand completion, effectivity gate evaluation. |
| `publication.sharepoint_graph` | Dependency-waived. | Use Microsoft Graph upload session, verify target hash/etag, persist receipt, retry/dead-letter. |
| `evidence.immutable_package_builder` | Package builder exists in service path. | WORM/Object Lock adapter receipt with retention mode/legal hold. |
| `audit.integrity_digest.daily` | Dependency-waived. | Daily high-watermark digest, exception register, periodic evaluation dashboard feed. |
| `digital_thread.as_manufactured_closure` | Partial. | Deterministic graph closure over job/lot/serial/material/equipment/operator/tool/process/evidence/change/doc links. |

## L. Test Strategy

| Test class/category | Required coverage | Current evidence |
|---|---|---|
| Unit | State machines, duplicate detection, package hash, finalization gates, read ack semantics, effectivity conflict service. | Focused `WorldClassControlPlaneExecutionTest` passes. |
| Integration | Controller role gates, session scope injection, OpenAPI contract behavior. | OpenAPI updated; controller integration remains P2 roadmap. |
| Migration safety | Orphan resulting object cleanup, duplicate current snapshot supersession, idempotency index. | Migration has fail-fast `DO` checks; production dry-run still required. |
| Duplicate upload/replay | Document/form/evidence/genealogy replay equivalence. | Existing replay tests plus genealogy conflict behavior. |
| Amendment/version | Finalized record replacement requires source version/change authority. | Covered by existing evidence control-plane tests from prior closure branch. |
| Policy/field governance | Exact field/effect/effectivity authority. | Existing strict change authority tests pass. |
| Publication retry | Async Graph worker retry/dead-letter. | Dependency-waived. |
| Immutable package | Package content hash and retention lock; WORM receipt pending. | Package/finalization tests; WORM adapter waived. |
| Audit chain verification | Finalization event and audit pack event scope. | New audit event and audit pack tests. |
| Training gate | Training outbox event at CO release. | Service path implemented; lifecycle automation waived. |
| Genealogy linkage | Content-bound fact replay and current snapshot uniqueness. | Genealogy tests and migration. |
| Periodic evaluation | Digest/dashboard scenario. | Deferred roadmap. |

## M. First Remediation Pass Summary

Closed P0: stale branch.

Closed non-waived P1:
- Evidence acceptance state, retention, audit event, and audit pack proof.
- Direct released document signature/import evidence.
- Read acknowledgement audience semantics.
- CR/CO role, reason, SoD, signature, conflict, and side-effect execution.
- Resulting object orphan prevention.
- Manufacturing/event and genealogy scope authority.
- Genealogy replay determinism and current snapshot uniqueness.
- OpenAPI EQMS coverage.

Validation evidence before this register:
- `php tools/release/check_repo_boundary.php`: passed, `repo boundary clean`.
- `php tools/release/check_workflow_status_authority.php`: passed, `workflow status authority clean`.
- Focused PHPUnit: 98 tests, 428 assertions.
- `composer analyse -- --memory-limit=1G`: passed.
- `composer test`: passed, 448 tests, 2504 assertions, 1 skipped.
- `composer check`: passed, PHPStan clean plus 448 tests, 2504 assertions, 1 skipped.

## N. Second Six-Agent Re-Audit

Status before second audit: pending at the time this register was introduced. The second audit must review this exact branch state after code, migration, OpenAPI, release artifacts, and validation evidence are present.

Required second-audit checks:
- No unresolved P0.
- No non-waived P1 without code/test/runbook evidence.
- No false closure on external dependencies.
- Waivers have owner, review date, and exit condition.
- Merge must remain blocked if full validation regresses.

## O. Closure Loop Results

Current closure state before second audit:

| Severity | Count | Disposition |
|---|---:|---|
| P0 | 0 | Closed. |
| Non-waived P1 | 0 | Closed in this branch subject to second audit verification. |
| Waived P1 dependencies | 5 | Recorded in accepted waiver register. |
| P2 roadmap | 5 | Recorded in deferred roadmap register. |

## P. Unresolved Backlog Register

No unresolved P0 or non-waived P1 is accepted in this register. Any second-audit P0/P1 finding must be remediated before merge.

## Q. Accepted Waiver Register

| Waiver | Severity | Owner | Reason | Review date | Exit condition |
|---|---:|---|---|---|---|
| Graph publication worker | P1 | Platform owner + Microsoft 365 admin | Requires tenant app registration, target library policy, and production receipt verification. | 2026-05-14 | Worker persists attempt, receipt, target hash/etag, retry/dead-letter, and does not mutate final evidence. |
| WORM/Object Lock adapter | P1 | Platform owner + infrastructure owner | Provider and retention mode must be selected. | 2026-05-14 | Immutable adapter persists provider receipt and retention/legal-hold evidence. |
| Daily integrity digest worker | P1 | QA/QMS owner + platform owner | Digest scope, scheduler, and retention policy need owner approval. | 2026-05-14 | Worker writes daily digest and exception rows with high-watermark proof. |
| Full training task lifecycle | P1 | QMS owner + training owner | Current branch emits training gate outbox event but does not build assignment/completion lifecycle. | 2026-05-14 | Effectivity gate blocks release/use until assigned read-and-understand tasks complete. |
| Full deterministic as-built closure builder | P1 | MES owner + platform owner | Current branch hardens fact replay and current snapshot uniqueness; full closure is larger Wave 5 product work. | 2026-05-14 | Builder hashes full upstream/downstream closure and proves deterministic replay. |

No P0 waiver is accepted.

## R. Deferred Roadmap Register

| Item | Severity | Owner | Reason | Review date | Exit criteria |
|---|---:|---|---|---|---|
| Productized effectivity manager UI/API | P2 | PLM owner | Backend release checks are present; planning UI is next product increment. | 2026-06-14 | User can view conflicts, planned effectivity, active effectivity, and release blockers. |
| Affected/resulting object browser | P2 | PLM owner | Schema and release semantics exist; browse UX/API remains. | 2026-06-14 | CO package browser shows all object links, revisions, fields, and effectivity windows. |
| Change impact explorer | P2 | Platform + PLM owner | Needs graph query productization. | 2026-06-14 | Impact graph covers documents, forms, evidence, training, materials, lots, jobs, equipment, tools, and operations. |
| Periodic evaluation dashboard | P2 | QMS owner | Register exists in prior architecture; digest worker is prerequisite. | 2026-06-14 | Dashboard shows overdue reviews, exceptions, digest drift, and remediation state. |
| Prompt-file hygiene | P2 | Repo owner | Boundary scanner is clean for P0/P1; prompt hygiene remains source cleanup. | 2026-06-14 | No prompt dumps or non-governed generated reports remain in controlled source. |

## S. PR Title Suggestion

`World-class closure controls for evidence, change authority, genealogy, and audit packs`

## T. PR Body

Summary:
- Fast-forwarded the remediation branch to current `origin/main` before changes.
- Hardened evidence finalization around accepted source attempts, retention lock persistence, finalization audit events, and stable record content hash.
- Hardened document release signature/import evidence and read acknowledgement semantics.
- Added change release governance: role/reason/SoD/signature checks, effectivity conflict persistence, release side effects, and resulting-object integrity migration.
- Hardened manufacturing/genealogy scope authority, content-bound genealogy replay, and current snapshot uniqueness.
- Added EQMS OpenAPI contracts and branch-specific release manifest, promotion receipt, and reverse-sync intake.

Validation:
- `php tools/release/check_repo_boundary.php`
- `php tools/release/check_workflow_status_authority.php`
- `composer analyse -- --memory-limit=1G`
- `composer test`
- `composer check`

Risk:
- Migration 127 enforces resulting-object affected-object integrity and current snapshot uniqueness; production dry-run is required before deployment.
- Graph/WORM/daily digest/full training lifecycle/full as-built closure remain explicit P1 dependency waivers, not closure claims.

Rollback:
- Do not roll back migration 127 after production writes unless restoring from backup, because it protects traceability integrity.
- Service changes are backward-compatible at API path level but intentionally reject previously permissive invalid finalization/release/replay states.

## U. Final Merge Checklist

| Gate | Status |
|---|---|
| Unresolved P0 = 0 | Pending second audit verification. |
| Unresolved non-waived P1 = 0 | Pending second audit verification. |
| Required migrations present | Present: migration 127. |
| Required backend changes present | Present. |
| Required tests green | Passed before register; rerun after register and second audit. |
| Runbooks/operational notes present | Present in this register and release artifacts. |
| Waivers documented | Present. |
| PR summary updated | Draft body prepared above. |
| Merge strategy | Fast-forward preferred; stop if main moved or validation fails. |

## V. Merge Result Summary

Pending. Merge to `main` is prohibited until second audit and post-register validation pass.

## W. Branch Deletion Evidence

Pending. Delete remote and local feature branch only after successful verified merge to `main`.

## X. Final Remediation Plan

If second audit finds P0 or non-waived P1:
1. Patch the same branch.
2. Add/adjust migration, backend, OpenAPI, test, and runbook evidence.
3. Rerun focused tests, boundary gates, PHPStan, full tests, and composer check.
4. Rerun targeted closure audit for the affected agent mandate.
5. Do not merge until the issue is closed or formally waived when external dependency applies.

If only accepted waivers/P2 remain:
1. Commit in an auditable slice.
2. Push branch and open/update draft PR.
3. Mark PR ready only after validation evidence is current.
4. Fast-forward merge to `main`.
5. Verify `main` contains final commits.
6. Delete remote and local branch and record evidence.

## Y. Final Definition Of Done For Strongest-In-Class Positioning

The platform is not strongest-in-class until all of the following are true:
1. Every final evidence package includes original artifact, canonical structured payload, readable snapshot, hash/signature manifest, and publication receipt or publication state record.
2. Finalization fails closed without accepted source attempt when applicable, signature event, retention lock, canonical persistence, and finalization audit event.
3. Any post-release edit is blocked unless a released CO covers exact object, field set, and effectivity.
4. Change authority has affected objects, resulting objects, effectivity, training requirements, verification, effectiveness review, emergency change, and rollback evidence.
5. Training/read-and-understand can act as an effectivity gate, not just a notification.
6. SharePoint remains asynchronous publication/read-only/discovery only; no user direct upload path exists.
7. Immutable/WORM adapter stores provider receipt and legal-hold/retention evidence.
8. Audit packs are DB-assembled, timeline-complete, hash-manifested, and exportable to immutable storage.
9. Genealogy links lot/batch/serial/job/material/equipment/operator/tool/process/evidence/document/change into deterministic as-manufactured closure.
10. CI/deploy/release gates block on source boundary, static analysis, tests, workflow authority, manifest, promotion receipt, and reverse-sync evidence.

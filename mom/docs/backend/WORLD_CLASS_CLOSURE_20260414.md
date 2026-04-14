# World-Class Closure Register - 2026-04-14

Branch: `codex/worldclass-closure-20260414-1212`

This register records the implementation-oriented closure pass for ERP + MOM + MES + EQMS control-plane maturity. It is a governed closure artifact, not a generated agent report.

## Residual Prompt Debt Register

| Debt item | Severity | Disposition | Closure evidence |
| --- | --- | --- | --- |
| Runtime/build/test/report artifacts tracked beside source | P1 | Closed | `RepoBoundaryScanner` now flags `.DS_Store`, `.ai/index.log`, `.vscode`, vendored PHP runtime, local runtime pid/logs, form backups, schema archives, sessions/log archives. Tracked P1 artifacts were removed from source. |
| Release governance is template-only | P1 | Closed for code discipline, operational receipts remain per-release | `ReleaseGovernanceBuilder` test remains the source mechanism; this register records branch-level closure and validation evidence. Actual deploy receipts must be produced per environment promotion. |
| Form submission validation ledger not written by canonical submission command | P1 | Closed | `FormIssuanceCommandService::recordSubmissionAttempt()` writes `submission_validation_results`, `submission_validation_errors`, and `duplicate_detection_fingerprints`. |
| Document read acknowledgement and supersession command surface missing | P1 | Closed | `DocumentRevisionCommandService::acknowledgeRead()` and `supersedeRevision()` plus API routes under `/api/v1/eqms/documents/*`. |
| Evidence finalization retry can update immutable rows after partial success | P1 | Closed | `EvidenceFinalizationService` and `RetentionLockService` use insert-or-select / `DO NOTHING` for immutable package, artifact, signature, publication, and retention rows. |
| Evidence amendment command missing | P1 | Closed | `EvidenceAmendmentService::createAmendment()` creates a draft amendment version without editing the locked source version, guarded by released change authority and field paths. |
| Publication monitor queues actions without state-machine authorization | P1 | Closed | `PublicationMonitorService::queueAction()` validates retry/withdraw/supersede through `PublicationStateService` before enqueueing outbox work. |
| MES event timeline lacks 5M/digital-thread filters | P1 | Closed | Migration `122_digital_thread_event_context_filters.sql`, `ManufacturingEventBackboneService::timelineFilterFields()`, and `PostgresManufacturingEventRepository` include equipment/operator/tool/process/material/routing/setup/inspection/CNC filters. |
| As-manufactured snapshot subjects narrower than runtime ontology | P1 | Closed | `GenealogyGraphService` now validates expanded subject types through `nodeType()` for snapshot and thread reads. |
| Legacy prompt/tmp artifacts remain | P2 | Deferred roadmap | 33 P2 warnings remain: `mom/docs/tmp/*`, root `prompts/*`, `standards/prompts/*`, and `tools/prompts/*`. These are non-blocking but should be moved to a governed knowledge base or removed in a docs hygiene wave. |

## Six-Agent Re-Audit Summary

| Agent | P0 | P1 closed in this pass | P2/deferred |
| --- | ---: | --- | --- |
| Platform governance / repo hygiene | 0 | Removed tracked backups, logs, archives, binaries, agent reports; scanner widened. | Prompt/tmp sprawl. |
| Document/form/evidence control | 0 | Validation ledger, read acknowledgement, supersession, evidence amendment, immutable retry safety. | Durable audit-pack bundle storage remains roadmap. |
| Change/configuration authority | 0 | Evidence amendment requires released change authority with field paths/effectivity. | Change impact browser and one-shot consumed authorization UX. |
| MES/genealogy/digital thread | 0 | 5M event filters and expanded as-manufactured subjects. | Unified graph product browser remains roadmap. |
| Regulated records/data integrity | 0 | No conflict updates on immutable evidence rows; publication remains async. | WORM/Object Lock provider remains adapter roadmap. |
| Product benchmark | 0 | Backend hooks for effectivity, amendment, publication monitor, evidence graph, genealogy filters. | Full cockpit UX and durable export bundles remain P2 roadmap. |

## Benchmark Matrix

| Benchmark pattern | Required platform behavior | Current closure status | Primary reference |
| --- | --- | --- | --- |
| SAP Digital Manufacturing / SAP ME genealogy | Execution and quality events must connect to shop-floor genealogy and as-built context. | Backend event spine now includes 5M/digital-thread filter columns; genealogy graph supports expanded ontology. | <https://help.sap.com/> |
| Siemens lot traceability | Traceability must cover lot/batch, operations, timestamps, exceptions, rework, signatures. | Genealogy edge facts, expanded snapshots, signature events, and evidence package linkage are implemented; UI still roadmap. | <https://www.siemens.com/en-us/technology/lot-traceability/> |
| PTC Windchill change management | Affected/resulting objects and effectivity must control change implementation. | Existing PLM change objects remain authoritative; evidence amendment now checks released change authority. | <https://support.ptc.com/help/windchill/> |
| Connected QMS | Document + change + training/read acknowledgement must be connected. | Document read acknowledgements update canonical distribution state; effectivity/training gates remain in control-plane services. | Internal EQMS control-plane migrations 106/108. |
| Part 11 / ALCOA+ / Annex 11 | Records must preserve content and meaning, include signatures/audit, and prevent uncontrolled final edits. | Final evidence package rows are immutable/retry-safe; finalization requires package artifacts and signature events. | FDA 21 CFR Part 11; WHO data integrity guidance; EU Annex 11. |
| NIST SP 800-128 | Configuration changes must be authorized, tracked, and evaluated. | Change authority checks, effectivity gates, periodic evaluations, release boundary scanner and workflow authority checks are present. | <https://csrc.nist.gov/pubs/sp/800/128/upd1/final> |

## API Surface Added Or Strengthened

| Endpoint | Purpose | State/authority guard |
| --- | --- | --- |
| `POST /api/v1/eqms/documents/read-acknowledgements` | Record read-and-understand acknowledgement. | Auth + CSRF; writes canonical `doc_read_acknowledgements`; closes matching distributions. |
| `POST /api/v1/eqms/documents/revisions/supersede` | Supersede released/approved document revision. | Auth + CSRF; requires `source_change_order_id`; updates revision/distribution state. |
| `POST /api/v1/eqms/evidence/amendments` | Create amendment draft without editing final evidence. | Evidence finalization roles + CSRF; requires released change authority, field paths, effectivity. |
| `POST /api/v1/eqms/publications/actions` | Retry/withdraw/supersede publication asynchronously. | Publication state-machine guard; withdrawal/supersession require released change. |
| `GET /api/v1/eqms/genealogy/as-manufactured` | Retrieve projected graph/snapshot for expanded digital-thread subject types. | Reads canonical graph/snapshot tables. |

## Migration Plan

| Migration | Purpose | Rollback risk |
| --- | --- | --- |
| `122_digital_thread_event_context_filters.sql` | Adds nullable 5M/digital-thread filter columns and indexes to `mes_operational_event_ledger`. | Low schema risk; rollback would drop query acceleration/context columns after verifying no production consumers depend on them. |

## Worker / Job Model

| Worker/job | Status | Contract |
| --- | --- | --- |
| `CanonicalOutboxWorker` | Existing | Dispatches handler-key based jobs from `outbox_events`. |
| `publication.retry`, `publication.withdraw`, `publication.supersede` | Strengthened | Queue only after publication state-machine validation. SharePoint remains read-only publication target. |
| Audit pack export | Existing manifest builder; durable bundle P2 | Must eventually persist retrievable audit-pack bundle and export receipt. |
| Periodic evaluation | Existing | Used to schedule and close evaluation rows with digest/audit-pack evidence. |

## Validation Evidence

Focused validation run in this branch:

- `php -l` on touched services/controllers: passed.
- `APP_ENV=test DB_PASSWORD=test_password vendor/bin/phpunit tests/Unit/Services/WorldClassControlPlaneExecutionTest.php --testdox`: passed, 36 tests / 233 assertions.
- `APP_ENV=test DB_PASSWORD=test_password vendor/bin/phpunit tests/Unit/Services/ManufacturingEventBackboneServiceTest.php tests/Unit/Services/MobileWorkQueueServiceTest.php --testdox`: passed, 18 tests / 92 assertions.
- `APP_ENV=test DB_PASSWORD=test_password vendor/bin/phpunit tests/Unit/Services/GenericCrudServiceEventBusTest.php tests/Unit/Services/CanonicalManufacturingSpineServiceTest.php tests/Unit/Controllers/HealthControllerRuntimeAuthorityTest.php tests/Unit/Services/RuntimeAuthorityServiceTest.php --testdox`: passed, 11 tests / 248 assertions.
- `php tools/release/check_repo_boundary.php`: P0/P1 clean; 33 P2 warnings remain.
- `php tools/release/check_workflow_status_authority.php`: clean.
- `./composer analyse -- --memory-limit=1G`: passed; PHPStan 217 files with no errors.
- `./composer test`: passed; PHPUnit 392 tests / 2261 assertions, 1 skipped.
- `./composer check`: passed; PHPStan 217 files with no errors, PHPUnit 392 tests / 2261 assertions, 1 skipped.

## Accepted Waivers

| Waiver | Severity | Owner | Review date | Exit condition |
| --- | --- | --- | --- | --- |
| Immutable storage remains local adapter plus abstraction, not cloud WORM/Object Lock. | P2 | Platform owner | 2026-07-14 | Configure and validate production WORM/Object Lock adapter with retention/legal-hold proof. |
| Audit pack exporter is manifest-grade, not a durable retrievable bundle. | P2 | QA/QMS + Platform | 2026-07-14 | Persist export bundle, export receipt, hash manifest, and retrieval endpoint. |

## Deferred Roadmap Register

| Roadmap item | Reason for deferral | Exit criteria |
| --- | --- | --- |
| Move P2 prompt/tmp files out of controlled source | Non-blocking hygiene; does not affect runtime P0/P1 closure. | Boundary scanner strict P2 mode clean or documented knowledge-base lane. |
| Change Impact Explorer UI/API depth | Backend change objects exist, but product exploration UX remains future work. | Query API exposes affected/resulting/effectivity/training/verification closure graph. |
| Unified Evidence Graph production browser | Preview graph exists, but production browser/search UX is not complete. | Graph API has pagination, authorization, explainability, and audit export linkage. |
| Durable audit-pack bundle | Current manifest builder proves package completeness but not a persisted export artifact. | Persisted bundle, download/retry receipt, and verification tests. |
| Training-as-a-gate cockpit | Gate logic exists; cockpit UX remains future product slice. | Role-based dashboard shows missing read acknowledgements/training and blocks release/effectivity. |

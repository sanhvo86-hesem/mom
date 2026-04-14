# World-Class Closure Register - 2026-04-14 15:12

Branch: `codex/worldclass-closure-20260414-1512`
Base branch: `main`
Base head: `946880c6`

## Residual Prompt Debt Register

| Debt item | Severity | Disposition | Closure evidence in this branch |
|---|---:|---|---|
| Controlled source contains generated registry and tranche13 agent reports | P1 | Closed | `mom/data/registry/*` and tranche13 generated reports removed from Git; `.gitignore` no longer unignores runtime registry projections; boundary scanner is required before merge. |
| Evidence finalization can report finalized without canonical persistence | P0 | Closed | `EvidenceFinalizationService` now throws `authoritative_evidence_store_required` when no DB-backed canonical store is available. |
| Final evidence package can be finalized without signature events | P1 | Closed | `EvidenceFinalizationService` now throws `evidence_signature_event_required` unless the package manifest carries at least one signature event. |
| Finalization does not verify source submission attempt if provided | P1 | Closed | `EvidenceFinalizationService` checks `frm_submission_attempts` and latest validation result before persistence when a source attempt is supplied. |
| Released document lifecycle changes only require a UUID-shaped change order | P0 | Closed | `DocumentRevisionCommandService` now requires a released `plm_change_order` with exact affected object, field, effect, and effectivity scope. |
| Periodic evaluation schedule endpoint lacks write governance | P1 | Closed | `schedulePeriodicEvaluation()` now requires controlled QMS/admin role and CSRF. |
| Genealogy/5M writes are under-authorized | P1 | Closed | `recordGenealogyFact()` and `evaluate5MGate()` now require controlled write roles and CSRF. |
| 5M gate can be weakened by caller-provided booleans | P1 | Closed | `GenealogyGraphService` ignores caller `*_required=false` unless supplied by an explicitly governed policy source. |
| Shopfloor manual report events do not promote 5M context into first-class timeline columns | P1 | Closed | `ShopfloorExecutionService::appendProductionReportEvent()` passes equipment, operator, tool, process, material, routing, setup sheet, inspection plan, NC/CNC program fields. |
| VPS deploy actions are whitelisted but not release/change governed | P1 | Closed | `VpsService` blocks deployment actions unless enabled by env and supplied release manifest, change authority, promotion intent, and confirmation phrase. |
| CI/deploy gates are advisory | P1 | Closed | CI no longer tolerates PHPStan/OpenAPI failures; deploy workflow runs boundary, static analysis, tests, composer check, workflow authority check, and governed promotion input checks. |
| SharePoint readme implies direct filled-form/evidence storage and department edit folders | P1 | Closed | SharePoint template now states portal-first, read-only publication/discovery only, no user uploads. |
| Audit chain concurrency can fork on same aggregate | P1 | Partially closed | `AuditTrail` now uses PostgreSQL advisory locks around aggregate hash-chain append. Aggregate sequence column remains P2 hardening because partition-compatible migration design needs DB validation. |
| Graph publication worker, WORM adapter, full audit pack DB export, daily digest worker | P1 | Deferred | These need environment credentials/storage adapter selection. Recorded below as dependency-blocked with exit criteria. |

## Six-Agent Re-Audit Merge

| Agent | Highest severity | Hard finding merged into work |
|---|---:|---|
| Platform governance and repo hygiene | P1 | Generated runtime registry/report artifacts were tracked; CI/deploy release gates were advisory. |
| Document/form/evidence control | P1/P0 via change agent | Document release/supersession needed exact released authority; evidence finalization needed fail-closed DB persistence and signature requirement. |
| Change authority/configuration control | P0 | Released document changes accepted UUID presence rather than exact affected-object/effectivity authority. |
| MES/MOM/genealogy | P1 | 5M context was schema-ready but not consistently written or policy-authoritative. |
| Regulated electronic records/data integrity | P0 | Finalization could claim `finalized` without canonical persistence. |
| World-class product benchmark | P1 | Differentiators exist as foundations, but publication/WORM/audit-pack/graph need operational workers and productized APIs. |

## Benchmark Matrix

| Benchmark source | Capability bar | Repo position after this branch |
|---|---|---|
| SAP Digital Manufacturing / SAP ME genealogy management | As-built/genealogy tracking must link production execution, component use, and controlled records. | Canonical event/genealogy schemas exist; this branch promotes 5M context from shopfloor manual report events. |
| Siemens/ISA-95 manufacturing digital thread patterns | Enterprise-to-control separation with personnel, materials, equipment, methods, measurements, and dates/times. | No machine control is added; 5M gate and event filters are hardened for MOM/MES traceability. |
| PLM change/effectivity patterns | Released changes must cover affected object, resulting object, effectivity, and implementation verification. | Document lifecycle mutation now requires exact released affected-object authority. Remaining P2 is richer effectivity manager UI/API. |
| NIST SP 800-128 configuration management | Controlled baselines must exclude generated/runtime artifacts and require promotion evidence. | Generated artifacts removed; release manifest/receipt/reverse-sync added for branch-level promotion discipline. |
| Regulated e-record integrity | Final record must be canonical, immutable, signed, retrievable, and audit-exportable. | Finalization now fails closed without canonical persistence and signature event. Full WORM/audit-pack worker remains dependency-blocked. |

Primary benchmark URLs used during audit refresh:
- https://help.sap.com/docs/PRODUCT_ID/e1adc70af32241619335c8768a892edb/8a847c85f19e45b6b289ca79a81443a1.html
- https://www.isa.org/standards-and-publications/isa-standards/isa-standards-committees/isa95
- https://csrc.nist.gov/pubs/sp/800/128/upd1/final
- https://learn.microsoft.com/graph/api/driveitem-createuploadsession

## Target-State Architecture

| Bounded context | Authority objects | Service/API direction |
|---|---|---|
| Document Control | `doc_families`, `doc_revisions`, `doc_effectivities`, `doc_distributions`, `doc_read_acknowledgements` | `DocumentRevisionCommandService` is canonical; file documents are carriers. |
| Form and Template Control | `frm_families`, `frm_template_revisions`, `frm_schema_versions`, `frm_issuances`, `frm_submission_attempts` | Issuance and submissions are ledgers; Excel is only a capture carrier. |
| Evidence Control | `evidence_records`, `evidence_versions`, `evidence_artifacts`, `signature_events`, `evidence_publications` | Finalization must persist canonical rows and lock versions. |
| Change Authority | `plm_change_requests`, `plm_change_orders`, affected/resulting/effectivity/training/verification/review tables | Post-release edits must fail without exact released authority. |
| Publication and Retention | `evidence_publications`, `publication_attempts`, `publication_receipts`, `immutable_storage_objects`, `retention_locks` | SharePoint is async read-only publication, not input UI. |
| Genealogy/Digital Thread | `mes_operational_event_ledger`, `genealogy_edge_facts`, `genealogy_nodes`, `genealogy_edges`, `as_manufactured_snapshots`, `traceability_5m_obligations` | 5M context is first-class, not payload-only. |
| Audit and Integrity | `audit_events`, `integrity_digests`, `integrity_exceptions`, `periodic_evaluations`, `audit_pack_exports` | Audit chain is advisory-locked; digest/export workers remain next operational wave. |

## Implementation Backlog By Wave

| Wave | Objective | Closure in this branch | Remaining implementation |
|---|---|---|---|
| 0 | Repo hygiene and release discipline | Generated P1 artifacts removed; CI/deploy hardened; release artifacts added. | P2 prompt-file hygiene. |
| 1 | Control-plane foundation | Evidence/document/change/genealogy gates hardened. | Partition-safe audit sequence migration. |
| 2 | Offline issuance and online finalization | Finalization fail-closed, signature required, source attempt verified. | Full JSON schema canonical validation for all form schemas. |
| 3 | Change authority, effectivity, training gate | Exact document lifecycle authority check added; 5M policy cannot be caller-weakened. | Productized effectivity manager and training task lifecycle. |
| 4 | Publication, immutable package, audit pack | SharePoint boundary documentation corrected; deploy governance added. | Graph worker, WORM adapter, authoritative audit-pack DB export, daily digest worker. |
| 5 | Genealogy, digital thread, impact explorer | Shopfloor event 5M promotion added; genealogy write endpoints gated. | Deterministic full as-built graph closure and impact explorer product API. |

## API Contract List

| API area | Required contract behavior |
|---|---|
| Document release/supersede | Request must include `source_change_order_id`; response must include authoritative doc revision/effectivity/distribution rows; errors include `released_document_change_authority_required`. |
| Evidence finalization | Request must include original, canonical payload, readable snapshot, publication state, signature event; response only returns `finalized` after canonical rows persist. |
| Canonical evidence retrieve | Request is evidence ref plus org context; response is assembled from canonical DB rows, not caller payload. |
| Genealogy fact write | Requires CSRF and controlled role; request must include edge fact endpoints and released change authority where service requires it. |
| 5M gate | Caller context is evaluated against policy-authoritative required dimensions; caller cannot set required dimensions false by itself. |
| VPS deploy action | Requires env enablement, release manifest ref, change authority ref, promotion intent, and exact confirmation phrase. |
| Publication monitor | Must remain async; SharePoint failures return publication state/receipt/error, not evidence mutation. |
| Audit pack export | Future endpoint must accept scope only and assemble from DB; no caller-supplied evidence package arrays. |

## Worker/Job List

| Worker | State |
|---|---|
| `publication.sharepoint_graph` | Dependency-blocked on production Graph credentials and receipt verification policy. |
| `evidence.immutable_package_builder` | Package builder exists; WORM adapter integration remains dependency-blocked. |
| `audit.integrity_digest.daily` | Deferred P1 dependency; requires DB scheduler and retention of high-watermark proof. |
| `audit_pack.export` | Deferred P1 dependency; must assemble package from DB and immutable artifacts. |
| `digital_thread.project_genealogy` | Deferred P2; projection service should converge legacy traceability and canonical genealogy graph. |

## Validation Evidence

- `php -l` on touched PHP files: passed.
- Focused PHPUnit for security/mobile/control-plane services: passed, `78 tests`, `594 assertions`.
- `php tools/release/check_repo_boundary.php`: P0/P1 clean, 7 P2 prompt-file warnings remain.
- `php tools/release/check_workflow_status_authority.php`: clean.
- `./composer analyse -- --memory-limit=1G`: passed.
- `./composer test`: passed, `407 tests`, `2356 assertions`, `1 skipped`.
- `./composer check`: passed, `407 tests`, `2356 assertions`, `1 skipped`.

## Dependency-Blocked Register

| Item | Owner | Reason | Review date | Exit criteria |
|---|---|---|---|---|
| Graph publication worker | Platform owner + IT admin | Needs tenant app registration, library IDs, retention metadata policy. | 2026-05-14 | Worker persists attempt, receipt, target hash verification, retry/dead-letter. |
| WORM/Object Lock adapter | Platform owner + infrastructure owner | Storage provider and retention mode must be selected. | 2026-05-14 | Adapter persists provider immutability receipt in `immutable_storage_objects`. |
| Daily integrity digest worker | QA/QMS + platform owner | Needs scheduling/retention policy and digest scope approval. | 2026-05-14 | Daily worker produces `integrity_digests` and opens exceptions on mismatch. |
| Authoritative audit-pack export bundle | QA/QMS + platform owner | Needs approved export scope and storage destination. | 2026-05-14 | API accepts scope only, assembles from DB, persists export hash/manifest. |

## Accepted Waivers

No P0 waiver is accepted.

Temporary P1 dependency waivers are limited to the four dependency-blocked items above and expire on the listed review date. They are not claims of strongest-in-class completion.

## Definition Of Done For Strongest-In-Class Positioning

Strongest-in-class remains incomplete until:
1. Boundary scanner returns P0/P1 clean on main.
2. All finalization paths fail closed without canonical persistence and signature event.
3. All post-release object changes verify released change authority by exact object, field set, and effectivity.
4. Publication worker produces verifiable SharePoint receipts without allowing direct user upload.
5. WORM/Object Lock adapter receipts are stored for retained records.
6. Audit packs are DB-assembled and immutable-exported.
7. Genealogy/as-built snapshots are deterministic full graph closures.
8. CI/deploy gates are blocking and backed by release manifest, promotion receipt, and reverse-sync intake.

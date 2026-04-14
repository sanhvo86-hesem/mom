# World-Class Closure Register - 2026-04-14 15:12

Branch: `codex/worldclass-closure-20260414-1512`
Base branch: `main`
Base head after rebase: `6e82963a`
Validated remediation head: `55a09426`

## Residual Prompt Debt Register

| Debt item | Severity | Disposition | Closure evidence in this branch |
|---|---:|---|---|
| Controlled source contains generated registry and tranche13 agent reports | P1 | Closed | `mom/data/registry/*` and tranche13 generated reports removed from Git; `.gitignore` no longer unignores runtime registry projections; boundary scanner is required before merge. |
| Evidence finalization can report finalized without canonical persistence | P0 | Closed | `EvidenceFinalizationService` now throws `authoritative_evidence_store_required` when no DB-backed canonical store is available. |
| Final evidence package can be finalized without signature events | P1 | Closed | `EvidenceFinalizationService` now throws `evidence_signature_event_required` unless the package manifest carries at least one signature event. |
| Form upload validation is hash/metadata-oriented rather than server-authoritative | P1 | Closed | `EqmsFormExecutionService` now computes canonical payload hash from parsed payload, validates required/type rules from issued schema, and rejects caller hash mismatch. |
| Finalization does not verify source submission attempt if provided | P1 | Closed | `EvidenceFinalizationService` checks `frm_submission_attempts` and latest validation result before persistence when a source attempt is supplied, and requires a source attempt for form/offline-derived evidence. |
| Finalized evidence record can receive a new package without amendment authority | P1 | Closed | Existing finalized evidence records now require source version and released change authority before a new version can be finalized. |
| Released document lifecycle changes only require a UUID-shaped change order | P0 | Closed | `DocumentRevisionCommandService` now requires a released `plm_change_order` with exact affected object, field, effect, and canonical `plm_change_effectivities` scope. |
| Periodic evaluation schedule endpoint lacks write governance | P1 | Closed | `schedulePeriodicEvaluation()` now requires controlled QMS/admin role and CSRF. |
| Genealogy/5M writes are under-authorized | P1 | Closed | `recordGenealogyFact()` and `evaluate5MGate()` now require controlled write roles and CSRF. |
| 5M gate can be weakened by caller-provided booleans or spoofed policy source | P1 | Closed | `GenealogyGraphService` now loads 5M policy from persisted `traceability_5m_policy_rules`; caller-supplied policy source is ignored. |
| Shopfloor manual report events do not promote 5M context into first-class timeline columns | P1 | Closed | `ShopfloorExecutionService::appendProductionReportEvent()` passes equipment, operator, tool, process, material, routing, setup sheet, inspection plan, NC/CNC program fields. |
| VPS deploy actions are whitelisted but not release/change governed | P1 | Closed | `VpsService` now requires DB-backed released deployment change authority covering manifest/environment/action, in addition to env enablement, manifest ref, promotion intent, and confirmation phrase. |
| Emergency change risk acceptance can be a boolean | P1 | Closed | Emergency release now requires a durable signature event or approved waiver record, not `risk_accepted=true` alone. |
| Change package idempotency keys collapse object scopes | P1 | Closed | Affected/resulting/training/verification idempotency keys now include fields, effect, effectivity, revisions, audience, evidence, and state dimensions. |
| Publication action and periodic close routes are under-guarded | P1 | Closed | Publication actions and periodic evaluation closure now require controlled roles and CSRF. |
| Audit pack endpoint accepts caller-supplied record arrays | P1 | Closed | Controller rejects caller record arrays; `AuditPackExportService` loads evidence, audit, change, and genealogy rows from canonical DB by scope. |
| Electronic signature is presence-only | P1 | Closed | `ElectronicSignatureService` requires re-auth challenge, auth method/result hash, signer identity snapshot, displayed-record hash binding, and signature manifestation. |
| Audit chain lacks deterministic sequence | P1 | Closed | Migration 124 adds `aggregate_sequence`; `AuditTrail` allocates sequence under aggregate advisory lock and verifies/orders by sequence. |
| CI/deploy gates are advisory | P1 | Closed | CI no longer tolerates PHPStan/OpenAPI failures; deploy workflow runs boundary, static analysis, tests, composer check, workflow authority check, and governed promotion input checks. |
| SharePoint readme implies direct filled-form/evidence storage and department edit folders | P1 | Closed | SharePoint template now states portal-first, read-only publication/discovery only, no user uploads. |
| Genealogy fact/projection can partially persist without transaction | P1 | Closed | `GenealogyGraphService::recordEdgeFact()` runs fact insert and projection inside DB transaction when supported; rollback proof is covered by focused tests. |
| Graph publication worker, WORM adapter, daily digest worker, full deterministic as-built closure, MES bridge conversion | P1 | Dependency-waived | These need external provider configuration or broader product rollout. Recorded below with owner, review date, and exit criteria. |

## Six-Agent Re-Audit Merge

| Agent | Highest severity | Hard finding merged into work |
|---|---:|---|
| Platform governance and repo hygiene | P1 | Generated runtime registry/report artifacts were tracked; CI/deploy release gates were advisory. |
| Document/form/evidence control | P1/P0 via change agent | Server schema/canonical validation, source attempt requirement, finalized-record amendment guard, and e-signature ceremony were added. |
| Change authority/configuration control | P0/P1 | Released document changes, deployment actions, emergency risk acceptance, idempotency scope, and change package rollback proof were hardened. |
| MES/MOM/genealogy | P1 | 5M policy is server-loaded and genealogy fact/projection writes are transaction-wrapped. |
| Regulated electronic records/data integrity | P0/P1 | Finalization fail-closed, signature ceremony, deterministic audit sequence, and scope-only audit pack export were added. |
| World-class product benchmark | P1 | Differentiators exist as foundations, but publication/WORM/audit-pack/graph need operational workers and productized APIs. |

## Benchmark Matrix

| Benchmark source | Capability bar | Repo position after this branch |
|---|---|---|
| SAP Digital Manufacturing / SAP ME genealogy management | As-built/genealogy tracking must link production execution, component use, and controlled records. | Canonical event/genealogy schemas exist; this branch promotes 5M context from shopfloor manual report events. |
| Siemens/ISA-95 manufacturing digital thread patterns | Enterprise-to-control separation with personnel, materials, equipment, methods, measurements, and dates/times. | No machine control is added; 5M gate and event filters are hardened for MOM/MES traceability. |
| PLM change/effectivity patterns | Released changes must cover affected object, resulting object, effectivity, and implementation verification. | Document lifecycle mutation and deployment actions now require canonical released authority/effectivity; effectivity manager product UI remains roadmap. |
| NIST SP 800-128 configuration management | Controlled baselines must exclude generated/runtime artifacts and require promotion evidence. | Generated artifacts removed; release manifest/receipt/reverse-sync added for branch-level promotion discipline. |
| Regulated e-record integrity | Final record must be canonical, immutable, signed, retrievable, and audit-exportable. | Finalization now fails closed without canonical persistence, richer signature ceremony is enforced, audit sequence is deterministic, and audit pack is scope-only DB-loaded. WORM and daily digest remain dependency-blocked. |

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
| 1 | Control-plane foundation | Evidence/document/change/genealogy gates hardened; deterministic audit sequence migration added. | Partition-scale DB validation under production volume. |
| 2 | Offline issuance and online finalization | Finalization fail-closed, signature ceremony required, source attempt mandatory for form/offline evidence, server schema/canonical validation added. | Broader schema-rule library and user-facing validation UX. |
| 3 | Change authority, effectivity, training gate | Exact document/deploy authority checks, emergency signature/waiver, idempotency scope, and rollback proof added. | Productized effectivity manager and training task lifecycle. |
| 4 | Publication, immutable package, audit pack | SharePoint boundary corrected; publication action guarded; audit pack is scope-only DB-loaded. | Graph worker, WORM adapter, daily digest worker. |
| 5 | Genealogy, digital thread, impact explorer | Shopfloor event 5M promotion added; genealogy write endpoints gated and transaction-wrapped; persisted 5M policy lookup added. | Deterministic full as-built graph closure, MES bridge conversion, and impact explorer product API. |

## API Contract List

| API area | Required contract behavior |
|---|---|
| Document release/supersede | Request must include `source_change_order_id`; response must include authoritative doc revision/effectivity/distribution rows; errors include `released_document_change_authority_required`. |
| Evidence finalization | Request must include original, canonical payload, readable snapshot, publication state, Part 11-style signature ceremony; form/offline evidence requires accepted source submission attempt; finalized records require amendment/change authority. |
| Canonical evidence retrieve | Request is evidence ref plus org context; response is assembled from canonical DB rows, not caller payload. |
| Genealogy fact write | Requires CSRF and controlled role; request must include edge fact endpoints and released change authority where service requires it. |
| 5M gate | Caller context is evaluated against persisted policy-authoritative required dimensions; caller cannot set required dimensions false or spoof policy source. |
| VPS deploy action | Requires env enablement, release manifest ref/hash, DB-backed released deployment change authority, promotion intent, and exact confirmation phrase. |
| Publication monitor | Must remain async; SharePoint failures return publication state/receipt/error, not evidence mutation. |
| Audit pack export | Endpoint accepts scope only and assembles from canonical DB rows; caller-supplied evidence/audit/change/genealogy arrays are rejected. |

## Worker/Job List

| Worker | State |
|---|---|
| `publication.sharepoint_graph` | Dependency-blocked on production Graph credentials and receipt verification policy. |
| `evidence.immutable_package_builder` | Package builder exists; WORM adapter integration remains dependency-blocked. |
| `audit.integrity_digest.daily` | Deferred P1 dependency; requires DB scheduler and retention of high-watermark proof. |
| `audit_pack.export` | Service-level DB assembly exists; packaged background export/immutable destination remains dependency-waived. |
| `digital_thread.project_genealogy` | Deferred P2; projection service should converge legacy traceability and canonical genealogy graph. |

## Validation Evidence

- `php -l` on touched PHP files: passed.
- Focused PHPUnit for world-class control-plane execution: passed, `50 tests`, `283 assertions`.
- `php tools/release/check_repo_boundary.php`: P0/P1 clean, 7 P2 prompt-file warnings remain.
- `php tools/release/check_workflow_status_authority.php`: clean.
- `./composer analyse -- --memory-limit=1G`: passed.
- `./composer test`: passed, `414 tests`, `2378 assertions`, `1 skipped`.
- `./composer check`: passed, `414 tests`, `2378 assertions`, `1 skipped`.

## Dependency-Blocked Register

| Item | Owner | Reason | Review date | Exit criteria |
|---|---|---|---|---|
| Graph publication worker | Platform owner + IT admin | Needs tenant app registration, library IDs, retention metadata policy. | 2026-05-14 | Worker persists attempt, receipt, target hash verification, retry/dead-letter. |
| WORM/Object Lock adapter | Platform owner + infrastructure owner | Storage provider and retention mode must be selected. | 2026-05-14 | Adapter persists provider immutability receipt in `immutable_storage_objects`. |
| Daily integrity digest worker | QA/QMS + platform owner | Needs scheduling/retention policy and digest scope approval. | 2026-05-14 | Daily worker produces `integrity_digests` and opens exceptions on mismatch. |
| Audit-pack background bundle/export destination | QA/QMS + platform owner | Scope-only DB assembly exists; immutable bundle destination and async worker need approved storage. | 2026-05-14 | Worker persists export package URI/hash/manifest and immutable retention receipt. |
| Deterministic full as-built graph closure | MES owner + platform owner | Current graph writes are transaction-wrapped but full multi-edge closure product API is broader Wave 5. | 2026-05-14 | Builder hashes full upstream/downstream closure, supersedes prior current snapshot, and proves deterministic replay. |
| MES evidence bridge conversion | MES owner + QA/QMS | Existing bridge still needs conversion from direct vault store to final evidence package flow. | 2026-05-14 | Bridge routes through `EvidenceFinalizationService`, emits ledger link, and rejects unsigned/noncanonical packages. |

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

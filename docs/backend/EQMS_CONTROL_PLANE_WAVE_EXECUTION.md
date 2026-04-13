# eQMS Control Plane Wave Execution

This file records the implemented backend execution layer for the next upgrade
wave. It is intentionally concrete: migrations, services, routes, workers, and
deprecations.

## Implemented Execution Layer

| Wave | Implemented asset |
| --- | --- |
| Wave 0 | `release_manifests`, `promotion_receipts`, `reverse_sync_intakes`, `source_boundary_violations`, `RepoBoundaryScanner` |
| Wave 1 | `eqms_command_ledger`, `control_plane_object_registry`, `state_transition_events`, canonical `outbox_events` handler/lease fields, `ControlPlaneCommandGuard`, `CanonicalOutboxService` |
| Wave 2 | `submission_validation_results`, `submission_validation_errors`, `duplicate_detection_fingerprints`, `online_form_sessions`, `EqmsFormExecutionService` |
| Wave 3 | `effectivity_conflicts`, `wip_dispositions`, `training_gate_decisions`, `read_ack_gate_decisions`, `EffectivityGateService` |
| Wave 4 | `publication_attempts`, `publication_receipts`, `immutable_storage_objects`, `audit_pack_exports`, `legal_holds`, `PublicationStateService`, `AuditPackExporter` |
| Wave 5 | `genealogy_nodes`, `genealogy_edges`, `as_manufactured_snapshots`, `traceability_exceptions`, `UnifiedEvidenceGraphService` |
| Cutover hardening | `governed_route_registry`, `legacy_authority_sunset`, `control_plane_command_handlers`, `periodic_evaluations`, `emergency_change_controls`, `rollback_requirements`, `genealogy_edge_facts`, `traceability_5m_obligations`, `ControlPlaneCommandService`, `PublicationMonitorService`, `PeriodicEvaluationService` |

## REST Contract Surface

The following routes are registered in `api/routes/eqms-control-plane-routes.php`:

- `GET /api/v1/eqms/control-plane/contract`
- `GET /api/v1/eqms/control-plane/state-machine`
- `POST /api/v1/eqms/control-plane/commands`
- `GET /api/v1/eqms/control-plane/commands/{command_id}`
- `POST /api/v1/eqms/control-plane/commands/validate`
- `POST /api/v1/eqms/forms/issuance-manifest/validate`
- `POST /api/v1/eqms/forms/submission-attempts/validate`
- `POST /api/v1/eqms/change-orders/release-gate/evaluate`
- `GET /api/v1/eqms/publications/retry-plan`
- `GET /api/v1/eqms/publications/monitor`
- `POST /api/v1/eqms/publications/actions`
- `POST /api/v1/eqms/audit-packs/manifest`
- `POST /api/v1/eqms/evidence-graph/preview`
- `GET /api/v1/eqms/admin/repo-boundary-scan`
- `GET /api/v1/eqms/periodic-evaluations`
- `POST /api/v1/eqms/periodic-evaluations`

## Enforcement Policy

- Generic CRUD remains blocked for governed mutation by policy.
- Repo promotion can run `php mom/tools/release/check_repo_boundary.php` to fail
  on tracked generated/runtime/report artifacts before release.
- Generic CRUD break-glass now requires `HESEM_ALLOW_GOVERNED_GENERIC_MUTATION=break_glass_for_migration_only`,
  the internal override token, a release manifest header, and a command id
  header. It is a migration escape hatch, not a production write path.
- New command APIs must call `ControlPlaneCommandGuard` before domain commit.
- `ControlPlaneCommandService` now writes `eqms_command_ledger` and emits
  `ControlPlaneCommandAccepted` through canonical `outbox_events`.
- Final evidence is valid only when the immutable package has original artifact,
  canonical payload, readable snapshot, hash/signature manifest, and publication
  state or receipt.
- Publication is separate from finalization and must use the read-only
  SharePoint boundary.
- Change order release must pass affected/resulting/effectivity, verification,
  training, read acknowledgement, and conflict gates.

## Deprecations

- SharePoint as SSOT for controlled records.
- End-user SharePoint upload for evidence.
- JSON evidence vault as final evidence authority.
- JSON workflow state as regulated lifecycle authority.
- Legacy `DomainOutboxService` writes to `domain_outbox_events`; it now bridges
  to canonical `outbox_events`. `DomainOutboxWorker` is retained only to drain
  historical rows.
- Product passport JSON create/event writes; mutation must move to canonical
  genealogy/digital-thread commands.
- Flat-file API audit logs as authoritative audit trail. They are debug-only
  when `MOM_ENABLE_LEGACY_AUDIT_LOG=1`.
- `plm_change_order_lines` as the only post-release change authority model.
- Hidden Excel sheets, workbook custom properties, sidecars, or QR codes as
  trust anchors.

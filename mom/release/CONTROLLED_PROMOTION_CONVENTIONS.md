# Controlled Promotion Conventions

Purpose: keep deployable source, generated artifacts, runtime data, publication replicas, and final records separate.

## Source Boundaries

Controlled source may contain:
- Application source code.
- SQL migrations and seed files intended for deployment.
- Unit/integration tests.
- Normative architecture, SOP, WI, and governance documentation.
- Sanitized examples that are intentionally versioned.

Controlled source must not contain:
- Runtime logs.
- Browser screenshots and videos from exploratory testing.
- `_reports`, `_build`, `_Deleted`, `.tmp`, cache, or local work outputs.
- Final evidence records or publication replicas.
- SharePoint downloaded/uploaded operational files.
- Unsanitized customer, employee, supplier, lot, batch, serial, or audit data.

## Release Manifest

Every controlled promotion must include a manifest with:

```json
{
  "release_id": "MOM-2026.04.13-001",
  "source_commit": "git-sha",
  "created_at": "2026-04-13T00:00:00Z",
  "created_by": "user-or-service",
  "change_authority": {
    "change_order_id": "CO-2026-001",
    "state": "released"
  },
  "source_items": [
    {
      "path": "mom/database/migrations/106_eqms_world_class_control_plane.sql",
      "sha256": "64hex",
      "purpose": "schema"
    }
  ],
  "tests": [
    {
      "name": "phpunit",
      "result": "passed",
      "evidence_uri": "artifact://ci/phpunit.xml"
    }
  ],
  "migration_plan": {
    "forward": ["106_eqms_world_class_control_plane.sql"],
    "rollback": "additive rollback documented in migration header"
  },
  "risk_acceptance": [],
  "approvals": []
}
```

## Promotion Receipt

Each environment promotion must write a receipt:

```json
{
  "promotion_receipt_id": "PROMO-2026-04-13-DEV-001",
  "release_id": "MOM-2026.04.13-001",
  "environment": "dev",
  "started_at": "2026-04-13T00:00:00Z",
  "completed_at": "2026-04-13T00:05:00Z",
  "source_commit": "git-sha",
  "applied_migrations": ["106_eqms_world_class_control_plane.sql"],
  "post_deploy_checks": [
    {
      "name": "state_machine_unit_tests",
      "result": "passed"
    }
  ],
  "manifest_hash_sha256": "64hex",
  "receipt_hash_sha256": "64hex",
  "approved_by": "qa-qms-user"
}
```

## Reverse-Sync Intake

Operational changes discovered in runtime or publication systems must not be edited directly into source. They enter through reverse-sync intake:

```json
{
  "intake_id": "RSI-2026-04-13-001",
  "source_system": "sharepoint",
  "source_reference": "site/library/path",
  "observed_at": "2026-04-13T00:00:00Z",
  "classification": "publication_drift",
  "proposed_action": "open_change_request",
  "evidence": [
    {
      "artifact_uri": "immutable://...",
      "sha256": "64hex"
    }
  ],
  "disposition": "quarantine"
}
```

Allowed dispositions:
- `ignore_with_reason`
- `quarantine`
- `open_change_request`
- `link_publication_receipt`
- `integrity_exception`

Forbidden disposition:
- `direct_source_edit`

## Release Gates

Before promotion:
- Worktree is reviewed for generated artifacts.
- Release manifest exists and hashes controlled source items.
- Change order is released where production controlled objects are affected.
- Tests relevant to changed bounded contexts are passing.
- Migration rollback/additive compatibility is documented.
- Publication targets are classified as read-only replicas.

After promotion:
- Promotion receipt is written.
- Integrity digest is scheduled.
- Failed publication jobs are monitored.
- Any drift is handled through reverse-sync intake, not direct source edits.


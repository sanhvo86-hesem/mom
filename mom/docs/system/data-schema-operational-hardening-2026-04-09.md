# Data Schema Operational Hardening

Date: 2026-04-09

## Why this exists

The rebuilt `Data Schema` admin module is not allowed to behave like a decorative dashboard. It must surface operational truth, conflict conditions, and release blockers that would otherwise stay hidden behind green-looking summary scores.

## Findings from the hardening audit

1. Artifact generation drift is real.
   Runtime-facing artifacts such as `endpoint-catalog`, `relation-map`, `registry-quality-report`, `registry-manifest`, and `data-fields-index` can be generated much more recently than authority-side artifacts such as `table-registry`, `schema-studio-diagnostics`, `schema-studio-enterprise-manifest`, `schema-authority-summary`, and `migration-gap-report`.

2. Release/readiness signals can contradict each other.
   `schema-studio-diagnostics` can report high readiness scores while `registry-quality-report` still says `review_required` with unresolved publishability and contract blockers.

3. Silent overwrite risk existed in metadata editors.
   Before hardening, an admin could open a detail view, leave it stale for hours, and save over newer changes without any revision check.

4. Large registry artifacts are now part of normal operations.
   `endpoint-catalog.json` and `relation-map.json` are large enough that naive full-file loading or rewrite-heavy workflows become a runtime and editing risk.

5. Live DB visibility is not enough by itself.
   A successful PostgreSQL probe does not prove the runtime path is actually using PostgreSQL. Split-brain between live DB probe and active DataLayer mode must be surfaced.

6. Time freshness alone is not enough.
   An artifact can look "fresh" by age but still be wrong if one of its source documents was changed after the artifact was generated. This is especially relevant for diagnostics/manifests that lag behind newer registry or workspace inputs.

7. Design actions had the same stale-write class of failure as metadata editors.
   `save design`, `set baseline`, `diagnose`, `compile`, and `release` were able to operate on a stale editor session if another admin had already changed the persisted design or baseline on the server.

8. Table-exists checks were not enough to protect runtime truth.
   A table can exist in PostgreSQL while still drifting in missing columns, unmanaged columns, or primary-key posture. A green "DB present" badge is unsafe if structural drift is invisible.

9. Governance blind spots and stress scenarios were still out-of-band.
   The platform already generated `operational-blind-spot-report.json` and `operational-stress-report.json`, but the Data Schema control plane did not treat those findings as first-class release posture.

## Guardrails now implemented

1. Workspace operational state
   The workspace now exposes `operational.status`, `operational.risks`, `operational.coverageGaps`, `operational.releaseGate`, `operational.saveGuard`, and `operational.freshness.artifacts`.

2. Artifact freshness inventory
   Each core artifact now reports category, age, size, generation time, file time, freshness status, dependency drift, and whether it is part of the release-critical path.

3. Release gate
   The UI now shows whether release posture is clear, review-required, or blocked, with blocking reasons pulled from operational risks.

4. Revision-guarded saves
   API, table, schema, and variable detail endpoints now return a revision fingerprint.
   Save requests must echo that revision back.
   If the source file changed, the save fails with `409 stale_workspace_revision`.

5. Save payload limits
   Detail saves are capped at `1 MiB` to stop accidental oversized metadata writes.

6. Source-vs-artifact dependency drift
   Release-critical derived artifacts now expose whether their source documents are newer than the artifact itself.
   This surfaces cases where diagnostics/manifests are behind current registry or workspace inputs even though the artifact file is not "old" by age.

7. Revision-guarded design actions
   `schema_studio_get` now returns design/baseline revisions plus save policy metadata.
   `schema_studio_save`, `schema_studio_set_baseline`, `schema_studio_diagnose`, `schema_studio_compile_registry`, and `schema_studio_release_bundle` now reject stale or missing revision tokens with `409`.

8. Live DB structural drift detection
   The PostgreSQL probe now compares registry authority against live DB columns and primary keys.
   Each table now exposes `missing_columns`, `unexpected_columns`, `column_drift_count`, `db_primary_key_fields`, and `pk_drift`.
   The workspace connection summary now surfaces structural drift totals and top offending tables.

9. Operational audit gate integration
   `operational-blind-spot-report.json` and `operational-stress-report.json` are now tracked as release-critical artifacts, included in dependency-drift checks, surfaced in workspace metrics, and promoted into blocking operational risks when critical scenarios remain open.

## Risks that still require ongoing governance

1. Diagnostics score inflation
   High diagnostic scores are useful, but they must never be treated as release authority while quality report blockers remain unresolved.

2. JSON fallback / dual-truth runtime
   If runtime uses JSON fallback while PostgreSQL is reachable, table coverage can look healthier than real runtime posture.

3. Compiler/release preflight
   `schema_studio_release_bundle` is now blocked when `operational.releaseGate.blocking === true`.
   `schema_studio_compile_registry` remains allowed because compile is part of rebuilding stale or contradictory artifacts.

4. Workspace-wide source drift
   The current dependency drift model tracks the canonical workspace and release-critical registry files. If more parallel design branches become first-class runtime inputs, the dependency graph must be widened so those branches are not invisible to the control plane.

5. Multi-user editing UX
   Revision tokens now prevent stale writes, but the UI still uses simple reload-and-reapply semantics rather than a 3-way merge experience.

6. Runtime truth still depends on environment truth
   Structural drift checks assume the probed schema is the real production schema. If runtime points at one schema but operators inspect another, the control plane can still mislead. Environment binding must stay explicit.

7. Governance report quality depends on generator discipline
   Blind-spot and stress gates are only trustworthy if their generators stay aligned with canonical catalogs, lifecycle reports, and runtime contracts. Generator drift is now visible, but still requires disciplined regeneration in release flows.

## Live verification notes

1. Linux case-sensitivity exposed hidden autoload drift.
   The previous autoload setup could resolve `MOM\Api\Services\...` on macOS but fail on Linux because `MOM\Api\` fell through to `/api/Services/...` rather than `/api/services/...`.

2. Production config drift is a real operational risk.
   During live verification, production `role_permissions.json` and several registry governance assets were older than the local control-plane source and caused smoke regressions that local development did not show immediately.

3. Module hardening and environment hardening are linked.
   A control-plane module can only be trustworthy when the runtime code, permission matrix, and generated registry assets are kept in lockstep. UI hardening alone is not enough.

4. Structural drift is a stronger live signal than presence alone.
   During the deeper hardening pass, the major hidden failure mode was not simply "missing table" but "existing table with wrong shape". The control plane now treats that as a first-class operational concern.

5. Current production still lacks trustworthy PostgreSQL probe credentials.
   Live verification on `eqms.hesemeng.com` shows the Data Schema control plane currently hits `SQLSTATE[08006] ... fe_sendauth: no password supplied` when probing PostgreSQL with the production data directory. That means the stricter release gate is behaving correctly: the environment is not yet providing DB truth to the module.

## Recommended next upgrades

1. Add diff-aware merge assist for stale metadata/design editors.
2. Add a background registry health job that snapshots both age drift and dependency drift over time.
3. Add an audit surface that shows who changed each registry artifact and design workspace file and when.
4. Add policy hooks that can require clean dependency drift before destructive migrations or release approvals.
5. Add a signed remediation workflow for structural DB drift so operators can track whether the authority should move toward the DB or the DB should be migrated toward authority.
6. Add a scheduled regeneration check that fails fast when blind-spot/stress reports lag behind their source governance assets.

# ADR 0013: Data / Source-Code Isolation via Strangler-Fig Cutover to PostgreSQL

## Status

Accepted — 2026-05-10

## Context

The HESEM MOM ERP currently co-locates **runtime mutable state** with
**source code** inside a single git working tree. Every `git pull` /
`git reset --hard` on the VPS therefore risks overwriting data that
PHP-FPM has mutated since the previous deploy.

The history of this repo records at least one such loss:

> Commit `4a8ffebd` reverted `mom/data/config/users.json` to a
> pre-mutation snapshot; user `ianr` disappeared. Commit `41436ee2`
> later untracked the file, closing the *physical* gap. The
> *architectural* gap — that user/role data is "configuration", and
> configuration travels in git — remained.

Four classes of runtime state are at risk today:

| Class | Path (tracked or runtime-mutable) | Mutator |
|---|---|---|
| **L1 — Identity (RBAC)** | `mom/data/config/{users,roles,role_permissions,user_doc_overrides,portal_role_docs,module_access_config}.json` | Admin UI → `users_save()` / `DataSyncMutationService` |
| **L2 — QMS Documents** | `mom/docs/{system,operations,forms,training,glossary}/**/*.html` (~942 files, **tracked**) | Admin "Edit Document" modal → filesystem write |
| **L3 — Uploads / Evidence** | `mom/data/uploads/{accepted,quarantine,rejected}/`, `mom/data/allocations/uploads/` | Upload endpoints |
| **L4 — Operational Audit** | `mom/data/audit/*.jsonl`, `/var/log/qms-data-sync.log` | `DataSyncMutationService::writeAudit()` |

Existing mitigations (`tools/vps-setup/scripts/deploy.sh` capture/
restore, `.deploy-snapshots/`, runtime-files audit gate) are **defense
in depth** but every layer assumes nothing crashes between capture
and restore. They cannot be the *primary* answer — they must become
the *fallback* answer.

The repository already ships **half** of the right architecture:

- Migrations `002`, `162`, `173` define `users`, `roles`,
  `user_roles`, `audit_events` tables in PostgreSQL.
- `AuthUserShadowSyncService` writes every JSON mutation through to
  PostgreSQL — i.e., **shadow-write is already running** on the write
  path.
- `UserRepository` provides a clean abstraction over `users.json` for
  reads.

The **read** path, however, still resolves identity out of
`users.json`. The strangler fig has been planted but never finished
strangling.

## Decision

We commit to a **four-stage Strangler-Fig cutover** governed by a
single PostgreSQL table (`data_collection_state`) that holds the
current mode for each runtime collection (`users`, `roles`,
`role_permissions`, `dcc_documents`, …). Mode changes are operational
flips, not deploys — runtime code reads the mode on every request.

Stages (per collection, advanced independently):

```
JSON_ONLY ─▶ SHADOW_WRITE ─▶ POSTGRES_PRIMARY ─▶ POSTGRES_ONLY
            (write both)     (read DB,           (drop JSON,
                              fallback JSON)      JSON ignored)
```

Concrete decisions:

1. **Single source of truth = PostgreSQL.** Every mutable collection
   ends in `POSTGRES_ONLY`. JSON files become *bootstrap seeds* and
   *legacy import inputs* — never authoritative state.

2. **Source code is read-only at runtime.** PHP-FPM runs under a uid
   that has no write permission on `/opt/qms/app/`. `mom/data/config/`
   is bind-mounted from a persistent volume (`/var/lib/qms/config/`)
   that is **outside** the git working tree.

3. **Audit trail = hash-chained event log.** Migration 174 adds
   `audit_event_chain.prev_sha256` and `row_sha256`. Each row's hash
   covers `(prev_sha256 || event_id || event_type || aggregate_id ||
   payload || recorded_at)`, producing a tamper-evident chain. This
   satisfies 21 CFR Part 11 §11.10(e), GDPR Art. 32, ISO 27001
   A.8.2.3, and IEC 62443 SR 2.10.

4. **Backups via PostgreSQL + S3, not git snapshots.**
   - `pgBackRest 2.x` with WAL archiving → 7-day PITR window, 365-day
     full-backup retention.
   - L3 uploads → S3 with versioning + cross-region replication +
     Object Lock (WORM) retention 7 years.
   - `tools/vps-setup/scripts/deploy.sh` capture/restore is kept only
     during the cutover; removed once every collection is
     `POSTGRES_ONLY`.

5. **One migration controls the contract.** Migration 174
   (`174_data_isolation_foundation.sql`) introduces
   `data_collection_state`, `audit_event_chain`,
   `audit_event_chain_verify()` SPI, and seeds initial modes.

6. **Repositories are mode-aware.** A new `IdentityRepository`
   replaces direct `users_save()` and direct DB calls. Every read goes
   through the repository, which consults `data_collection_state` and
   chooses the source. No controller bypasses it.

7. **Cutover is monotonic, but reversible per-collection.** A bad flip
   (e.g. `POSTGRES_PRIMARY` exposes a column-shape mismatch) can be
   downgraded to `SHADOW_WRITE` by an operator with one SQL `UPDATE`.
   Ratchet: once `POSTGRES_ONLY` is set and the JSON file is removed
   from disk, downgrade requires a backfill from snapshot — by design.

## Consequences

### Positive
- **Zero data loss on `git reset`.** RBAC + audit live in PostgreSQL
  with WAL replication; the source tree is structurally incapable of
  destroying them.
- **21 CFR Part 11 / ISO 27001 compliant audit trail** without
  bolting on a third-party tool.
- **12-Factor §III, §VI compliant.** Config lives in env + DB;
  processes are stateless; ephemeral filesystem.
- **Per-collection rollout** lets us de-risk: identity (high-value,
  smallest blast radius) goes first; documents (largest blast radius)
  goes last.
- **Observable cutover.** Every `SHADOW_WRITE` divergence is logged
  to `audit_event_chain` with `event_type='shadow_drift_detected'`,
  giving us evidence the moment the JSON and DB disagree.

### Negative
- **Two writes per identity mutation during `SHADOW_WRITE`** — minor
  P99 latency cost (≈3 ms PG `INSERT`). Acceptable given mutation
  rate is <5/sec peak.
- **Operational vocabulary expands.** Operators must understand
  `data_collection_state` modes; runbook (§Runbook) makes this
  explicit.
- **Removes the "edit JSON in vi as last-resort fix" escape hatch.**
  Replaced by `tools/cli/identity-admin.php` which writes through
  the repository.

### Neutral
- The `mom/data/config/*.bootstrap.json` pattern is preserved as the
  **seed** mechanism for fresh installs. Bootstrap files are
  imported by `tools/cli/backfill-identity.php` on first deploy of
  an empty database.

## Alternatives Considered

### A1: "Big-bang" rewrite — drop JSON, deploy DB-only in one cut
**Rejected.** The repo has 28 callsites that touch `users.json`
(controllers, scheduled jobs, workflow engine). A single PR to flip
all of them would be impossible to review safely. Strangler-fig
keeps each PR scoped to one read path.

### A2: Move JSON to a sibling git repo (`hesem/eqms-runtime-data`)
**Rejected.** Solves the `git reset` problem but not the
durability, audit, or RBAC-query-power problems. Two repos to deploy
also doubles the operational surface.

### A3: Keep JSON authoritative, replicate to DB asynchronously via
RabbitMQ
**Rejected.** Eventual consistency + audit + dual writers leads to
permanent drift. The DB never becomes truly authoritative; we'd
ship a permanent dual-source system.

### A4: Use Doctrine ORM / propel for the identity model
**Rejected.** The codebase has zero ORM dependency today; introducing
one for one collection adds 3000+ LoC of dependency surface and a
learning curve. PDO + raw SQL is sufficient and matches the
codebase's existing patterns (`Connection.php`,
`AuthUserShadowSyncService.php`).

### A5: Adopt a config-management database (etcd / Consul) for L1
**Rejected.** Operationally heavier, no SQL query power, no
foreign-key referential integrity for `user_roles → roles`,
no native partitioned audit trail. PostgreSQL gives us all four.

### A6: Use PostgreSQL Row-Level Security (RLS) for tenant isolation
**Deferred.** Single-tenant deployment today; RLS adds complexity
without immediate benefit. Revisit when multi-plant rollout begins
(Wave 3+).

## References

### Standards / Frameworks
- [12-Factor App — III. Config](https://12factor.net/config)
- [12-Factor App — VI. Processes](https://12factor.net/processes)
- [Filesystem Hierarchy Standard 3.0](https://refspecs.linuxfoundation.org/FHS_3.0/fhs-3.0.html) — `/var/lib/`, `/etc/`, `/opt/`
- [21 CFR Part 11 §11.10(e)](https://www.ecfr.gov/current/title-21/chapter-I/subchapter-A/part-11)
- [ISO 27001:2022 A.8.2.3 — Information classification](https://www.iso.org/standard/27001)
- [NIST SP 800-53 rev5 SC-28 / AU-10](https://csrc.nist.gov/pubs/sp/800/53/r5/upd1/final)
- [GDPR Art. 32 — Security of processing](https://gdpr-info.eu/art-32-gdpr/)

### Patterns
- Martin Fowler — [Strangler Fig Application](https://martinfowler.com/bliki/StranglerFigApplication.html)
- AWS Prescriptive Guidance — [Strangler fig pattern](https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/strangler-fig.html)
- Microsoft — [Strangler Fig pattern](https://learn.microsoft.com/en-us/azure/architecture/patterns/strangler-fig)

### Internal artefacts
- `mom/database/migrations/002_core_system.sql` — base RBAC schema
- `mom/database/migrations/174_data_isolation_foundation.sql` — this ADR's executable contract
- `mom/api/services/AuthUserShadowSyncService.php` — pre-existing shadow-writer (write path)
- `mom/api/services/IdentityRepository.php` — new mode-aware read/write surface
- `tools/cli/backfill-identity.php` — JSON → PostgreSQL importer
- `docs/runbooks/data-isolation-cutover.md` — operator runbook
- `tools/vps-setup/scripts/deploy.sh` — legacy capture/restore (transitional)

## History

- 2026-05-10: Proposed and accepted by HESEM founder/dev (sanhvo86).
- 2026-05-10: Migration 174, IdentityRepository, backfill CLI, and
  runbook landed.

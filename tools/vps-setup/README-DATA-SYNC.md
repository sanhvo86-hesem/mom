# HESEM data sync — local ↔ VPS workflow

These scripts move runtime data (config files, uploads, database dumps)
between the production VPS and a developer workstation in a way that
satisfies **ISO 9001 §7.5 / §8.5.6** documented-information control,
**ISO 27001 / 27701** information-security & PII handling, and
**ALCOA+** (Attributable, Legible, Contemporaneous, Original, Accurate +
Complete, Consistent, Enduring, Available) data-integrity principles —
all of which are what customer / supplier-quality auditors look for during
their audit of HESEM.

## Decision tree — pick the right tool

```
What are you trying to do?
├─ Edit application code/templates/HTML/JS/CSS/SQL migrations
│    → use git. Push to main, deploy.sh applies.
│      DO NOT use these data-sync scripts for code.
│
├─ Keep local and VPS runtime config continuously aligned
│  (the "communicating vessels" model — recommended default)
│    → data-sync.sh
│      Runs a 3-way diff (baseline ↔ local ↔ VPS) and applies the right
│      direction per file. Conflicts go through a deterministic resolver.
│      See "Bidirectional sync" below.
│
├─ One-shot manual edit of a runtime config file
│    → data-pull.sh  (download with manifest)
│      edit locally
│      data-push.sh --change-ref CR-XXX  (upload with drift check + audit)
│
├─ Need a copy of production data for local development/debugging
│    → mom/ops/vps/db-pull.sh --restore --anonymize
│      (always anonymize; PII inside repo or shared dumps = GDPR breach)
│
└─ Need to restore a DB backup onto production after an incident
     → tools/vps-setup/scripts/db-push.sh
       (last resort; usually the right answer is a migration script)
```

## Bidirectional sync (`data-sync.sh`) — the recommended default

`data-sync.sh` treats the local working copy and the VPS as two
communicating vessels. On each run it compares THREE states and decides
per file which way to flow:

```
   baseline   ← state of VPS at last successful sync (working/manifest.json)
   local      ← current working/files/config/*.json
   vps        ← live /var/www/data-private/config/*.json
```

Decision table (`B = baseline`, `L = local`, `V = vps`):

| L vs B | V vs B | L vs V | Action      |
|--------|--------|--------|-------------|
| same   | same   | —      | NOOP        |
| diff   | same   | —      | PUSH local→vps |
| same   | diff   | —      | PULL  vps→local |
| diff   | diff   | same   | CONVERGED (refresh baseline only) |
| diff   | diff   | diff   | CONFLICT (resolved per `--conflict-mode`) |

Conflict modes:

- `prefer-vps` *(default — production is authoritative)*: VPS bytes win on
  disk; the prior local copy is preserved as `<file>.LOCAL.<timestamp>` so
  no work is silently destroyed.
- `prefer-local`: local bytes win; the prior VPS bytes survive in the
  snapshot directory automatically taken by `data-push.sh`.
- `keep-both`: same effect as `prefer-vps` plus an explicit name; useful
  when scripting a follow-up human review of the `.LOCAL.*` files.
- `abort`: stop with exit code 2 and let a human resolve manually.

### Common operations

```bash
# Continuous reconciliation (interactive confirmation):
bash tools/vps-setup/scripts/data-sync.sh

# Dry-run — exits 0 if in sync, 10 if changes pending. Good for CI/cron:
bash tools/vps-setup/scripts/data-sync.sh --check-only

# Non-interactive auto-pull (e.g. from a 5-min launchd/cron):
bash tools/vps-setup/scripts/data-sync.sh --pull-only --yes

# Push-only after intentional local edits, with a real change reference:
bash tools/vps-setup/scripts/data-sync.sh --push-only --yes --change-ref CR-2026-099

# When you're sure local is right and want it to win on conflict:
bash tools/vps-setup/scripts/data-sync.sh --conflict-mode prefer-local --yes
```

### Working-dir layout

```
~/mom-vps-data/<host_slug>/working/
├── files/config/*.json     ← editable local copy (the "local pool")
├── manifest.json           ← baseline = VPS state at last successful sync
├── .history/<ts>/          ← per-sync VPS pull (manifest + files)
├── .sync-state.jsonl       ← append-only log of every sync decision
└── .sync.lock              ← flock — only one sync at a time per host
```

`.history/` is auto-pruned to the last 30 entries. `.sync-state.jsonl`
keeps full plan + outcome of every run for ALCOA+ Contemporaneous /
Reproducible — grep it for the audit trail of who synced what when.

### Optional pre-push hook

`.githooks/pre-push` runs `data-sync.sh --check-only` before each
`git push` and prompts for confirmation if local data has drifted from
the VPS. It is silent when offline / when VPS is unreachable so it never
blocks travel. Activate per clone:

```bash
git config core.hooksPath .githooks
```

Bypass any single push with `git push --no-verify`.

### Automation: run sync on a 5-minute schedule

macOS (launchd):

```xml
<!-- ~/Library/LaunchAgents/com.hesem.mom.data-sync.plist -->
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key>            <string>com.hesem.mom.data-sync</string>
  <key>ProgramArguments</key> <array>
    <string>/bin/bash</string>
    <string>/Users/YOU/Documents/mom/tools/vps-setup/scripts/data-sync.sh</string>
    <string>--pull-only</string><string>--yes</string>
  </array>
  <key>StartInterval</key>    <integer>300</integer>
  <key>StandardOutPath</key>  <string>/tmp/mom-data-sync.out</string>
  <key>StandardErrorPath</key><string>/tmp/mom-data-sync.err</string>
</dict></plist>
```

Then: `launchctl load ~/Library/LaunchAgents/com.hesem.mom.data-sync.plist`.

Linux (cron):

```cron
*/5 * * * * /bin/bash $HOME/Documents/mom/tools/vps-setup/scripts/data-sync.sh --pull-only --yes >>/tmp/mom-data-sync.log 2>&1
```

Default to `--pull-only` for the timer: scheduled runs should never push
without an explicit human change reference.

## File-system layout

| Path | Owner | Purpose |
|---|---|---|
| `/var/www/eqms.hesemeng.com` | `deploy:www-data` | Code (git working tree). Managed by `deploy.sh`. |
| `/var/www/data-private/config/` | `deploy:www-data` 750 | Hand-edited runtime config (JSON). `data-pull/push.sh` operates here. |
| `/var/www/data-private/.snapshots/<ts>/` | `deploy:www-data` | Auto-snapshot taken by `data-push.sh` BEFORE every write. 30 most recent kept. |
| `/var/www/data-private/.db-backups/<ts>.dump` | `deploy:www-data` | Pre-restore DB dump taken by `db-push.sh` BEFORE every restore. 30 kept. |
| `/var/log/qms-data-sync.log` | `root` (append-only via sudo) | Flat audit log of every pull/push/db-push, regardless of DB state. |
| `~/mom-vps-data/<host>/<ts>/` | local `$USER` | Where pulled data lands. Treat as confidential. |

## Audit trail produced

Every `data-push.sh` and `db-push.sh` invocation creates THREE pieces of
evidence:

1. **Manifest on local disk** (`~/mom-vps-data/.../latest/manifest.json`) —
   sha256 of every file as it existed on the VPS at pull time, plus actor
   and the git revision deployed at that moment.
2. **Snapshot on the VPS** (`/var/www/data-private/.snapshots/<ts>/`) — the
   verbatim previous state of the affected subset, kept for 30 pushes.
   Rollback is `rsync` from snapshot back into place.
3. **Two log entries** — one row in the `audit_events` table (queryable
   from the portal Activity log), one line in `/var/log/qms-data-sync.log`
   (survives even if PostgreSQL is down).

Each row carries: actor (Linux user @ host), `change_ref` (the CR/ticket
ID supplied at runtime), `pulled_at` of the manifest, `original_git_revision`
of the code that was live when the pull happened, and `snapshot_id` of the
rollback evidence.

## The drift-detection guarantee

`data-push.sh` re-checksums every file on the VPS BEFORE uploading and
compares it to the manifest produced by the original pull. If any file
diverged on the VPS in between (because someone else also edited it, or
the deploy pipeline overwrote it, or PHP-FPM rewrote a counter), the push
**aborts with a list of drifted files** and refuses to overwrite. This is
the ALCOA+ "Original" guarantee — you cannot silently undo someone else's
work.

To recover from drift: re-pull (`data-pull.sh`), merge your local edits on
top of the new manifest, and push again.

## Deploy preservation rule

Production edits made through the portal are runtime mutations. They must not
be lost just because a code deploy refreshes the Git working tree.

- `tools/vps-setup/scripts/deploy.sh` captures governed config files and
  portal-managed document trees before `git reset --hard`, then restores them
  after the reset.
- `mom/ops/vps/deploy-control-tower-sync.sh` preserves remote runtime config
  and `mom/docs/**` by default while syncing code. To intentionally publish
  repository document changes, run it with `SYNC_RUNTIME_DOCS=1` and treat that
  as a controlled document release action.
- `PRESERVE_RUNTIME_MUTATIONS=0`, `PRESERVE_RUNTIME_DOCS=0`, or
  `PRESERVE_RUNTIME_CONFIG=0` are break-glass flags only; use them with a
  change reference and a fresh backup.

## Why we don't just rsync everything

The lazy version of "pull edit push" — `rsync VPS→local`, edit, `rsync
local→VPS` — fails ISO audit on at least four counts:

- **Attributable**: rsync over a shared SSH key has no per-operation actor.
- **Original**: a concurrent VPS write is silently destroyed.
- **Contemporaneous**: timestamps drift, no log of when the export happened.
- **Reproducible**: no hash of what was exported, no link to a CR.

The scripts here add manifest, drift detection, snapshot, change-ref, and
audit row — turning the same `rsync` underneath into something an auditor
can trace end-to-end.

## Common operations

```bash
# 1) Pull current production config to look at it locally.
bash tools/vps-setup/scripts/data-pull.sh
#  → ~/mom-vps-data/<host>/<ts>/files/config/...
#  → ~/mom-vps-data/<host>/<ts>/manifest.json
#  → ~/mom-vps-data/<host>/latest  symlink

# 2) Edit a config file locally.
vim ~/mom-vps-data/<host>/latest/files/config/feature_flags.json

# 3) Dry-run the push to see what WILL change (no upload, no snapshot).
bash tools/vps-setup/scripts/data-push.sh \
     --source ~/mom-vps-data/<host>/latest \
     --dry-run

# 4) Real push. --change-ref ties the audit row to your CR/ticket.
bash tools/vps-setup/scripts/data-push.sh \
     --source ~/mom-vps-data/<host>/latest \
     --change-ref CR-2026-042

# 5) Pull DB for local dev (always anonymise — never commit the dump).
bash mom/ops/vps/db-pull.sh --restore --anonymize

# 6) Disaster recovery only — restore a dump back onto prod.
bash tools/vps-setup/scripts/db-push.sh \
     --dump ~/mom-vps-data/db/hesem_vps_xxx.dump \
     --change-ref INC-2026-013 \
     --i-understand-this-overwrites-production
```

## Prerequisites

- Local: `rsync`, `ssh`, `jq`, `sha256sum`/`shasum`, `psql`/`pg_restore`,
  `createdb`. macOS: `brew install rsync jq postgresql@16`.
- VPS: SSH user listed in `/etc/sudoers.d/qms-deploy` for the specific
  commands the scripts call (`tee -a /var/log/qms-data-sync.log`,
  `chown`, `chmod`, `systemctl reload php8.5-fpm`,
  `systemctl stop|start php8.5-fpm`, `mkdir -p` under
  `/var/www/data-private/.snapshots/`).
- VPS: `jq` installed for manifest generation (`apt install jq`).

## What is intentionally NOT here

- A scheduler/cron entry. Pulls and pushes are deliberate human actions
  tied to a CR. Automating them would skip the change-control step.
- A "sync everything" mode. Each subset must be in the `data-pull.sh`
  allow-list explicitly so that adding a new sync target requires a code
  review — that review is the change-control gate for the data-sync
  surface itself.
- A way to push without `--change-ref`. ISO §8.5.6 requires the link.

# Runtime-mutated config files — audit & defense layers

This document records the layered defenses preventing the original failure
mode (a `git push` from a developer laptop overwriting live VPS state via
the deploy pipeline) and the structural fix that makes that failure mode
**impossible** rather than merely guarded against.

## The original failure mode

1. PHP-FPM on the VPS writes to `mom/data/config/users.json` whenever an
   admin adds/edits/removes a user.
2. The same file is **tracked in git**, so `git status` on a developer
   laptop sees it as "modified" after any local exercise of the app.
3. `git commit -am` or `git add .` silently includes that file.
4. `git push` propagates to GitHub.
5. GitHub Actions runs `tools/vps-setup/scripts/deploy.sh` over SSH.
6. `git reset --hard origin/main` overwrites `users.json` on the VPS.
7. Live state (the most recently added users, edited roles, etc.) is gone.

The original `deploy.sh` had a `capture_runtime_mutations()` /
`restore_runtime_mutations()` pair around the reset, but it was a
runtime-only safety net based on a hand-maintained whitelist of 12
basenames. A safety audit found:

- The whitelist was **incomplete**: 6 tracked files PHP writes were not
  in it (`record_type_expanded.json`, `epicor_integration_policy.json`,
  `form_builder_formulas.json`, `evidence_retention_policy.json`,
  `evidence_review_sla_policy.json`, plus `ai_config.json` was being
  written to a path that wasn't tracked but whose mirror in
  `/var/www/data-private/config/` could still drift).
- `restore_runtime_mutations()` used `cp ... 2>/dev/null || true`,
  silently swallowing restore failures so deploy could succeed with VPS
  state corrupted.
- A second script, `mom/ops/vps/setup-vps.sh`, ran `git reset --hard
  origin/main` against existing checkouts with **no** preservation —
  re-running setup on an existing VPS would clobber everything in one go.
- Multiple environment-variable escape hatches
  (`PRESERVE_RUNTIME_MUTATIONS=0`, `PRESERVE_RUNTIME_DOCS=0`,
  `SKIP_HEALTHCHECK=1`) could silently disable the safety net.

## Defense in depth (current state)

The defenses are layered so that even bypassing one of them does not lose
data. From outermost (developer laptop) to innermost (the structural fix):

### Layer 0 — Bidirectional sync (`data-sync.sh`)

Developer keeps local and VPS in sync explicitly. Three-way diff
(baseline ↔ local ↔ VPS) per file, deterministic conflict resolver
(default `prefer-vps`). See [README-DATA-SYNC.md](README-DATA-SYNC.md).

### Layer 1 — Pre-commit hook ([.githooks/pre-commit](../../.githooks/pre-commit))

Refuses `git commit` when the staged diff touches any file matching
`RUNTIME_CONFIG_REGEX`. Sourced from
[`tools/vps-setup/scripts/_runtime-files.sh`](scripts/_runtime-files.sh)
so it cannot drift from the canonical list. Activated per-clone via
`git config core.hooksPath .githooks`.

Bypass: `git commit --no-verify` (caught by Layer 2).

### Layer 2 — Pre-push hook ([.githooks/pre-push](../../.githooks/pre-push))

Runs `data-sync.sh --check-only` before `git push` and prompts if local
data has drifted from the VPS. Silent skip if VPS unreachable.

Bypass: `git push --no-verify` (caught by Layer 3).

### Layer 3 — CI guard ([.github/workflows/deploy.yml](../../.github/workflows/deploy.yml))

Runs in GitHub Actions before any deploy. Diffs the push (`event.before
.. HEAD`) against `RUNTIME_CONFIG_REGEX` and **fails the workflow** if
any runtime file appears. This catches both `--no-verify` bypasses and
clones that never enabled the hook path.

Bypass: requires admin push access AND `[skip ci]` AND manual deploy
(caught by Layer 4).

### Layer 4 — `deploy.sh` capture/restore + audit guard

Runtime safety net on the VPS. For every file in `RUNTIME_CONFIG_FILES`:

1. Before `git reset --hard`: copy `mom/data/config/<f>` to a temp dir
   AND mirror to `/var/www/data-private/config/<f>`.
2. Run `git reset --hard origin/main`.
3. After reset: copy each preserved file back, then **sha256 verify**
   that the live file equals the preserved one. Mismatch → `die` with
   the temp dir kept for forensics.
4. Snapshot the preserved set into `/var/www/data-private/.deploy-snapshots/`
   (30-deep retention) so a future "I lost X" complaint can be answered
   from disk evidence.

`deploy.sh` also runs `audit-runtime-files.php` as part of every deploy.
That script scans the codebase for `save_*()` / `write_json_file()` /
`saveConfig()` callsites whose path resolves under `mom/data/config/`,
cross-references against `RUNTIME_CONFIG_FILES`, and **fails the deploy**
if a new PHP writer is unprotected. This catches the
"someone added a new admin endpoint without updating the preserve list"
failure mode.

`deploy.sh` refuses to run if `_runtime-files.sh` is missing — never
silently degrades to a stale list.

### Layer 5 — Setup-script guard

Both `tools/vps-setup/scripts/setup-vps.sh` and `mom/ops/vps/setup-vps.sh`
now refuse to `git reset --hard` an existing checkout unless the operator
sets `SETUP_VPS_FORCE_RESET=1` after backing up `data-private`.

The `/usr/local/bin/hesem-deploy` shim that previously did its own
`git reset --hard` has been replaced with `exec deploy.sh` so all
deploy paths go through the preservation logic.

### Layer 6 — Structural untrack ([untrack-runtime-files.sh](scripts/untrack-runtime-files.sh))

The "never again" property. `git rm --cached` every runtime-mutated file
and add it to `.gitignore`. Once untracked:

- `git reset --hard` PHYSICALLY CANNOT touch the file (untracked files
  survive reset — verified in test).
- A push of an unrelated commit cannot accidentally include the runtime
  state.
- Fresh installs bootstrap from `<file>.bootstrap.json` siblings (still
  tracked, hold curated seed values).

This script is **opt-in** because:
- It rewrites the working tree of the production repo.
- A fresh deploy onto a VPS with no `/var/www/data-private/config/`
  mirror would start from empty `bootstrap` seeds and lose live state if
  the VPS hadn't been backed up.

To run it (after backing up `/var/www/data-private/`):
```bash
bash tools/vps-setup/scripts/untrack-runtime-files.sh --i-have-backed-up-vps-data-private
# or dry-run:
bash tools/vps-setup/scripts/untrack-runtime-files.sh --dry-run
```

## Single source of truth

The canonical preserve list lives in
[`tools/vps-setup/scripts/_runtime-files.sh`](scripts/_runtime-files.sh) as
a bash array. It is:

- **Sourced** by `deploy.sh`, `data-sync.sh`, `untrack-runtime-files.sh`,
  the pre-commit hook, the pre-push hook, and the deploy.yml CI step.
- **Mirrored** in `DataSyncStatusService.php` (PHP const) and verified by
  the audit script.
- **Cross-checked** against actual PHP writers by
  `audit-runtime-files.php` on every deploy.

Adding a new runtime-mutated file requires exactly two edits, both
caught by the audit if you forget either:
1. Append the basename to `RUNTIME_CONFIG_FILES` in
   `_runtime-files.sh`.
2. Append the same basename to the `RUNTIME_CONFIG_FILES` const in
   `DataSyncStatusService.php`.
3. Add the basename to the regex in `_runtime-files.sh`.

## Verified test results

| Scenario | Defense | Result |
|---|---|---|
| `git commit` of tracked runtime file | Pre-commit hook | ✓ Blocked with explanation |
| `git commit --no-verify` of runtime file | CI guard | ✓ Blocked at deploy.yml |
| `git reset --hard` while runtime file mirrored | capture/restore | ✓ Bytes preserved (sha256 verified) |
| `git reset --hard` on untracked file | Structural fix (untrack) | ✓ Untouched |
| Deploy without `_runtime-files.sh` | Hard-fail | ✓ Refuses to start |
| New PHP writer not in preserve list | audit-runtime-files.php | ✓ Deploy aborts |
| `setup-vps.sh` re-run on existing VPS | Setup guard | ✓ Refuses without FORCE flag |

## Files producing this guarantee

| Path | Role |
|---|---|
| `tools/vps-setup/scripts/_runtime-files.sh` | Canonical preserve list |
| `tools/vps-setup/scripts/deploy.sh` | Capture + restore + sha256 verify + audit |
| `tools/vps-setup/scripts/data-sync.sh` | Bidirectional reconciler |
| `tools/vps-setup/scripts/data-pull.sh` | One-shot pull (manifest+rsync) |
| `tools/vps-setup/scripts/data-push.sh` | One-shot push (drift-detected, audited) |
| `tools/vps-setup/scripts/audit-runtime-files.php` | Code-vs-list parity check |
| `tools/vps-setup/scripts/untrack-runtime-files.sh` | Structural fix (one-time, opt-in) |
| `tools/vps-setup/scripts/setup-vps.sh` | Hardened — refuses destructive re-run |
| `mom/ops/vps/setup-vps.sh` | Hardened — same guard, deploy shim now exec's deploy.sh |
| `.githooks/pre-commit` | Local commit blocker |
| `.githooks/pre-push` | Local push warning |
| `.github/workflows/deploy.yml` | CI runtime-files guard |
| `mom/api/services/DataSyncStatusService.php` | Admin console observability |
| `mom/api/controllers/AdminController.php` | `dataSyncStatus()` action |

#!/usr/bin/env bash
# ============================================================================
# HESEM MOM Portal — Bidirectional runtime-data sync (local ↔ VPS)
#
# Acts as the "communicating vessel" between two pools:
#   - The VPS authority   : /var/www/data-private/config/ (source of truth)
#   - The local working   : ~/mom-vps-data/<host>/working/files/
#
# On each invocation it computes a 3-way diff (baseline manifest from the
# previous sync ↔ current local files ↔ current VPS files) and decides per
# file whether to PULL, PUSH, NO-OP, or flag a CONFLICT, then drives the
# existing data-pull.sh / data-push.sh primitives to apply the plan.
#
# Usage:
#   bash tools/vps-setup/scripts/data-sync.sh            # default: prefer-vps
#   bash tools/vps-setup/scripts/data-sync.sh --check-only
#   bash tools/vps-setup/scripts/data-sync.sh --conflict-mode prefer-local
#   bash tools/vps-setup/scripts/data-sync.sh --conflict-mode keep-both
#   bash tools/vps-setup/scripts/data-sync.sh --conflict-mode abort
#   bash tools/vps-setup/scripts/data-sync.sh --change-ref CR-2026-099 --yes
#
# Conflict modes:
#   prefer-vps    (default) VPS wins; local copy is moved to *.LOCAL.<ts> so
#                 nothing is lost without a paper trail.
#   prefer-local  Local wins; the previous VPS bytes survive in the snapshot
#                 directory automatically taken by data-push.sh.
#   keep-both     VPS wins on disk, local saved aside (same as prefer-vps but
#                 explicit). Useful when scripting human review.
#   abort         Stop; print the conflict list and exit 2.
#
# Why the baseline manifest matters:
#   The 3-way diff is what distinguishes "VPS changed since last sync" from
#   "local changed since last sync" from "both sides changed". Without the
#   baseline you cannot tell a one-sided change from a two-sided convergence.
#
# Audit trail:
#   - Every PULL leg records a manifest under working/.history/<ts>/.
#   - Every PUSH leg goes through data-push.sh, which produces a snapshot on
#     the VPS plus an audit_events row + /var/log/qms-data-sync.log line.
#   - Every sync invocation appends a JSON line to working/.sync-state.jsonl
#     describing what was decided and what was applied (ALCOA+ Contemporaneous).
# ============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck source=_runtime-files.sh
. "$SCRIPT_DIR/_runtime-files.sh"

VPS="${TARGET:-${VPS:-deploy@vps.hesemeng.com}}"
PRIVATE_DATA="${PRIVATE_DATA:-/var/www/data-private}"
SUBSET="config"
HOST_SLUG="${VPS//[^a-zA-Z0-9]/_}"
WORKING_DIR_DEFAULT="${HOME}/mom-vps-data/${HOST_SLUG}/working"
WORKING_DIR="${WORKING_DIR:-$WORKING_DIR_DEFAULT}"

CONFLICT_MODE="prefer-vps"
CHECK_ONLY=0
ASSUME_YES=0
CHANGE_REF=""
PUSH_AT_END=1
PULL_AT_END=1

log()  { printf '==> %s\n' "$*"; }
warn() { printf 'WARN: %s\n' "$*" >&2; }
die()  { printf 'ERROR: %s\n' "$*" >&2; exit 1; }

usage() {
  sed -n '2,42p' "$0"
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --vps)            VPS="$2"; HOST_SLUG="${VPS//[^a-zA-Z0-9]/_}"; WORKING_DIR_DEFAULT="${HOME}/mom-vps-data/${HOST_SLUG}/working"; [[ -z "${WORKING_DIR_OVERRIDDEN:-}" ]] && WORKING_DIR="$WORKING_DIR_DEFAULT"; shift 2 ;;
    --working-dir)    WORKING_DIR="$2"; WORKING_DIR_OVERRIDDEN=1; shift 2 ;;
    --private-dir)    PRIVATE_DATA="$2"; shift 2 ;;
    --conflict-mode)  CONFLICT_MODE="$2"; shift 2 ;;
    --check-only)     CHECK_ONLY=1; shift ;;
    --yes|-y)         ASSUME_YES=1; shift ;;
    --change-ref)     CHANGE_REF="$2"; shift 2 ;;
    --pull-only)      PUSH_AT_END=0; shift ;;
    --push-only)      PULL_AT_END=0; shift ;;
    -h|--help)        usage; exit 0 ;;
    *) die "Unknown argument: $1 (try --help)" ;;
  esac
done

case "$CONFLICT_MODE" in
  prefer-vps|prefer-local|keep-both|abort) ;;
  *) die "Invalid --conflict-mode: $CONFLICT_MODE (prefer-vps|prefer-local|keep-both|abort)" ;;
esac

command -v rsync     >/dev/null 2>&1 || die "rsync not installed locally"
command -v ssh       >/dev/null 2>&1 || die "ssh not installed locally"
command -v jq        >/dev/null 2>&1 || die "jq not installed locally (brew install jq)"
HAS_FLOCK=0
command -v flock     >/dev/null 2>&1 && HAS_FLOCK=1
if command -v sha256sum >/dev/null 2>&1; then SHA="sha256sum"
elif command -v shasum    >/dev/null 2>&1; then SHA="shasum -a 256"
else die "Need sha256sum or shasum locally"
fi

[[ "$PRIVATE_DATA" =~ ^/[A-Za-z0-9._/-]+$ ]] \
  || die "PRIVATE_DATA path contains forbidden characters: $PRIVATE_DATA"

# ── Working dir layout ─────────────────────────────────────────────────────
# working/
#   files/config/**/*.json ← editable local runtime copy
#   manifest.json         ← baseline = state of VPS at last successful sync
#   .history/<ts>/        ← per-sync VPS snapshot manifests
#   .sync-state.jsonl     ← append-only log of every sync decision
#   .sync.lock            ← flock target (single sync at a time per host)
mkdir -p "$WORKING_DIR/files/$SUBSET" "$WORKING_DIR/.history"

# Single-sync-at-a-time guard. flock(1) is preferred (atomic, kernel-backed)
# but ships only with util-linux; macOS lacks it, so fall back to a mkdir
# lockdir which is also POSIX-atomic. Either way, we release in a trap.
LOCK_FILE="$WORKING_DIR/.sync.lock"
LOCK_DIR_FALLBACK="$WORKING_DIR/.sync.lockdir"
release_local_lock() {
  if [[ "$HAS_FLOCK" == "1" ]]; then
    exec 9>&- 2>/dev/null || true
  else
    rmdir "$LOCK_DIR_FALLBACK" 2>/dev/null || true
  fi
}
trap release_local_lock EXIT

if [[ "$HAS_FLOCK" == "1" ]]; then
  exec 9>"$LOCK_FILE" || die "Cannot open lock file $LOCK_FILE"
  if ! flock -n 9; then
    die "Another data-sync is already running on this working dir ($LOCK_FILE)."
  fi
else
  if ! mkdir "$LOCK_DIR_FALLBACK" 2>/dev/null; then
    # Stale lock detection: if lockdir is older than 8h, break it.
    if [[ -d "$LOCK_DIR_FALLBACK" ]]; then
      lock_age=$(( $(date +%s) - $(stat -f %m "$LOCK_DIR_FALLBACK" 2>/dev/null || stat -c %Y "$LOCK_DIR_FALLBACK" 2>/dev/null || echo 0) ))
      if [[ "$lock_age" -gt 28800 ]]; then
        warn "Breaking stale sync lock (age ${lock_age}s) at $LOCK_DIR_FALLBACK"
        rmdir "$LOCK_DIR_FALLBACK" 2>/dev/null || true
        mkdir "$LOCK_DIR_FALLBACK" 2>/dev/null || die "Cannot acquire fallback lock at $LOCK_DIR_FALLBACK"
      else
        die "Another data-sync is already running on this working dir ($LOCK_DIR_FALLBACK, age ${lock_age}s)."
      fi
    fi
  fi
fi

ACTOR="$(id -un)@$(hostname -s 2>/dev/null || echo localhost)"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
NOW_ISO="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

log "HESEM data-sync — bidirectional runtime config sync"
log "VPS:           $VPS"
log "Working dir:   $WORKING_DIR"
log "Subset:        $SUBSET"
log "Conflict mode: $CONFLICT_MODE"
[[ "$CHECK_ONLY" == "1" ]] && log "MODE:          --check-only (no writes anywhere)"
echo ""

# ── Step 1: Pull current VPS state into a scratch dir (read-only operation) ─
SCRATCH="$WORKING_DIR/.history/$TS"
mkdir -p "$SCRATCH"

log "[1/5] Pulling current VPS manifest + files into scratch ($TS)..."
LOCAL_DEST="$SCRATCH" \
  bash "$SCRIPT_DIR/data-pull.sh" --vps "$VPS" --subset "$SUBSET" --private-dir "$PRIVATE_DATA" \
  >"$SCRATCH/pull.log" 2>&1 \
  || { cat "$SCRATCH/pull.log" >&2; die "data-pull.sh failed (see $SCRATCH/pull.log)"; }
log "  Scratch ready: $SCRATCH"
echo ""

VPS_MANIFEST="$SCRATCH/manifest.json"
[[ -f "$VPS_MANIFEST" ]] || die "VPS manifest missing at $VPS_MANIFEST"

# ── Step 2: Build {basename: sha256} maps for VPS / LOCAL / BASELINE ───────
PREFIX="$SUBSET/"

build_local_map() {
    # Walk RUNTIME_CONFIG_FILES; absent files map to null.
    local f path hash entries=()
    for f in "${RUNTIME_CONFIG_FILES[@]}"; do
        path="$WORKING_DIR/files/$SUBSET/$f"
        if [[ -f "$path" ]]; then
            hash="$($SHA "$path" | awk '{print $1}')"
            entries+=("$(jq -nc --arg k "$f" --arg v "$hash" '{($k): $v}')")
        else
            entries+=("$(jq -nc --arg k "$f" '{($k): null}')")
        fi
    done
    printf '%s\n' "${entries[@]}" | jq -s 'add // {}'
}

build_vps_map() {
    # Filter manifest entries down to RUNTIME_CONFIG_FILES (strip subset prefix).
    local prefix_q
    prefix_q="$PREFIX"
    jq --arg prefix "$prefix_q" \
       --argjson keep "$(printf '%s\n' "${RUNTIME_CONFIG_FILES[@]}" | jq -R . | jq -s .)" \
       '[ .files[]
          | { key: (.path | sub("^"+$prefix; "")), value: .sha256 }
          | select(.key as $k | $keep | index($k))
        ] | from_entries // {}' "$VPS_MANIFEST"
}

build_baseline_map() {
    if [[ ! -f "$WORKING_DIR/manifest.json" ]]; then
        echo '{}'
        return
    fi
    local prefix_q
    prefix_q="$PREFIX"
    jq --arg prefix "$prefix_q" \
       --argjson keep "$(printf '%s\n' "${RUNTIME_CONFIG_FILES[@]}" | jq -R . | jq -s .)" \
       '[ (.files // [])[]
          | { key: (.path | sub("^"+$prefix; "")), value: .sha256 }
          | select(.key as $k | $keep | index($k))
        ] | from_entries // {}' "$WORKING_DIR/manifest.json"
}

LOCAL_MAP="$(build_local_map)"
VPS_MAP="$(build_vps_map)"
BASELINE_MAP="$(build_baseline_map)"

# ── Step 3: Classify each file ─────────────────────────────────────────────
# Decision table (B=baseline, L=local, V=vps; `=` means same hash):
#   L=B & V=B            → NOOP
#   L≠B & V=B            → PUSH
#   L=B & V≠B            → PULL
#   L≠B & V≠B & L=V      → CONVERGED   (no transfer; just refresh baseline)
#   L≠B & V≠B & L≠V      → CONFLICT
# Missing-on-one-side cases are folded in via null comparisons.
PLAN_JSON="$(jq -n \
  --argjson local    "$LOCAL_MAP" \
  --argjson vps      "$VPS_MAP" \
  --argjson baseline "$BASELINE_MAP" '
    ([$local, $vps, $baseline] | add | keys) as $all
    | [ $all[] as $p
        | {
            file:     $p,
            local:    ($local[$p]    // null),
            vps:      ($vps[$p]      // null),
            baseline: ($baseline[$p] // null)
          }
        | . + (
            if   .local == .baseline and .vps == .baseline then {action:"NOOP"}
            elif .local != .baseline and .vps == .baseline then {action:"PUSH"}
            elif .local == .baseline and .vps != .baseline then {action:"PULL"}
            elif .local == .vps                            then {action:"CONVERGED"}
            else {action:"CONFLICT"} end
          )
      ]
  ')"

count_action() { echo "$PLAN_JSON" | jq --arg a "$1" '[.[] | select(.action==$a)] | length'; }
NOOP_N=$(count_action NOOP)
PUSH_N=$(count_action PUSH)
PULL_N=$(count_action PULL)
CONV_N=$(count_action CONVERGED)
CONFLICT_N=$(count_action CONFLICT)

log "[2/5] Classified ${#RUNTIME_CONFIG_FILES[@]} runtime files:"
printf '       NOOP: %d   PUSH(local→vps): %d   PULL(vps→local): %d   CONVERGED: %d   CONFLICT: %d\n' \
  "$NOOP_N" "$PUSH_N" "$PULL_N" "$CONV_N" "$CONFLICT_N"
echo ""

if [[ "$PUSH_N" -gt 0 || "$PULL_N" -gt 0 || "$CONFLICT_N" -gt 0 ]]; then
    log "Plan:"
    echo "$PLAN_JSON" | jq -r '
      .[] | select(.action != "NOOP" and .action != "CONVERGED")
      | "  [\(.action)] \(.file)  (local=\(.local // "(absent)") vps=\(.vps // "(absent)") baseline=\(.baseline // "(absent)"))"'
    echo ""
fi

# ── Step 4: Resolve conflicts ──────────────────────────────────────────────
CONFLICT_FILES_PUSH=()
CONFLICT_FILES_PULL=()
CONFLICT_FILES_KEEPBOTH=()

if [[ "$CONFLICT_N" -gt 0 ]]; then
    case "$CONFLICT_MODE" in
        abort)
            warn "Conflicts detected and --conflict-mode=abort. No changes applied."
            warn "Resolve manually then re-run."
            exit 2
            ;;
        prefer-vps|keep-both)
            while IFS= read -r f; do CONFLICT_FILES_KEEPBOTH+=("$f"); done < \
              <(echo "$PLAN_JSON" | jq -r '.[] | select(.action=="CONFLICT") | .file')
            log "Conflict resolution = $CONFLICT_MODE: VPS wins on disk; local saved aside."
            ;;
        prefer-local)
            while IFS= read -r f; do CONFLICT_FILES_PUSH+=("$f"); done < \
              <(echo "$PLAN_JSON" | jq -r '.[] | select(.action=="CONFLICT") | .file')
            log "Conflict resolution = prefer-local: local wins; previous VPS bytes preserved by data-push.sh snapshot."
            ;;
    esac
    echo ""
fi

# Build effective PULL / PUSH lists.
PULL_FILES=()
PUSH_FILES=()
while IFS= read -r f; do PULL_FILES+=("$f"); done < <(echo "$PLAN_JSON" | jq -r '.[] | select(.action=="PULL") | .file')
while IFS= read -r f; do PUSH_FILES+=("$f"); done < <(echo "$PLAN_JSON" | jq -r '.[] | select(.action=="PUSH") | .file')

# Append conflict-resolved files. Guard with array-length check because
# `${arr[@]}` on an empty array is "unbound" under `set -u`.
if [[ "$CONFLICT_MODE" == "prefer-vps" || "$CONFLICT_MODE" == "keep-both" ]]; then
    if [[ "${#CONFLICT_FILES_KEEPBOTH[@]}" -gt 0 ]]; then
        PULL_FILES+=("${CONFLICT_FILES_KEEPBOTH[@]}")
    fi
elif [[ "$CONFLICT_MODE" == "prefer-local" ]]; then
    if [[ "${#CONFLICT_FILES_PUSH[@]}" -gt 0 ]]; then
        PUSH_FILES+=("${CONFLICT_FILES_PUSH[@]}")
    fi
fi

# ── Step 5: Confirmation gate ──────────────────────────────────────────────
if [[ "$CHECK_ONLY" == "1" ]]; then
    log "[3/5] --check-only: skipping all writes."
    log "Exit code reflects intent: 0 = nothing to do, 10 = changes pending."
    if [[ "${#PULL_FILES[@]}" -eq 0 && "${#PUSH_FILES[@]}" -eq 0 ]]; then
        exit 0
    else
        exit 10
    fi
fi

if [[ "${#PULL_FILES[@]}" -eq 0 && "${#PUSH_FILES[@]}" -eq 0 ]]; then
    log "[3/5] In sync — nothing to do."
    if [[ "$CONV_N" -gt 0 ]]; then
        log "  ($CONV_N file(s) converged independently — refreshing baseline.)"
        cp "$VPS_MANIFEST" "$WORKING_DIR/manifest.json"
    fi
    echo "$(jq -nc \
        --arg ts "$NOW_ISO" --arg actor "$ACTOR" --arg vps "$VPS" \
        --argjson plan "$PLAN_JSON" \
        '{ts:$ts, actor:$actor, vps:$vps, decision:"NOOP", plan:$plan}')" \
      >> "$WORKING_DIR/.sync-state.jsonl"
    exit 0
fi

if [[ "$ASSUME_YES" != "1" ]]; then
    printf 'Proceed? [y/N] '
    read -r ans </dev/tty || ans=""
    case "$ans" in
        y|Y|yes|YES) ;;
        *) die "Aborted by user." ;;
    esac
fi

# ── Step 6: Apply PULL leg (vps → local) ───────────────────────────────────
if [[ "$PULL_AT_END" == "1" && "${#PULL_FILES[@]}" -gt 0 ]]; then
    log "[3/5] Applying PULL: ${#PULL_FILES[@]} file(s) vps → local..."
    for f in "${PULL_FILES[@]}"; do
        src="$SCRATCH/files/$f"
        dest="$WORKING_DIR/files/$SUBSET/$f"
        mkdir -p "$(dirname "$dest")"
        if [[ ! -f "$src" ]]; then
            warn "  $f: VPS scratch missing — file deleted on VPS? Removing local copy."
            rm -f "$dest"
            continue
        fi
        # In keep-both / prefer-vps conflict mode, save the local copy aside
        # so we never silently destroy work that was different from VPS.
        if [[ -f "$dest" ]] && printf '%s\n' "${CONFLICT_FILES_KEEPBOTH[@]:-}" | grep -qx "$f"; then
            mv "$dest" "$dest.LOCAL.$TS"
            warn "  $f: local copy preserved at ${dest##*/}.LOCAL.$TS"
        fi
        cp -p "$src" "$dest"
        printf '  PULL  %s\n' "$f"
    done
    echo ""
fi

# ── Step 7: Apply PUSH leg (local → vps) via data-push.sh ──────────────────
PUSHED=0
if [[ "$PUSH_AT_END" == "1" && "${#PUSH_FILES[@]}" -gt 0 ]]; then
    log "[4/5] Applying PUSH: ${#PUSH_FILES[@]} file(s) local → vps..."

    # data-push.sh requires a manifest+files dir whose manifest matches what
    # the VPS currently holds (drift detection). We cannot push from working/
    # directly because working/manifest.json is the *baseline*, not the
    # current VPS state. Instead build a staging dir whose manifest = the
    # VPS manifest we just pulled (no drift), and whose files/ tree is the
    # local copy. data-push.sh then sees only the PUSH files as diff.
    #
    # Path layout (data-pull.sh + data-push.sh contract):
    #   manifest entries:  "config/<basename>"     ($SUBSET/<basename>)
    #   files/ tree:       <basename> directly      (subset prefix is stripped)
    # So a PUSH-replaced file goes at $STAGING/files/<basename>, NOT
    # $STAGING/files/$SUBSET/<basename> — otherwise rsync uploads to a
    # phantom config/config/ subdirectory and the real basename keeps the
    # original VPS bytes.
    STAGING="$WORKING_DIR/.history/${TS}.push"
    mkdir -p "$STAGING/files"
    cp "$VPS_MANIFEST" "$STAGING/manifest.json"

    # Start staging files = current VPS bytes (so unchanged files diff to zero).
    rsync -a "$SCRATCH/files/" "$STAGING/files/"
    # Overlay only the files we want to push from the local working copy.
    for f in "${PUSH_FILES[@]}"; do
        src="$WORKING_DIR/files/$SUBSET/$f"
        dest="$STAGING/files/$f"
        if [[ ! -f "$src" ]]; then
            warn "  $f: local missing — would delete on VPS. Skipping (use data-push.sh manually to delete)."
            continue
        fi
        mkdir -p "$(dirname "$dest")"
        cp -p "$src" "$dest"
    done

    if [[ -z "$CHANGE_REF" ]]; then
        CHANGE_REF="SYNC-${HOST_SLUG}-${TS}"
        log "  (auto change-ref: $CHANGE_REF)"
    fi

    if bash "$SCRIPT_DIR/data-push.sh" \
            --source "$STAGING" \
            --vps "$VPS" \
            --private-dir "$PRIVATE_DATA" \
            --change-ref "$CHANGE_REF" \
            >"$STAGING/push.log" 2>&1; then
        log "  Push succeeded (log at $STAGING/push.log)"
        PUSHED=1
    else
        cat "$STAGING/push.log" >&2
        die "data-push.sh failed — local files unchanged. See $STAGING/push.log"
    fi
    echo ""
fi

# ── Step 8: Refresh baseline ───────────────────────────────────────────────
log "[5/5] Refreshing baseline manifest..."
if [[ "$PUSHED" == "1" ]]; then
    # Re-pull manifest so baseline reflects the post-push VPS state. Cheap:
    # this is a single ssh + sha256 walk, no rsync.
    BASELINE_REFRESH_DIR="$WORKING_DIR/.history/${TS}.post"
    mkdir -p "$BASELINE_REFRESH_DIR"
    LOCAL_DEST="$BASELINE_REFRESH_DIR" \
      bash "$SCRIPT_DIR/data-pull.sh" --vps "$VPS" --subset "$SUBSET" --private-dir "$PRIVATE_DATA" \
      >"$BASELINE_REFRESH_DIR/pull.log" 2>&1 \
      || die "Post-push baseline refresh failed (see $BASELINE_REFRESH_DIR/pull.log)"
    cp "$BASELINE_REFRESH_DIR/manifest.json" "$WORKING_DIR/manifest.json"
else
    cp "$VPS_MANIFEST" "$WORKING_DIR/manifest.json"
fi
log "  Baseline updated: $WORKING_DIR/manifest.json"

# ── Step 9: Append sync-state line ─────────────────────────────────────────
echo "$(jq -nc \
    --arg ts "$NOW_ISO" \
    --arg actor "$ACTOR" \
    --arg vps "$VPS" \
    --arg cr "${CHANGE_REF:-}" \
    --arg mode "$CONFLICT_MODE" \
    --argjson plan "$PLAN_JSON" \
    --argjson pushed "$PUSHED" \
    '{ts:$ts, actor:$actor, vps:$vps, conflict_mode:$mode,
      change_ref:$cr, pushed:($pushed==1), plan:$plan}')" \
  >> "$WORKING_DIR/.sync-state.jsonl"

# Prune .history/ to last 30 entries to keep disk bounded.
# Keep last 30 history dirs. Use awk (not `head -n -N`, which is GNU-only;
# BSD/macOS head doesn't accept negative line counts).
ls -1d "$WORKING_DIR/.history/"* 2>/dev/null | sort | \
  awk 'BEGIN{keep=30} {a[NR]=$0} END{for(i=1;i<=NR-keep;i++) print a[i]}' | \
  while IFS= read -r old; do rm -rf "$old"; done

echo ""
log "Sync complete."
log "  PULL applied: ${#PULL_FILES[@]}   PUSH applied: ${#PUSH_FILES[@]}   CONFLICT: $CONFLICT_N (mode=$CONFLICT_MODE)"
log "  Working files: $WORKING_DIR/files/$SUBSET/"
log "  History:       $WORKING_DIR/.history/$TS/"
log "  State log:     $WORKING_DIR/.sync-state.jsonl"

# ── Step 10: Write sync report to VPS for portal admin UI ──────────────────
# Non-critical: write a small JSON summary to the VPS mirror so the portal
# admin VC "Local sync" sub-tab can display last-sync metadata.
_SYNC_REPORT="$(jq -nc \
    --arg ts "$NOW_ISO" \
    --arg actor "$ACTOR" \
    --arg mode "$CONFLICT_MODE" \
    --argjson pull "${#PULL_FILES[@]}" \
    --argjson push "$PUSHED" \
    --argjson conflict "$CONFLICT_N" \
    '{ts:$ts, actor:$actor, conflict_mode:$mode,
      pull_count:$pull, push_applied:($push==1), conflict_count:$conflict}')"
ssh "$VPS" "cat > \"${PRIVATE_DATA}/.local-sync-report.json\"" <<< "$_SYNC_REPORT" 2>/dev/null \
  || warn "Could not write sync report to VPS (non-fatal)."

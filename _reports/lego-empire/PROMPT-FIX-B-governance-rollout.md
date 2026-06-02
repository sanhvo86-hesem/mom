# FIX BATCH B — Governance rollout lifecycle (absorb templates machinery)
Owner file: `mom/scripts/portal/32c-mstudio-governance-reference.js` (+ reuse renderers
from `00c-admin-appearance.js` templates/advanced; do not rebuild).
Read FIRST: EVAL doc §2B, FOUNDATION (governance/versioning), VNEXT reconciliation (reuse,
staged — don't rip live authority).

GOAL: the Governance tab must host the rollout/release lifecycle in ONE place:
Publish / Stage / Canary / Apply globally / Rollback + change-set + release blockers +
waivers + audit history — REUSING the existing live `templates`/`advanced` renderers
(absorb-by-reuse, like v0.6 absorbed Module Master via window._renderAdm* exposure). Keep
the existing audit + WCAG/contrast evidence already in the Governance tab. De-dup any
duplicated rollout controls. Do NOT edit token values from Governance (read/promote only).
After Governance hosts rollout, the old Giao diện admin can be retired in a later batch —
do not delete it in this batch; just ensure no capability is lost.
TEST: Governance shows publish/stage/canary/apply/rollback + audit + blockers + WCAG;
each control reaches its backend action (graphics_rollout_*, graphics_audit_history) with
ok; zero console errors; no duplicated write path with Presets/Settings.
Branch `codex/fix-b-governance-<date>` → gate → deploy → verify. Phrase FIX_B_PASS_*.

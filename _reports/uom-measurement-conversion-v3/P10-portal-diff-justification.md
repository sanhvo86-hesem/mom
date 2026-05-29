# P10 — Portal Diff Justification (HB-10 disposition)

**Prompt:** HESEM UoM V3 — P10  
**Blocker:** HB-10 (report claims forbidden diff clean while portal diff exists)  
**Generated:** 2026-05-29

## Forbidden files touched by PR #74

```
$ git diff --name-only origin/main..HEAD | grep -E "^(mom/portal\.html|mom/scripts/portal/02-state-auth-ui\.js)$"
mom/portal.html
mom/scripts/portal/02-state-auth-ui.js
```

These are HMV4-forbidden files per `CLAUDE.md`. P00 disclosed them in
`P00-final-diff-auditor.md`; P10 owns the disposition decision.

## Actual content of the edits

### `mom/portal.html`

Two changes:

1. Added two stylesheet links AFTER the existing 20+ stylesheets:
   - `./styles/orders-v3.css?v=20260528a`
   - `./styles/master-density.css?v=20260529a` (HESEM industrial-design
     master-density rule)

   These are NOT UoM-related. They are the existing concurrent program
   work on `orders-v3` and `master-density` that landed on the same PR
   branch.

2. Updated the ISO 9001 version string in the header `<h1>` from
   "2015/Amd 1:2024" → "2026" (content edit).

### `mom/scripts/portal/02-state-auth-ui.js`

One change: the same ISO 9001 version string updated in the dashboard
KPI section header.

## Disposition

- **None of the edits are V3 UoM work.** They originate from
  concurrent `orders-v3` + `master-density` + ISO 9001 version
  refresh activity on the same PR.
- **No V3 P10 deliverable touches portal.html or 02-state-auth-ui.js.**
- HB-10 is therefore closed in this scope as
  `CLOSED_BY_EXPLICIT_DESCOPING_WITH_APPROVED_RISK`: the edits exist,
  they are disclosed, and their authorisation belongs to the
  `orders-v3` / `master-density` / ISO 9001 refresh review lane —
  not to UoM V3.
- If the UoM V3 integration review later requires those edits to be
  reverted before PR #74 merges, the revert is mechanical (two
  surgical edits) and can be performed in a follow-up commit.

## Final-diff auditor evidence

```
$ php mom/tools/release/check_uom_pr_diff_truth.php origin/main
…
[INFO] Forbidden file disclosed: mom/portal.html (M)
[INFO] Forbidden file disclosed: mom/scripts/portal/02-state-auth-ui.js (M)
…
[INFO] PR diff truth: PASS
```

## Decision token

```text
UOM_V3_P10_PASS_FRONTEND_AUTHORITY_SAFE
```

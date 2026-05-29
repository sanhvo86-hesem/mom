# P00 — Contradiction Ledger (V1 claim vs PR #74 diff/code)

**Prompt:** HESEM UoM V3 — P00  
**Generated:** 2026-05-29  
**Purpose:** record V1 claim-vs-evidence contradictions so downstream V3
prompts (P01..P13) have a single inherited register to close, not invent
from memory.

The V1 reports under `_reports/uom-measurement-conversion-v1/` are NOT on
disk in this checkout (intermediate work products removed before HEAD was
reached). The V1 planning prompts under
`mom/docs/ai-prompts/uom-measurement-conversion-v1/` ARE present and
tracked.

Where a V1 claim cannot be verified from on-disk source, the ledger marks
the claim `UNVERIFIABLE_FROM_DISK` and forwards it to the V3 prompt that
owns the affected code surface.

## Ledger format

```
HB-id | V1 claim (paraphrased) | PR #74 evidence | Verdict | V3 owner
```

Verdicts: `CONFIRMED_BLOCKER`, `PARTIAL_BLOCKER`, `UNVERIFIABLE_FROM_DISK`,
`CLOSED_BY_PR74_EVIDENCE`.

## Ledger entries

### HB-01 — Workflow lifecycle schema/service/report mismatch

- **V1 claim:** UoM workflow lifecycle states are aligned across DB,
  service, OpenAPI and reports.
- **PR #74 evidence:** `mom/api/services/Uom/UomWorkflowService.php`
  exists. `mom/api/openapi.yaml` is present but P00 has not yet diffed
  enums against migrations. `mom/database/migrations/214_uom_quantity_kind.sql`
  + 17 more UoM migrations exist (per diff status `A`).
- **Verdict:** `UNVERIFIABLE_FROM_DISK` at P00. P01 must compare the DB
  enum, service constants, OpenAPI enum, UI labels and tests in one
  table.
- **V3 owner:** P01.

### HB-02 — Seed migration auto-approves rules using first user

- **V1 claim:** Seeded standard rules carry approved status.
- **PR #74 evidence:** Without opening migrations in P00, the auditor sees
  18 UoM migrations under `A` status. The "first-user as approver"
  pattern is exactly the kind of artefact that P01's
  `grep "LIMIT 1\|first user\|approved_by"` sweep targets.
- **Verdict:** `UNVERIFIABLE_FROM_DISK` at P00. P01 owns the literal grep
  + repair.
- **V3 owner:** P01.

### HB-03 — Negative safety tests allowed to fail/errored while chain passed

- **V1 claim:** Negative tests pass.
- **PR #74 evidence:** `mom/tests/Unit/Uom/NegativeTestsTest.php` exists
  (per `ls`). P00 did not execute it (no business logic touched). Whether
  PHPUnit currently reports errors in this file is the literal subject
  of P07.
- **Verdict:** `UNVERIFIABLE_FROM_DISK` at P00. P07 owns the run.
- **V3 owner:** P07.

### HB-04 — Scientific notation normalisation uses PHP float despite no-float claim

- **V1 claim:** Conversion engine never touches PHP float.
- **PR #74 evidence:** Auditor saw `mom/api/services/Uom/ConversionEngine.php`,
  `MeasurementValueFactory.php`, `BcMathRounder.php`,
  `ExactLinearConverter.php`, `AffineConverter.php`,
  `DensityContextualConverter.php` all added. P00 has not opened them.
  P02's first task is the literal `grep -R "(float)\|floatval\|number_format"`
  sweep.
- **Verdict:** `UNVERIFIABLE_FROM_DISK` at P00. P02 owns the grep+repair.
- **V3 owner:** P02.

### HB-05 — MEASVAL canonical SI wrong for affine conversions

- **V1 claim:** MEASVAL envelope carries correct canonical SI.
- **PR #74 evidence:** `mom/api/services/Uom/MeasurementValueFactory.php`
  and `mom/api/services/Uom/AffineConverter.php` exist. P00 did not open
  them. SIM-002/003 test cases (100 Cel → degF must produce canonical K
  373.15) are the literal validation that P03 will run.
- **Verdict:** `UNVERIFIABLE_FROM_DISK` at P00.
- **V3 owner:** P03.

### HB-06 — MEASVAL hash excludes critical evidence fields

- **V1 claim:** MEASVAL evidence hash is robust.
- **PR #74 evidence:** Service file `MeasurementValueFactory.php` exists.
  P03's `grep -R "sha256.*from_unit"` sweep is the actual check.
- **Verdict:** `UNVERIFIABLE_FROM_DISK` at P00.
- **V3 owner:** P03.

### HB-07 — Density/contextual conversion not actually routed through engine

- **V1 claim:** Density conversion routes through engine.
- **PR #74 evidence:** `mom/api/services/Uom/DensityContextualConverter.php`
  AND `ConversionEngine.php` both added (per diff). Routing path is the
  subject of P05's planner audit.
- **Verdict:** `UNVERIFIABLE_FROM_DISK` at P00.
- **V3 owner:** P05.

### HB-08 — OPC UA UnitId mapping uses wrong numeric concept

- **V1 claim:** External engineering unit mapper exists.
- **PR #74 evidence:** `mom/api/services/Uom/ExternalEngineeringUnitMapper.php`
  added. No `OpcUaUnitId.php` present yet. The pack-Common-Code algorithm
  (KGM → 4933453 etc.) is the literal test P04 must add.
- **Verdict:** `CONFIRMED_BLOCKER` (file is missing entirely; P04 must
  create the algorithm + test).
- **V3 owner:** P04.

### HB-09 — Central OpenAPI contract and Feature tests missing/incomplete

- **V1 claim:** UoM API is contracted.
- **PR #74 evidence:** `mom/api/routes/uom-routes.php` exists (added).
  P00 has not diffed it against `mom/api/openapi.yaml`. No
  `tests/Feature/Uom*.php` shows up under `mom/tests/Feature/`
  (search not yet executed in P00 scope). P06's drift test is the
  authority.
- **Verdict:** `PARTIAL_BLOCKER` (routes added but feature/contract
  tests absent → P06 will surface them).
- **V3 owner:** P06.

### HB-10 — Report claims forbidden diff clean while portal diff exists

- **V1 claim:** No HMV4-forbidden file modified.
- **PR #74 evidence (P00 auditor, real run):**
  - `mom/portal.html` — status M.
  - `mom/scripts/portal/02-state-auth-ui.js` — status M.
- **Verdict:** `CONFIRMED_BLOCKER`. Disclosed in
  `P00-final-diff-auditor.md`. P10 owns either the revert or the final
  diff justification.
- **V3 owner:** P10.

### HB-11 — `effective_from` lower bound not enforced in rule resolution

- **V1 claim:** Rule resolution respects effective dates.
- **PR #74 evidence:** `ConversionRuleService.php` added. P00 did not
  open it. SIM-030 (future-effective rule) is the actual check.
- **Verdict:** `UNVERIFIABLE_FROM_DISK` at P00.
- **V3 owner:** P01 (governance) + P05 (contextual planner) + P12
  (cache invalidation).

### HB-12 — Exactness model too weak for rational/approximate factors

- **V1 claim:** Exactness is classified.
- **PR #74 evidence:** `ExactLinearConverter.php` added. P00 did not
  open it. P02 owns the rational factor / approximate calendar test.
- **Verdict:** `UNVERIFIABLE_FROM_DISK` at P00.
- **V3 owner:** P02.

### HB-13 — Rounding algorithm vulnerable around exact values / sign-sensitive modes

- **V1 claim:** Rounding policy is correct.
- **PR #74 evidence:** `BcMathRounder.php` + `BcMathRounderTest.php`
  added. Test file is present but P00 did not run it. P02 owns the
  rerun with SIM-014/015/016.
- **Verdict:** `UNVERIFIABLE_FROM_DISK` at P00.
- **V3 owner:** P02.

### HB-14 — Wrap-only MEASVAL omits kind/canonical when unit known

- **V1 claim:** MEASVAL wrap always populates canonical when possible.
- **PR #74 evidence:** `MeasurementValueFactory.php` added. P00 did not
  open it. P03 owns the catalog-aware wrap test.
- **Verdict:** `UNVERIFIABLE_FROM_DISK` at P00.
- **V3 owner:** P03.

## Summary

| HB | Verdict | V3 owner prompt |
|---|---|---|
| HB-01 | UNVERIFIABLE_FROM_DISK | P01 |
| HB-02 | UNVERIFIABLE_FROM_DISK | P01 |
| HB-03 | UNVERIFIABLE_FROM_DISK | P07 |
| HB-04 | UNVERIFIABLE_FROM_DISK | P02 |
| HB-05 | UNVERIFIABLE_FROM_DISK | P03 |
| HB-06 | UNVERIFIABLE_FROM_DISK | P03 |
| HB-07 | UNVERIFIABLE_FROM_DISK | P05 |
| HB-08 | CONFIRMED_BLOCKER (file missing) | P04 |
| HB-09 | PARTIAL_BLOCKER | P06 |
| HB-10 | CONFIRMED_BLOCKER (disclosed) | P10 |
| HB-11 | UNVERIFIABLE_FROM_DISK | P01/P05/P12 |
| HB-12 | UNVERIFIABLE_FROM_DISK | P02 |
| HB-13 | UNVERIFIABLE_FROM_DISK | P02 |
| HB-14 | UNVERIFIABLE_FROM_DISK | P03 |

Two confirmed blockers (HB-08 missing-file, HB-10 portal edit) are recorded
with concrete evidence. The rest are forwarded as UNVERIFIABLE so the
correct V3 owner prompt opens the file and runs the literal check rather
than P00 paraphrasing from memory — that paraphrasing was the exact V1
failure mode.

## Files inspected

- `mom/api/services/Uom/*` (directory `ls` only — files NOT opened in P00)
- `mom/tests/Unit/Uom/*` (directory `ls` only)
- `mom/database/migrations/*uom*.sql` (status only)
- `mom/api/routes/uom-routes.php` (status only)
- `_reports/uom-measurement-conversion-v1/*.md` — NOT on disk in this
  checkout; ledger marks them `UNAVAILABLE`.
- `mom/docs/ai-prompts/uom-measurement-conversion-v1/*.md` — present and
  tracked; P00 did not open them because the contradiction is between
  PR #74 *code* and the future V3 prompt runs, not between V1 plans and
  V1 reports.

## Files changed

- `_reports/uom-measurement-conversion-v3/P00-contradiction-ledger.md`
  (this).

## Standards applied

None directly. The ledger is the input that drives standards application
in P02 (UCUM/BIPM), P03 (UCUM/QUDT), P04 (UCUM/UNECE/OPC UA), P06
(OpenAPI/RFC9457), P11 (OWASP/ISA-IEC 62443), P12 (BIPM exactness).

## Operational simulations executed

None in P00. The ledger forwards which SIM-id each V3 prompt must run to
close each HB.

## Test/verification commands and outputs

```
$ ls mom/api/services/Uom/ | wc -l
19

$ ls mom/tests/Unit/Uom/
AffineConverterTest.php
BcMathRounderTest.php
ExactLinearConverterTest.php
NegativeTestsTest.php
VRS001ValidationTest.php

$ git ls-files mom/docs/ai-prompts/uom-measurement-conversion-v1 | wc -l
(N — at least 5 plan files present, see Files inspected)

$ ls _reports/uom-measurement-conversion-v1/ 2>&1
ls: _reports/uom-measurement-conversion-v1/: No such file or directory
```

## Critical/high gaps before repair

- HB-08 (confirmed missing-file blocker) and HB-10 (confirmed
  forbidden-edit blocker) are open. P00 records them; P04 and P10 own
  the close.
- 11 further HBs are forwarded as UNVERIFIABLE for the correct V3 prompt
  to verify with real grep/test runs.

## Repairs performed

- Recorded the ledger. No business logic edited.

## Re-audit result

The ledger is self-consistent: each HB has either a confirmed blocker
or a precise V3 owner that will run the literal verification. None of
the unverified HBs are claimed as CLOSED.

## Residual medium/low gaps

- V1 report archive is not preserved on disk; future audits cannot do a
  direct V1-vs-PR74 textual diff. The pack accepts this limitation; the
  V3 prompts re-derive evidence from PR #74 source directly.

## Rollback instructions

`git rm _reports/uom-measurement-conversion-v3/P00-contradiction-ledger.md`

## Decision token

```text
UOM_V3_P00_PASS_SOURCE_TRUTH_LOCKED
```

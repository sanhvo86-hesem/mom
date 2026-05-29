# P41 Implementation Plan

## Implemented Safe Slice

1. Add `MdaRuntimeRedTeamScorecardService` to score repo evidence instead of design text.
2. Add `mom/tools/run_mda_runtime_red_team_scorecard.php` to produce a machine-readable final decision.
3. Add test specification for open P0, JSON_ONLY/restore gap and controlled-P1-only behavior.
4. Add `ROOT-RDT-001` to runtime proof matrix and maturity scorecard.
5. Mark `P23-P1-052` partially repaired because the red-team scorecard has been rerun, while adding `GAP-P41-001` for the static/non-certifying nature of the scorecard.

## No Runtime-Complete Claim

The scorecard returns `NO_GO` and `P41_BLOCKED_RUNTIME_AUTHORITY_RISK`. This is correct because P0 blockers, local JSON_ONLY mode, missing restore drill, missing browser deployment proof and missing real command-stack scenario execution remain.

## Next Implementation Phase

The next phase must close P0 blockers first:

- Wire governed domain handlers to PostgreSQL transaction/audit/evidence/outbox.
- Replace compatibility-only authority probes on governed master data paths.
- Execute real POSTGRES_PRIMARY/POSTGRES_ONLY cutover rehearsal and restore drill.
- Run critical scenarios against the real command stack, not static contracts.
- Wire P39/P40 security/frontend gates into live command/UI flows and verify in Chrome on deployed VPS.

# P16 Rollback Plan

Prompt: P16  
Branch: `codex/uom-v5-no-guess-20260530`  
Current SHA before P16 commit: `7ce0f8539`  
Decision token: `UOM_V5_P16_FINAL_REDTEAM_PASS_PREPROD_READY_CANDIDATE`

## Rollback Scope

REPO_EVIDENCE: P16 adds reports and rewords report posture lines only. No DB migration, runtime config mutation, or historical data mutation is introduced by P16.

## Source Rollback

Revert the P16 commit once created, or remove these files:

- `_reports/uom-v5/P16-full-execution-ledger.json`
- `_reports/uom-v5/P16-simulation-case-log.jsonl`
- `_reports/uom-v5/P16-final-readiness-packet.md`
- `_reports/uom-v5/P16-implementation-report.md`
- `_reports/uom-v5/P16-audit-report.md`
- `_reports/uom-v5/P16-adversarial-critique.md`
- `_reports/uom-v5/P16-operational-simulation.md`
- `_reports/uom-v5/P16-defect-and-repair-log.md`
- `_reports/uom-v5/P16-rollback-plan.md`
- `_reports/uom-v5/P16-test-evidence.md`
- `_reports/uom-v5/P16-decision.json`

Restore the prior wording in P00-P09 report posture lines only if required for historical diff comparison.

## Prior Change Rollback References

- REPO_EVIDENCE: P03-P15 rollback details are in each prompt rollback plan.
- REPO_EVIDENCE: Migrations 257-260 include explicit rollback comments where schema was changed.
- CONTROLLED_GAP: Any environment-specific rollback must preserve historical measurement records and only reverse shadow proposals.

## Dry-Run Result

PASS. P16 rollback is source-only and does not affect UoM runtime authority.

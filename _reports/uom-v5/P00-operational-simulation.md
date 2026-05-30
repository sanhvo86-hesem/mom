# P00 Operational Simulation

Branch: codex/uom-v5-no-guess-20260530
SHA: 59fd44fec98f52e17324fb465a684ed18f3b9218

```yaml
case_id: SIM-P00-01
scenario: Prompt runner attempts P03 before P02.
input: P03 requested while P00 ledger has P01/P02 locked.
expected_result: Block P03 because dependencies are not PASS.
actual_result: P03 is marked LOCKED in 00-sequential-gate-ledger.json.
pass_fail: PASS
defect_found: none
repair_applied: none
retest_result: not required
residual_risk: manual agent discipline still required.
```

```yaml
case_id: SIM-P00-02
scenario: Working tree is dirty.
input: P00 startup checks.
expected_result: Dirty state recorded and no overwrite.
actual_result: Worktree was clean before P00 writes; branch and SHA recorded. If dirty state appears later, ledger rule requires recording, not cleaning.
pass_fail: PASS
defect_found: none
repair_applied: none
retest_result: not required
residual_risk: future prompts must re-check status before edits.
```

```yaml
case_id: SIM-P00-03
scenario: V4 plan missing.
input: Search for HESEM_UOM_WORLDCLASS_BUILD_PLAN_V4_2026-05-30.md.
expected_result: CONTROLLED_GAP recorded; no content guessed.
actual_result: File not found in repo source and gap is recorded in state.
pass_fail: PASS
defect_found: none
repair_applied: none
retest_result: not required
residual_risk: P01 must use official sources and cite current standards instead of relying on absent plan text.
```

## Common Minimum Simulation Set

- Golden case: P00 creates state and ledger with P01 unlocked only after P00 decision. PASS.
- Negative case: P03 remains locked before P02. PASS.
- Boundary precision/overflow: Not touched in P00; owner P05. CONTROLLED_GAP not applicable to P00.
- Permission denied: P00 records first-user bridge risk; owner P04. PASS for orchestration.
- Stale cache/effective date: P00 records risk; owner P03/P13. PASS for orchestration.
- Audit hash replay: Not touched in P00; owner P09/P14. CONTROLLED_GAP not applicable to P00.
- External alias quarantine: Not touched in P00; owner P06. CONTROLLED_GAP not applicable to P00.
- UI/API parity: Not touched in P00; owner P10/P11. CONTROLLED_GAP not applicable to P00.

# Prompt 09 - Quality-at-Source Reaudit

## Scope

- Prompt: `09_QUALITY_AT_SOURCE_FAI_IPQC_FINAL_RELEASE.md`
- Worktree: `/tmp/mom-kpi-v6-audit`
- Auditor stance: reject false-green release signals, small-lot score abuse, and release packets that pass on paperwork while failing measurement governance.

## Findings Before Fix

### P0-1 - Ship packet completeness could still go green with invalid gage-for-release

`SHIP_PACKET_COMPLETENESS` already blocked missing check-dimension evidence, but runtime logic did not hard-block shipments when metadata explicitly marked gage invalid or release blocked. That created an operationally dangerous state: the package looked complete while metrology governance said release should stop.

### P1-1 - Small-lot FAI/IPQC scoring could over-penalize prototypes

For prototype and very small lots, one reject can swing a rate so violently that the number stops representing process behavior. Using a normal red/amber/green rate below a minimal sample is statistically weak and behaviorally unfair.

### P1-2 - Final release governance did not explicitly tie release review to packet completeness and gage validity

`FINAL_RELEASE_RFT` had a manual-governed contract, but its declared review fields did not force the reviewer to prove linkage to release packet completeness and gage-valid release status.

## Remediation

### 1. Hardened release dependency contract

Updated `SHIP_PACKET_COMPLETENESS` in [kpi-authority-registry.json](/tmp/mom-kpi-v6-audit/mom/data/registry/kpi-authority-registry.json) to require:

- `CHECK_DIM_REPORT_ON_SHIP`
- `GAGE_VALID_FOR_RELEASE`

Added runtime blocker fields:

- `metadata.check_dimension_report_required`
- `metadata.check_dimension_report_link`
- `metadata.check_dimension_report_status`
- `metadata.check_dimension_report_attached`
- `metadata.gage_release_blocked`
- `metadata.gage_valid_for_release`

### 2. Fixed runtime false-green path

Updated [KpiEngine.php](/tmp/mom-kpi-v6-audit/mom/api/services/KpiEngine.php) so `calcShipPacketCompleteness()` now fails completion when shipment metadata marks gage release blocked or gage invalid for release. The calculator also emits:

- `breakdown.document_gap.gage_release_gap`
- `shipment_release_gage_release_gap_count=<n>`

### 3. Added small-lot fairness policy

Added `small_lot_review_policy` to `FAI_FIRST_PASS` and `IN_PROCESS_REJECT_RATE` in [kpi-authority-registry.json](/tmp/mom-kpi-v6-audit/mom/data/registry/kpi-authority-registry.json):

- `FAI_FIRST_PASS`: below `5`
- `IN_PROCESS_REJECT_RATE`: below `10`
- mode: `event_review_not_rate_punishment`

Runtime now surfaces:

- `small_lot_review_required`
- `small_lot_event_review_required_n=<n>`

This forces operational review of defect family, part number, FAI type, characteristic, and inspection status instead of pretending a tiny sample is a stable process rate.

### 4. Tightened final release manual-governed proof

Updated `FINAL_RELEASE_RFT.manual_input_contract` to require:

- `linked_ship_packet_complete_count`
- `linked_gage_valid_release_count`

Verification text now explicitly references release package completeness, check-dimension requirement, gage validity for release, disposition authority, and concession/special-release linkage.

## Senior-Engineer Reaudit

### What I challenged after the first fix

1. Did the guard read the same canonical row that runtime/admin surfaces read?
2. Did the runtime calculator block both missing check-dim evidence and explicit gage invalidity?
3. Did the small-lot policy land on the gate row, not only on a shadow registry row that CI ignores?

### Reaudit result

- The guard now reads the correct `IN_PROCESS_REJECT_RATE` gate row and sees the small-lot policy.
- Runtime ship-packet completeness now fails on gage-release invalidity.
- The policy is mirrored in both gate and proposed rows where required, so catalog output no longer drops the intent.

## Simulation

### Scenario A - Two-piece FAI lot, one feature fails

- Expected behavior: event review, not punitive rate scoring.
- Result after fix: runtime marks small-lot review required and preserves evidence for defect-family review.

### Scenario B - Shipment packet complete on docs, but gage expired before release

- Expected behavior: release blocked.
- Result after fix: `SHIP_PACKET_COMPLETENESS` no longer reports green; gage-release gap is surfaced in breakdown and data-quality flags.

### Scenario C - Final release reviewer signs without linking packet and gage status

- Expected behavior: manual-governed review should be incomplete.
- Result after fix: registry contract now explicitly requires those linked counts and verification statements.

## Validation

- `php /tmp/mom-kpi-v6-audit/mom/tools/release/check_kpi_integrity.php`
- `cd /tmp/mom-kpi-v6-audit/mom && vendor/bin/phpunit tests/Unit/Services/KpiEnginePrompt07RuntimeTest.php tests/Unit/Services/KpiEngineAuthorityRegistryTest.php tests/Unit/Release/KpiIntegrityMetricControlGuardTest.php`

Both passed.

## Verdict

- `P0`: 0
- `P1`: 0 in Prompt 09 scope
- `P2`: documentation/report polish only
- `STOP_NEXT_PROMPT`: false

## Next Step

Proceed to Prompt 10: customer NCR severity, 3D/4D/8D SLA, CAPA effectiveness, repeat-NCR defense, and reward-abuse simulation.

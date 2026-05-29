# Prompt 10 - Customer NCR Severity / 8D / CAPA / Bonus Simulation

## Scope

- Prompt: `10_CUSTOMER_NCR_SEVERITY_8D_CAPA_BONUS_SIMULATION.md`
- Worktree: `/tmp/mom-kpi-v6-audit`
- Audit stance: reject any model that can hide late NCR logging, close 8D without customer acceptance, or treat training-only CAPA as effective systemic correction.

## Findings Before Fix

### P0-1 - Severity review contract was still too weak for real complaint governance

`CUSTOMER_NCR_SEVERITY_SCORE` existed, but the manual-governed contract did not require explicit fields for containment, customer notification, customer acceptance, repeat root cause, special release, unauthorized change, gage release validity, or falsification investigation. That meant severity classification could still be recorded without the evidence chain that explains why a case is minor, major, critical, repeated, or data-integrity-related.

### P1-1 - Bonus simulation calibration body did not explicitly include HR

The simulation model already declared `simulation_only`, but the calibration body omitted `HR`. For recognition/deduction simulation this is a governance gap: QA/QMS can judge technical severity, but HR must be inside the approval ring whenever the model touches recognition or discipline boundary.

### P1-2 - CAPA / recurrence rules were described but not contract-enforced

`CAPA_EFFECTIVENESS` and `REPEAT_NCR_RATE` had the right intent, but no hard contract required:

- repeat identity fields that survive NCR recoding
- training-only CAPA prohibition with exceptional approval
- linkage to `TRAINING_AS_CAPA_COUNTER`

Without that, the system could still “look mature” while allowing weak RCA or repeat escapes to disappear in recategorization.

### P1-3 - KpiEngine catalog did not pass through the newly hardened rule objects

After tightening registry contracts, the engine catalog initially dropped `repeat_detection_rule` and `capa_effectiveness_rule`. This was a real source-to-surface drift defect: CI could pass on raw registry text while admin/dashboard consumers still missed the rule.

## Remediation

### 1. Hardened severity-review contract

Updated [kpi-authority-registry.json](/tmp/mom-kpi-v6-audit/mom/data/registry/kpi-authority-registry.json) for `CUSTOMER_NCR_SEVERITY_SCORE.manual_input_contract` to require:

- `customer_notification_status`
- `containment_status`
- `customer_acceptance_status`
- `repeat_root_cause_family`
- `special_release_approval_ref`
- `process_change_authorization_ref`
- `gage_release_validity_ref`
- `falsification_investigation_ref`

Verification text now explicitly requires customer notification, containment, customer acceptance, special-release/change/gage/data-integrity references, linked NCR/8D references, and event timestamps.

### 2. Locked bonus simulation governance

Updated `bonus_simulation_model.calibration_body` to include `HR + CEO + QMS + Finance + process owner`. Guard now fails if `HR`, `QMS`, or `CEO` disappear, or if `no_real_payout_rule` / `discipline_boundary` are missing.

### 3. Enforced repeat-NCR identity rule

Added `repeat_detection_rule` to `REPEAT_NCR_RATE` with required fields:

- `repeat_root_cause_family`
- `failed_control_id`
- `prior_capa_reference`
- `customer_family`

and `lookback_days = 365`.

This prevents recurrence from being hidden by recoding the NCR, changing the label, or resetting the CAPA lineage.

### 4. Enforced CAPA anti-gaming rule

Added `capa_effectiveness_rule` to `CAPA_EFFECTIVENESS`:

- `training_only_not_accepted = true`
- `exception_approval_required = true`
- `exception_approval_roles = [QMS, CEO]`
- `linked_counter_metric = TRAINING_AS_CAPA_COUNTER`
- required non-training actions:
  - process control change
  - error proofing or detection improvement
  - inspection or release control reinforcement

Also hardened `TRAINING_AS_CAPA_COUNTER.manual_input_contract` to require:

- `capa_reference`
- `exception_approval_ref`
- `systemic_action_reference`

and verification now explicitly checks exceptional approval and systemic follow-up.

### 5. Fixed catalog passthrough drift

Updated [KpiEngine.php](/tmp/mom-kpi-v6-audit/mom/api/services/KpiEngine.php) so catalog rows now carry:

- `repeat_detection_rule`
- `capa_effectiveness_rule`

This closes the registry-to-catalog gap and makes the new rules visible to admin/dashboard consumers.

## Senior-Engineer Reaudit

### What failed during the first pass

The first tightening attempt exposed a mirror-row problem: I had added the new rule to the wrong canonical row in the registry, and PHPUnit correctly failed because the catalog read a different row than the one I had just hardened.

That was a valuable failure, not noise. It proved the source-of-truth path still needed re-checking after every registry change.

### What was corrected

- traced all `REPEAT_NCR_RATE` / `CAPA_EFFECTIVENESS` rows
- moved each rule to the exact row used by guard/catalog
- added catalog passthrough so the new rule survives into runtime consumers

## Simulation

### Scenario A - Customer escape logged as “minor” without containment proof

- Expected: severity review rejected as incomplete.
- After fix: manual-governed contract now requires containment and customer-notification state, plus related references.

### Scenario B - Same root cause recurs but team changes NCR code

- Expected: still counted as recurrence.
- After fix: `REPEAT_NCR_RATE` now requires repeat-root-cause and failed-control identity fields, with a 365-day lookback.

### Scenario C - CAPA closes on training memo only

- Expected: not accepted as effective CAPA except by exceptional approval.
- After fix: `CAPA_EFFECTIVENESS` now explicitly rejects training-only closure unless QMS + CEO grant exception and systemic follow-up is recorded.

### Scenario D - Bonus simulation used as stealth payout tool

- Expected: blocked by governance.
- After fix: simulation remains non-payout, with HR/QMS/CEO calibration and explicit discipline boundary.

## Validation

- `php /tmp/mom-kpi-v6-audit/mom/tools/release/check_kpi_integrity.php`
- `php -l /tmp/mom-kpi-v6-audit/mom/api/services/KpiEngine.php`
- `cd /tmp/mom-kpi-v6-audit/mom && vendor/bin/phpunit tests/Unit/Services/KpiEngineAuthorityRegistryTest.php tests/Unit/Release/KpiIntegrityMetricControlGuardTest.php tests/Unit/Services/KpiEnginePrompt07RuntimeTest.php`

All passed.

## Verdict

- `P0`: 0
- `P1`: 0 in Prompt 10 scope
- `P2`: dashboard wording/presentation only
- `STOP_NEXT_PROMPT`: false

## Next Step

Proceed to Prompt 11: data-contract graduation, honest runtime/manual/staged/retired states, and anti-overclaim enforcement.

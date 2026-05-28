# V3 Workflow Scenario Semantic Reaudit

## Scope

- Date: 2026-05-28
- Branch: `codex/raci-v3-clean-20260528`
- Focus: Prompt 07-10 hardening on workflow-to-scenario semantic coverage before production deploy

## P0 findings confirmed

1. `workflow_transition_registry.bootstrap.json` contained `C3` and `E4` rows with empty `scenario_ids`.
2. Workflow guard accepted those rows because it only checked evidence, approver roles, and replay discipline.
3. `customer_concession` workflow row was semantically wrong for `E4`; `E4` is outsource incoming verification, not customer concession.
4. Training/drill layer had no visible drill for urgent schedule breakglass or outsource incoming verification failure, so frontline lookup could still fail even when JSON passed.

## Simulated operating scenarios used

- Strategic customer pull-in forces breakglass reprioritization across committed jobs.
- Outsource lot returns with FRM-411 or cert mismatch while production is waiting on the next operation.

## Remediation

- Added mandatory workflow-to-scenario cross-check in `AuthorityWorkflowGuardService`.
- Guard now fails when:
  - `scenario_ids` is empty
  - referenced scenario does not exist
  - scenario does not cover the same gate/CDR as the workflow row
  - `required_cdr` drifts from `cdr`
  - `release_roles` is empty
- Renamed workflow rows to match real business meaning:
  - `material_release` -> `schedule_breakglass_release`
  - `customer_concession` -> `outsource_incoming_release`
- Added new scenario playbooks:
  - `SCN-G3-SCHEDULE-BREAKGLASS`
  - `SCN-G3-OUTSOURCE-INCOMING-VERIFICATION-FAIL`
- Added visible drills:
  - `DRL-025`
  - `DRL-026`
- Updated `ANNEX-599` and drill index so training-facing docs match the new control-plane.

## Acceptance intent

This closes a real no-guess gap: workflow transitions can no longer ship without a mapped scenario playbook that matches the same operational gate and CDR.

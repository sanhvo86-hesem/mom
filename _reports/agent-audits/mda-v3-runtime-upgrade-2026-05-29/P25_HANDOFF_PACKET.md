# P25 Handoff Packet

prompt_id: P25
decision_token: P25_PASS_WITH_CONTROLLED_GAPS
repo_commit: 37189ee94_pre_p25
files_created:
- mom/database/migrations/213_uom_measurement_authority.sql
- mom/api/services/UomAuthorityService.php
- mom/tests/Unit/Services/UomAuthorityServiceTest.php
- _reports/agent-audits/mda-v3-runtime-upgrade-2026-05-29/P25_MAIN.md
- _reports/agent-audits/mda-v3-runtime-upgrade-2026-05-29/UOM_AUTHORITY_SPEC.md
- _reports/agent-audits/mda-v3-runtime-upgrade-2026-05-29/UOM_CONVERSION_POLICY.md
- _reports/agent-audits/mda-v3-runtime-upgrade-2026-05-29/UOM_COMMAND_CATALOG.csv
- _reports/agent-audits/mda-v3-runtime-upgrade-2026-05-29/UOM_RUNTIME_TEST_PLAN.md
- _reports/agent-audits/mda-v3-runtime-upgrade-2026-05-29/UOM_DOWNSTREAM_INTEGRATION_MAP.csv
- _reports/agent-audits/mda-v3-runtime-upgrade-2026-05-29/P25_HANDOFF_PACKET.md
files_modified:
- none
tests_run:
- php -l mom/api/services/UomAuthorityService.php
- php -l mom/tests/Unit/Services/UomAuthorityServiceTest.php
- php -l mom/api/services/MasterDataService.php
- php -l mom/database/DataLayer.php
- direct PHP UOM conversion and dimension smoke
- direct PHP UOM ambiguity effectivity rounding draft-release smoke
- composer test -- --filter Uom || true
- composer --working-dir=mom test -- --filter Uom || true
- php mom/tools/audit_runtime_authority_consistency.php || true
open_p0_blockers: 14
open_p1_blockers: 53
controlled_gaps: UOM core authority implemented but downstream integration remains owner-prompt work; PostgreSQL runtime inactive; PHPUnit vendor missing.
next_prompt_unlock_condition: P26 must import UOM no-local-conversion rule and ensure Generic CRUD cannot mutate uom or uom_conversion_authority as governed roots.
notes_for_next_agent:
- Canonical UOM definition authority is uom.
- Canonical conversion authority is uom_conversion_authority.
- mdm_uom_conversions is compatibility input only.
- Downstream command wiring remains open for P27 P30 P31 P33 P34 P36.
- Do not add local conversion logic in downstream prompts; use UomAuthorityService.

## Decision

```text
P25_PASS_WITH_CONTROLLED_GAPS
```

P26 is unlocked for Governed Entity Registry and Generic CRUD Hard Stop.

# P00 Defect And Repair Log

Branch: codex/uom-v5-no-guess-20260530
SHA: 59fd44fec98f52e17324fb465a684ed18f3b9218

| ID | Severity | Evidence tag | Defect | Scope owner | P00 repair |
|---|---|---|---|---|---|
| P00-D01 | P0 | REPO_EVIDENCE | `UomWorkflowService.php` selects `rule_version` from `uom_conversion_rule`, while migration 217 defines `version`. | P03 | Logged as P0 watch item; no P00 runtime edit allowed. |
| P00-D02 | P0 | REPO_EVIDENCE | `ConversionRuleService.php` resolves only `approved` rules while workflow/migration support `active`. | P03 | Logged as P0 watch item; no P00 runtime edit allowed. |
| P00-D03 | P0 | REPO_EVIDENCE | Rule cache key omits as-of date, lifecycle policy, and context hash. | P03/P13 | Logged as P0 watch item; no P00 runtime edit allowed. |
| P00-D04 | P0 | REPO_EVIDENCE | Migration 231 still uses first registered user as transitional bridge for manifest activation. | P04 | Logged as P0 watch item; no P00 runtime edit allowed. |
| P00-D05 | Warning | CONTROLLED_GAP | V4 plan and project memory files were not found in repo source. | P01/P02 | Controlled gap recorded; do not guess missing content. |

## Repair Decision

No P00-scope repair was needed after audit. All product defects remain intentionally unresolved until their owning prompt is opened.

# Page Shell Remediation Notes — 2026-03-30

## Root Cause

- Batch header normalization had standardized `form-header`, `doc-code`, `doc-name`, and meta rows, but legacy WI/ANNEX shell closings were not revalidated afterward.
- In 96 WI/ANNEX files, `.page-body` was closed immediately after `form-header`.
- Result: the real document content rendered as direct children of `.page` instead of children of `.page-body`, so content lost the standard page padding and looked like it was spilling out of the page frame.
- Two ANNEX files had an additional late-shell error where visible content was left outside `container/page`, causing the strongest “tràn trang” symptom:
  - `ANNEX-401`
  - `ANNEX-802`

## Corrective Action

- Updated `tools/scripts/wi-annex/normalize_wi_annex_headers.py` to remove the stray early `</div>` after `form-header` when present.
- Extended `tools/scripts/wi-annex/normalize_wi_annex_headers.py` to detect the late-shell case where `print-disclaimer` is still nested inside `.container` and force the shell to close before the disclaimer block.
- Added `tools/scripts/wi-annex/check_page_shell_integrity.py` to block future regressions where:
  - `.page` has visible siblings outside `.page-body`
  - visible body content exists outside `container`

## Final Verification

- `page-shell-report.csv` = 0 findings after remediation.
- Representative local-open checks passed for:
  - `ANNEX-401`
  - `ANNEX-402`
  - `WI-701`
- Desktop and mobile viewport checks showed no horizontal overflow on the representative WI/ANNEX samples after the shell repair.

## Core Rule

- Published WI/ANNEX HTML must keep this shell order:
  - `container > page > page-body > form-header + full visible document content`
- `print-disclaimer` may sit after the shell closes.
- Visible blocks must never appear after `container` closes.

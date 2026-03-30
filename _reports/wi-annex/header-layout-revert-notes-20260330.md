# Header Layout Revert Notes — 2026-03-30

## Root Cause

- Shared header CSS in [assets/style.css](C:/Users/TEST4/qms.hesem.com.vn/assets/style.css) had drifted from the legacy compliant layout.
- The drift split header into 3 visible zones:
  - logo + company block,
  - a separate title band,
  - metadata row.
- Online forms had the same drift duplicated in [online-forms.css](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/styles/online-forms.css).
- The form runtime generator in [09b-form-fill-download.js](C:/Users/TEST4/qms.hesem.com.vn/01-QMS-Portal/scripts/portal/09b-form-fill-download.js) still emitted mixed title patterns, including `form_code + title` in one `<strong>`.

## Reverted Standard

- Visible header layout is now:
  - logo on the left,
  - title + subtitle on the right,
  - metadata row below,
  - no visible `fh-company`,
  - no visible `doc-code` pill inside the title block.

## Guardrails

- `fh-company` is treated as a legacy node and must stay hidden if old files still contain it.
- Runtime must keep document code and title as separate fields, but code is displayed in the metadata row instead of the title block.
- New templates and online-form generators must not concatenate code and title into one text node.

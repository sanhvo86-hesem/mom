# Header SSOT Enforcement - 2026-03-31

## Root cause locked

1. Header title drift happened because multiple paths were trusted as title sources:
   - runtime metadata from portal/catalog
   - legacy translated `<strong>` content in published files
   - malformed code extraction from filename slug
2. `MRR` files exposed the worst case:
   - code was inferred from the whole slug instead of the true controlled prefix
   - `.doc-name` repeated code semantics or carried non-SSOT text
   - legacy malformed meta rows let body table markup leak into header
3. Portal draft generation also allowed plain-text owner/approver values, so new docs could bypass linked-chip governance.

## Enforcement added

1. `tools/scripts/header/normalize_header_ssot.py`
   - derives expected code from controlled path families before trusting current header text
   - normalizes `.doc-name`, `<title>`, first `<h1>`, and meta code row to SSOT
   - rebuilds `MRR` meta rows to the current 5-row header structure
2. `tools/scripts/header/check_header_ssot.py`
   - audits code/title/header alignment against path-derived SSOT
   - flags missing or malformed meta rows
   - flags header rows without JD/department links
   - flags table markup leaking into header meta
3. `01-QMS-Portal/api/controllers/DocumentController.php`
   - generated draft HTML now uses the current header pattern
   - header title renders SSOT English title only
   - owner/approver render linked chips instead of plain text when portal creates new docs/forms

## Verified state

- `header-ssot-report.csv`: header only, `0 findings`
- `php -l 01-QMS-Portal/api/controllers/DocumentController.php`: clean
- `php -l 01-QMS-Portal/api.php`: clean

## Governance note

The visible header title must remain English SSOT only. Vietnamese belongs in `.sub-vn`. Code belongs in the meta row. Actor rows must stay JD/department-linked.

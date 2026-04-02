# M365 Protected Literal Remediation — 2026-04-02

## Scope

- WI/ANNEX audit for translated path, folder, file, site, library, list, and group literals
- Engine hardening for `context_translate_engine.py`
- Core-standard lock clarification for visible examples and note blocks

## Core Standards Re-read

- `core-standards/01-immutable-rules.md`
- `core-standards/03-language-and-translation.md`
- `core-standards/14-m365-sharepoint-architecture.md`
- `core-standards/23-portal-standard-title-filename-ssot.md`
- `core-standards/30-wi-annex-translation-role-bundle-rules.md`

## Root Cause

1. The translation engine protected only a narrow set of contexts, so path-like literals in visible HTML text could still be translated.
2. Several M365 WI/ANNEX files retained legacy or Vietnameseized SharePoint site/library/list/group names.
3. The standards already prohibited this, but the rule was not stated strongly enough for visible examples, note blocks, and folder-tree snippets.

## Files Normalized

- `wi-102`
- `wi-103`
- `wi-104`
- `wi-107`
- `annex-116`
- `annex-131`
- `annex-132`
- `annex-133`
- `annex-134`
- `annex-135`
- `annex-136`
- `annex-138`

## Engine / Tooling Changes

- Added stronger protection for canonical and legacy SharePoint identifiers in `tools/engines/context_translate_engine.py`
- Added path-like text guard so slash-based literals are skipped even outside `.path` / `.code`
- Added `tools/scripts/wi-annex/normalize_m365_protected_literals.py`
- Added `tools/scripts/wi-annex/check_protected_literal_translation.py`

## Verification

- `protected-literal-translation-report.csv`: `0 findings`
- Exact-match scan on `core-standards/*.md`: `0 findings`
- Global WI/ANNEX `.path` + `.code` scan for Vietnameseized protected literals: `0 findings`

## Notes

- This remediation focused on protected literal integrity first: canonical English identifiers must never be translated.
- Some M365 content still reflects older structural patterns, but the visible site/library/list/group/path literals are now normalized and locked against translation drift.

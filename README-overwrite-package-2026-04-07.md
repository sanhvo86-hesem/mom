# HESEMQMS overwrite package — post single-schema merge docs (2026-04-07)

## Package purpose

This overwrite package updates repo documentation for the **post-single-schema-merge phase**.
It does **not** patch runtime code directly.
It adds a new current-authority document, a fresh deep evaluation, a gap matrix, and an active platform-wide convergence prompt.

## Files included

Under `01-QMS-Portal/docs/ai-prompts/`:
- `CURRENT-PLATFORM-AUTHORITY-2026-04-07.md`
- `platform-wide-post-single-schema-merge-deep-evaluation-2026-04-07.md`
- `platform-wide-post-single-schema-merge-gap-matrix-2026-04-07.md`
- `prompt-03-platform-single-schema-authority-and-global-proof-convergence-prompt-2026-04-07.md`
- `prompt-03-platform-concurrent-execution-runbook-2026-04-07.md`

## Intended use

1. Extract this zip into the **repo root**.
2. Let it overwrite/create the included files.
3. Review the new prompt docs in `01-QMS-Portal/docs/ai-prompts/`.
4. Commit them to your local repo.
5. Push to Git.
6. Run the active prompt file in a fresh Codex section.

## Recommended order after overwrite

1. Read `CURRENT-PLATFORM-AUTHORITY-2026-04-07.md`
2. Read `platform-wide-post-single-schema-merge-deep-evaluation-2026-04-07.md`
3. Read `platform-wide-post-single-schema-merge-gap-matrix-2026-04-07.md`
4. Run `prompt-03-platform-single-schema-authority-and-global-proof-convergence-prompt-2026-04-07.md`
5. Use `prompt-03-platform-concurrent-execution-runbook-2026-04-07.md` as operator checklist

## Important note

This package is designed to reduce prompt debt and set the **current platform authority** after the schema merge.
It intentionally does **not** add another wide architecture package.

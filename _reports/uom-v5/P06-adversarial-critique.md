# P06 Adversarial Critique

Prompt: P06
Branch: codex/uom-v5-no-guess-20260530
Current SHA before P06 commit: 3a0b696b8c8b4b08609962c79760bdfae84ef0ed
Decision token: UOM_V5_P06_UCUM_ALIAS_EXTERNAL_GOVERNED

## Reviewer Findings

1. Multi-site, multi-supplier, multilingual risk: `normalizeAlias()` intentionally avoids semantic translation and does not collapse case except for UNECE/EDI. This is safe for no-guess behavior but will increase quarantine volume until supplier-specific mappings are reviewed.
2. Factor-only risk for affine/log/contextual units: P06 does not add conversion formulas. `Cel` and `[degF]` are marked affine by the parser and remain outside factor-only treatment.
3. Naked-number risk: P06 does not touch transaction forms or fixtures. Conversion can only run after a canonical unit exists; alias status `ambiguous`/`unknown` has no canonical code.
4. Canonical/quarantine bypass risk: Legacy `resolve()` now delegates to `resolveDetailed()` and throws unless status is `resolved`.
5. AI authority risk: P06 adds candidate-only arrays and quarantine records; no AI path approves or creates mappings.
6. Permission shortcut risk: P06 does not add approval permissions. It only creates pending review evidence.
7. Schema/service drift risk: Migration 258 and service writes use existing `uom_alias_quarantine` names plus new additive columns. No `version`/`rule_version` style rename was introduced.
8. Cache stale risk: Only resolved alias results are cached. Quarantine results are not cached, so human remediation can be rechecked.
9. Rollback risk: Additive migration has explicit rollback SQL. Service rollback is localized to alias/parser/API files.
10. Replay evidence risk: P06 adds trace id, raw payload, reason, normalized alias, source system, and candidates to quarantine for review replay.

## Weak Points Kept As Controlled Gaps

- Full UCUM/QUDT universe coverage is intentionally incomplete.
- API Problem Details parity and UI remediation are later prompts.
- No production catalog backfill is performed in P06.

## Verdict

PASS_WITH_WARNINGS. The design is conservative: unknown or ambiguous external strings stop in quarantine instead of entering conversion authority.

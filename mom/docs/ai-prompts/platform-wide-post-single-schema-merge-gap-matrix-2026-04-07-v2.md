# Platform-Wide Post Single-Schema Merge — Gap Matrix (2026-04-07, v2)

| Area | Current state | Severity | Why it matters | Closure mode |
|---|---|---:|---|---|
| Single schema merge | `schema.sql` exists alongside blueprint/spec SQL files | P1 | Need explicit SSOT after merge | Add schema authority summary + verifier |
| Schema authority | No compact machine-readable declaration of executable schema vs blueprint/spec/reference | P1 | Reviewers and generators can drift | Add `schema-authority-summary.md/json` + parity checks |
| Manifest vs quality report | Same run ID, but bridge counts differ `103/12` vs `104/11` | P1 | Canonical truth still split | Fix generator math / publication pipeline |
| Entity accounting | `entity_count = 533`, but `frontend-foundation-catalog.json.records = 528` | P1 | Missing explanation for 5-entity gap | Reconcile or explicitly classify hidden/non-record entities |
| Publishability | Quality report still says `publishability_ready = false` and `review_required` | P1 | Prevents honest global release claim | Close blockers or keep package honest |
| Slice vs platform semantics | `slice_publication_pass` label mixed with platform totals | P1 | Semantic ambiguity in truth model | Separate global canonical and slice summary packages |
| OpenAPI baseline | Public spec is still `3.1.1` | P2 | Contract baseline lags current official patch | Upgrade to 3.1.2 or document freeze |
| Compact proof package | No `publication-truth-summary.*` or `foundation-governance-publication-summary.*` visible in registry tree | P2 | Public verification is too expensive | Generate compact proof artifacts |
| Reviewer ergonomics | Key catalogs are large and hard to inspect directly in GitHub UI | P2 | Slower review, higher false-green risk | Provide small summary artifacts and verifier commands |
| Prompt authority | Many prompt files, no visible current-authority reset after schema merge | P2 | Hard to know active lane | Add `CURRENT-PLATFORM-AUTHORITY-...` + lineage index |
| Schema-to-registry parity | No visible compact proof that merged schema matches table-registry/schema-library | P1 | Central risk after schema merge | Add parity verifier and proof artifacts |
| Platform-wide smoke | Existing smoke focus is still slice-heavy | P2 | Missing platform RC preflight | Add platform publication + schema parity preflight |

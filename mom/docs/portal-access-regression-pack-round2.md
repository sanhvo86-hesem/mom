# Portal access regression pack — Round 2 (Phase 2F)

This round adds regression coverage for four families that were not sufficiently explicit in Phase 2E:

1. Hidden-doc visibility: confirm that documents listed in `docs_visibility.json` are suppressed from user-facing access even when a role would otherwise match by pattern.
2. Custom-doc registry: confirm that registry-backed custom documents can be matched by existing role patterns, and that create-document rights stay separated from view rights.
3. JD access: confirm that manager-level `JD*` baseline remains available to manager roles while production-floor roles do not inherit it.
4. Legacy alias patterns: confirm that `REF-012*`, `REF-020*`, and `REF-021*` still map to active ANNEX families through `normalizeDocPattern`.

Artifacts used in this round:
- `qms-data/config/portal-access-regression-scenarios.json`
- `qms-data/config/docs_custom.json`
- `qms-data/config/docs_visibility.json`
- `docs/portal-access-regression-runner-phase2f.js`
- `docs/portal-access-regression-results-phase2f.json`

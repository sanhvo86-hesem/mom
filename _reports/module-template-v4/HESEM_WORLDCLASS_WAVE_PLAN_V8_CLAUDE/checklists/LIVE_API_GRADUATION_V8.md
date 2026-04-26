# Live API Graduation Checklist V8

Per V8 file 01 MAT-L3-to-L4. Mandatory before any slice graduates from fixture (L3) to live read-only (L4).

```text
[ ] LAG-V8-01  per-slice user approval phrase: "Proceed with <slice> Stage 2 live-API graduation"
[ ] LAG-V8-02  W0.5 platform substrate ratified
[ ] LAG-V8-03  feature flag HMV4_LIVE_API_<ROOT> exists (default=false)
[ ] LAG-V8-04  OpenAPI 3.1.1 spec published at mom/contracts/openapi/<domain>/<root>.openapi.yaml
[ ] LAG-V8-05  spec validates: openapi-spec-validator PASS
[ ] LAG-V8-06  problem-detail registry entries present for this route family (≥ 8)
[ ] LAG-V8-07  live-fixture adapter implemented (response normalized to fixture shape)
[ ] LAG-V8-08  live-vs-fixture comparison report authored
[ ] LAG-V8-09  graduation ADR signed (Domain + Platform Lead)
[ ] LAG-V8-10  contract test 100% green against staging
[ ] LAG-V8-11  backward-compat test green
[ ] LAG-V8-12  failure-mode test PASS (no silent fallback per INV-7)
[ ] LAG-V8-13  performance budget met: p50 < 100ms; p95 < 500ms; p99 < 2s; error_rate < 0.5%
[ ] LAG-V8-14  cross-browser baseline GREEN (chromium + firefox + webkit from W4)
[ ] LAG-V8-15  authority ledger entry updated with maturity_level=4
[ ] LAG-V8-16  data/inert_flag_registry_v8.json updated; tests asserting default=false on main
[ ] LAG-V8-17  per-tenant rollout policy declared (per_tenant_opt_in)
[ ] LAG-V8-18  observability: OTel spans active for new endpoints; SLO defined
```

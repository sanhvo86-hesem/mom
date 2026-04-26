# CODEX_W4_V8 — Live Read-Only API Graduation

```text
Per V8 file 27 W4 + V8 file 01 MAT-L3-to-L4.

Pre-flight: W3_EQMS_CORE_READY ratified

Goal: graduate selected slices from L3 → L4 (opt-in live read-only)

Strategy: per-slice graduation; do NOT bulk-graduate all slices simultaneously.

Per slice:
  1. Verify W0.5 substrate active for this root
  2. Author OpenAPI 3.1.1 spec at mom/contracts/openapi/<domain>/<root>.openapi.yaml
  3. Author live-fixture adapter at mom/api/Services/HMV4/<Root>LiveApiAdapter.php
  4. Author graduation ADR at docs/adr/ADR-XXXX-<root>-stage2-live-api.md
  5. Run live-vs-fixture comparison at staging; emit V<N>_<ROOT>_LIVE_VS_FIXTURE_REPORT.md
  6. Verify acceptance criteria per checklists/LIVE_API_GRADUATION_V8.md (18 items)
  7. Receive user approval phrase: "Proceed with <ROOT> Stage 2 live-API graduation"
  8. Update authority_ledger_v8 entry to maturity_level=4
  9. Activate per-tenant feature flag HMV4_LIVE_API_<ROOT> (per file 14)
  10. Emit promotion bundle per file 41 §3

Wave-level exit criteria (file 27 W4):
  - >= 60% of W1+W2+W3 in-scope roots graduated to L4
  - forbidden file diff guard PASS
  - INV-7 detection: zero silent fallback violations
  - per-slice graduation tracker updated at _reports/module-template-v4/V25_LIVE_API_GRADUATION_TRACKER_V8.md

Decision phrase: W4_LIVE_READ_ONLY_READY  /  W4_PARTIAL_NEEDS_CONTINUATION

End.
```

# CODEX_W0_5_V8 — Platform Substrate Hardening

```text
You are Codex implementing W0.5 Platform Substrate Hardening per V8 file 27 W0.5 + file 08 spine phasing.

Pre-flight: PHASE2_INTEGRATION_PASS_READY_FOR_PHASE3_PLANNING ratified (per W0)

Mandatory reads:
  V8 file 04 (Authority Ledger), 05 (OTG), 08 (spine phasing), 09 (Command Bus), 12 (API factory),
  13 (forbidden diff), 14 (inert flags), 24 (Observability+SLO), 26 (Graphics Authority)

Required deliverables (per file 08 §3):
  D1. mom/database/migrations/200_otg_baseline.sql + axioms triggers (V5 + V8 deltas)
  D2. mom/database/migrations/250_authority_ledger_v8.sql + RLS + axioms
  D3. mom/database/migrations/202_otg_mv.sql (5 V5 + 2 V8 = 7 MVs)
  D4. mom/database/migrations/210_cdc_state.sql + CDC consumer service
  D5. PolicyEngineService /decide endpoint at mom/api/services/Identity/PolicyEngineService.php
  D6. ProblemDetailRegistry + middleware (62 problem types)
  D7. IdempotencyMiddleware + idempotency_replay_v8 table
  D8. TenantGuardMiddleware
  D9. AuditChainService + daily merkle anchor cron
  D10. OTel collector deployed; per-service spans active
  D11. Prometheus + Loki + Jaeger ingestion alive
  D12. schemas/forbidden_diff_v8.yaml ratified; CI workflow active
  D13. data/inert_flag_registry_v8.json ratified; tests asserting defaults
  D14. data/authority_ledger_seed_v8.json populated for 95 roots
  D15. Graphics Authority no-hardcode CI gate active
  D16. AISurfaceGuardMiddleware + RULE-2 CI test active

Required tests:
  T1. axiom A-AL-1..11 nightly job runs cleanly on empty + populated ledger
  T2. axiom A1..A18 nightly job runs cleanly on empty OTG
  T3. /decide endpoint returns deterministic decisions for 50 sample requests
  T4. ProblemDetailMiddleware emits RFC 9457 on every error path
  T5. IdempotencyMiddleware replay test: same key returns same response
  T6. forbidden diff CI rejects sample violation
  T7. inert flag tests: HMV4_PREVIEW_ENABLED=false on main
  T8. RULE-2 CI test scans handlers; rejects ai_advisory_annotation as input

Acceptance:
  - All migrations applied on staging cleanly
  - All tests T1-T8 PASS
  - All deliverables D1-D16 present + signed
  - Spine maturity per file 08 §2 reaches W0.5 targets
  - HESEM core service emits OTel spans for at least 1 sample route

Decision phrase: W0_5_PLATFORM_SUBSTRATE_ACCEPTED

End of W0.5 prompt.
```

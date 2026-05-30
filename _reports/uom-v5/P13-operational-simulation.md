# P13 Operational Simulation

Prompt: P13
Branch: codex/uom-v5-no-guess-20260530
Current SHA before P13 commit: 52843a8248e10dbac5fee56ae280972ae272c96f
Decision token: UOM_V5_P13_ENTERPRISE_OPERABILITY_LOCKED

## Required Simulations

| Simulation | Result | Evidence |
|---|---|---|
| SIM-P13-01 magnitude `1; DROP TABLE` rejected before DB | PASS | `UomOperabilityP13Test::testSimP1301MagnitudeInjectionRejectedBeforeDb`. |
| SIM-P13-02 50KB unit expression rejected | PASS | `UcumParser::MAX_EXPRESSION_BYTES=256`; oversized fuzz test rejects before parsing. |
| SIM-P13-03 user can preview but cannot approve rule | PASS_AS_CONTRACT | authorization matrix separates `uom.convert.preview` from `uom.rule.approve`. |
| SIM-P13-04 old cache after activation resolves new version | PASS_AS_CONTRACT | cache contract uses v5 key with as_of/context/policy; workflow invalidation evidence exists; multi-node fanout is controlled gap. |
| SIM-P13-05 quarantine spike emits metric/alert report | PASS_AS_CONTRACT | observability registry defines `uom_alias_quarantine_rate` and `UOM-ALERT-QUARANTINE-SPIKE`. |

## Local Micro-Benchmark

TEST_EVIDENCE: local decimal parser micro-benchmark:

```text
decimal_parse_ms p50=0.000542 p95=0.000584 p99=0.000625 n=500
```

CONTROLLED_GAP: This is local parser evidence only, not production SLO or enterprise load proof.

## Broader Scenario Sweep

- Golden case pass: TEST_EVIDENCE: P13 exact tests passed.
- Negative case fail correctly: TEST_EVIDENCE: injection, unicode/confusable, long-expression, and exponent-bomb tests reject.
- Boundary precision/overflow: TEST_EVIDENCE: exponent bomb rejects before expansion.
- Permission denied: REPO_EVIDENCE: authorization matrix separates preview and approve.
- Stale cache/effective date: REPO_EVIDENCE: cache contract includes `as_of`.
- Audit hash replay: REPO_EVIDENCE: replay contract requires audit hash/rule version/effective date.
- External alias quarantine: REPO_EVIDENCE: threat/metrics contracts cover quarantine rate and alert response.
- UI/API parity: REPO_EVIDENCE: P13 did not change UI/API routes.

## Simulation Result

PASS_WITH_WARNINGS.

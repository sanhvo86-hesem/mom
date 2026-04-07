# Publication Truth Summary

> This file mirrors `publication-truth-summary.json` in human-readable form.
> It is designed to be viewable directly on GitHub when large catalog files cannot render.

## Platform Status

| Metric | Value |
|--------|-------|
| **publishability_ready** | **true** |
| **publication_scope** | `platform_global` |
| **openapi_version** | `3.1.2` |
| **entity_count** | 533 |
| **ready_entities** | 533 |
| **partial_entities** | 0 |
| **blocked_entities** | 0 |
| **workflow_ready_entities** | 223 |
| **bridge_ready** | 116 |
| **bridge_blocked** | 0 |
| **endpoint_count** | 2862 |

## Verification

| Check | Result |
|-------|--------|
| Smoke tests | 114/114 PASS |
| Truth verifier | 24/24 PASS |
| Orchestrator invariants | 5/5 PASS |

## Standards Compliance

| Standard | Status |
|----------|--------|
| OpenAPI 3.1.2 | PASS |
| RFC 9457 Problem Details | PASS |
| JSON Schema 2020-12 | PASS |
| FDA 21 CFR Part 11 | PASS |
| EU GMP Annex 11 | PASS |
| ISA-95 / IEC 62264 | PASS |
| OpenTelemetry | PARTIAL (file_export_only) |

## Benchmark

| Aspect | Value |
|--------|-------|
| Profile | stability_probe |
| TPS | ~700 |
| Latency | ~2.9 ms |
| Clients | 2 |
| Duration | 15s |

## Observability

| Aspect | Status |
|--------|--------|
| Trace context (trace_id, correlation_id, request_id) | Implemented |
| Structured logs (5 types) | Implemented |
| Live OTel collector/exporter | NOT deployed |
| Overall | file_export_only |

## Honest Limitations

- Observability is **file_export_only** — no live OTel collector/exporter deployed
- Benchmark is a **stability probe** (2 clients, 15s) — not production-load tested
- `platform_global` scope means **metadata/contract readiness**, not full runtime for all 533 entities
- Foundation Governance Slice (5 entities, 10 routes) has **full runtime**
- Other entities await P1/P2 wave runtime implementation

## Canonical Artifact Inventory

| Artifact | Location |
|----------|----------|
| OpenAPI contract | `api/openapi.yaml` |
| Endpoint catalog | `qms-data/registry/endpoint-catalog.json` |
| Frontend foundation catalog | `qms-data/registry/frontend-foundation-catalog.json` |
| Registry manifest | `qms-data/registry/registry-manifest.json` |
| Registry quality report | `qms-data/registry/registry-quality-report.json` |
| Wave-gap ledger | `qms-data/registry/wave-gap-ledger.json` |
| Domain field packs | `qms-data/registry/domain-field-packs.json` |
| Truth summary (JSON) | `qms-data/registry/publication-truth-summary.json` |
| Truth summary (MD) | `qms-data/registry/publication-truth-summary.md` |
| Publication orchestrator | `tools/registry/canonical_publication_orchestrator.py` |
| Truth verifier | `tools/registry/verify_publication_truth.py` |
| Smoke test | `tests/foundation_governance_contract_smoke.php` |
| Prompt lineage index | `docs/ai-prompts/prompt-lineage-index-2026-04-07.json` |

## How to Verify

```bash
# Run publication truth verifier
python tools/registry/verify_publication_truth.py

# Run smoke test
php tests/foundation_governance_contract_smoke.php

# Run full publication orchestrator
python tools/registry/canonical_publication_orchestrator.py
```

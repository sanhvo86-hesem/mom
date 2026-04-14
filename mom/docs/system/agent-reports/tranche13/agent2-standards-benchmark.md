# Tranche 13 Pass 1 - Agent 2 Standards / Regulatory Benchmark

**Scope:** official standards / regulatory benchmark refresh only. No code changes, no product claims, no implementation fixes.

## Policy note

The root repo AGENTS allowlist does not include `opentelemetry.io`, but this tranche explicitly requires current official OpenTelemetry sources. I used `opentelemetry.io` as the official source for this report and treat that as an explicit policy tension. If a downstream review rejects that exception, the OpenTelemetry section should be treated as unverified rather than downgraded to a non-official substitute.

## Executive summary

The current world-class benchmark is not “we have some logs and health probes.” It is:

1. `ISA-95 / IEC 62264` for explicit enterprise-control integration and Level 3 / Level 4 boundary discipline.
2. `NIST SP 800-82 Rev. 3` for OT security that accounts for process, availability, reliability, and safety constraints.
3. `NIST SSDF` for secure software development as a lifecycle system, not a post-release checklist.
4. `FDA 21 CFR Part 11` for narrowly scoped electronic records and signatures, with documented scope decisions.
5. `OpenTelemetry` for signal-aware context propagation across traces, metrics, logs, and baggage.

The repo shows real progress in observability and health gating, but the verified state is still partial. Several docs and comments are at risk of overstating the level of compliance or maturity actually proven by code and tests.

## Official baseline

| Standard / regulation | Official source | World-class requirement | Status for this benchmark |
|---|---|---|---|
| ISA-95 / IEC 62264 | [ISA-95 Standard: Enterprise-Control System Integration](https://www.isa.org/standards-and-publications/isa-standards/isa-95-standard) | Keep enterprise and manufacturing control layers distinct; model the Level 3 / Level 4 interface explicitly; define exchanged objects and transactions rather than burying authority in screens or ad hoc CRUD | Confirmed as the governing boundary standard; repo alignment remains partial and must be evidenced in code, not narration |
| NIST SP 800-82 Rev. 3 | [Guide to Operational Technology (OT) Security](https://csrc.nist.gov/pubs/sp/800/82/r3/final) | Secure OT while addressing unique performance, reliability, and safety requirements; recommend security countermeasures for industrial systems and topologies | Confirmed as the OT security baseline; repo proof is local and partial, not OT-ready by standard itself |
| NIST SSDF | [SP 800-218 final](https://csrc.nist.gov/pubs/sp/800/218/final) and the [NIST SSDF project page](https://csrc.nist.gov/projects/ssdf) | Make secure development a repeatable lifecycle with planned security, implementation hardening, verification, and release discipline | Confirmed as the secure-development baseline; repo evidence is better than before, but it does not prove a complete SSDF program |
| FDA 21 CFR Part 11 | [Part 11, Electronic Records; Electronic Signatures - Scope and Application](https://www.fda.gov/regulatory-information/search-fda-guidance-documents/part-11-electronic-records-electronic-signatures-scope-and-application) | Apply Part 11 narrowly to records/signatures that are actually in scope; document scope decisions; preserve audit trail, retention, access control, and signature accountability | Confirmed as the regulated-record baseline; current repo evidence is insufficient to claim full Part 11 compliance |
| OpenTelemetry | [Overview](https://opentelemetry.io/docs/specs/otel/overview/), [Signals](https://opentelemetry.io/docs/concepts/signals/), [Propagators API](https://opentelemetry.io/docs/specs/otel/context/api-propagators/) | Signals share a common context propagation mechanism; propagators must inject/extract `Context` and `Baggage` across process boundaries; traces, metrics, logs, and baggage are first-class signals | Confirmed as the observability baseline; current repo code is OTel-inspired and partially aligned, not a full SDK/propagator implementation |

## Repo current verified state

What I could verify locally in this pass:

| Area | Verified state | Evidence |
|---|---|---|
| Observability request context | `SliceObservability` has request-scoped identifiers and `beginRequest()` creates a fresh context | [SliceObservability.php](/Users/a10/Documents/mom-tranche13-a2/mom/api/services/SliceObservability.php#L54-L78) and [SliceObservabilityTest.php](/Users/a10/Documents/mom-tranche13-a2/mom/tests/Unit/Services/SliceObservabilityTest.php#L27-L40) |
| OTel-style event emission | Structured events are emitted with trace/correlation/request IDs and structured log categories | [SliceObservability.php](/Users/a10/Documents/mom-tranche13-a2/mom/api/services/SliceObservability.php#L130-L156) |
| Loki health gating | Log transport does not report Loki healthy until a successful push verifies it; fallback health is visible | [LogTransport.php](/Users/a10/Documents/mom-tranche13-a2/mom/api/services/LogTransport.php#L37-L56) and [LogTransport.php](/Users/a10/Documents/mom-tranche13-a2/mom/api/services/LogTransport.php#L294-L314) |
| Legacy audit sink visibility | Health explicitly reports legacy audit file sink state and degrades readiness when enabled | [HealthController.php](/Users/a10/Documents/mom-tranche13-a2/mom/api/controllers/HealthController.php#L165-L173) and [HealthController.php](/Users/a10/Documents/mom-tranche13-a2/mom/api/controllers/HealthController.php#L261-L303) |
| Regression coverage | There are focused tests for request-context reset, Loki verification, and runtime authority reporting | [SliceObservabilityTest.php](/Users/a10/Documents/mom-tranche13-a2/mom/tests/Unit/Services/SliceObservabilityTest.php#L27-L40), [LogTransportHealthTest.php](/Users/a10/Documents/mom-tranche13-a2/mom/tests/Unit/Services/LogTransportHealthTest.php#L25-L55), [HealthControllerRuntimeAuthorityTest.php](/Users/a10/Documents/mom-tranche13-a2/mom/tests/Unit/Controllers/HealthControllerRuntimeAuthorityTest.php#L30-L70) |

Interpretation: the repo has concrete local evidence for request-scoped observability, readiness gating, fallback visibility, and audit-sink exposure. It does not yet show a full standards-grade platform for ISA-95, OT security, regulated records, or OpenTelemetry propagation.

## False compliance risks

These are the claims most likely to drift from evidence if left unchecked:

1. Calling `SliceObservability` “OpenTelemetry compliant” is too strong. The code shows structured events and request-scoped IDs, but not a real OTel SDK, collector path, or propagator pipeline. OpenTelemetry’s own propagator spec requires inject/extract operations over carriers, which this code does not demonstrate.
2. Treating health-gating improvements as OT readiness is too strong. NIST SP 800-82 Rev. 3 is about OT systems with unique performance, reliability, and safety requirements, not just application health endpoints.
3. Treating Part 11 as a UI/e-signature feature is too strong. FDA’s scope/application guidance is explicit that Part 11 applies narrowly to records/signatures in regulated scope and expects documented scope decisions.
4. Treating branch isolation, tests, and reviewable docs as full SSDF compliance is too strong. Those are SSDF-aligned practices, but not proof of a complete secure development program.
5. Treating ISA-95 as “we mention planning and execution in docs” is too strong. ISA-95 is a boundary and exchange-model standard for Level 3 / Level 4 integration, not a general architecture adjective.

## Gap to close

The most defensible gap statement for this tranche is:

- keep the repo’s local observability and readiness proof honest;
- avoid upgrading partial evidence into compliance claims;
- make the ISA-95, OT security, Part 11, SSDF, and OpenTelemetry narratives explicitly qualified until code, tests, and generated artifacts prove more.

## Sources used

- https://www.isa.org/standards-and-publications/isa-standards/isa-95-standard
- https://csrc.nist.gov/pubs/sp/800/82/r3/final
- https://csrc.nist.gov/pubs/sp/800/218/final
- https://csrc.nist.gov/projects/ssdf
- https://www.fda.gov/regulatory-information/search-fda-guidance-documents/part-11-electronic-records-electronic-signatures-scope-and-application
- https://opentelemetry.io/docs/specs/otel/overview/
- https://opentelemetry.io/docs/concepts/signals/
- https://opentelemetry.io/docs/specs/otel/context/api-propagators/

## Concise findings

- Verified local progress exists in request-scoped observability and health gating.
- The repo still cannot honestly claim full ISA-95, OT, Part 11, SSDF, or OpenTelemetry compliance.
- The highest risk is false confidence from partial observability and auditability improvements being described too broadly.

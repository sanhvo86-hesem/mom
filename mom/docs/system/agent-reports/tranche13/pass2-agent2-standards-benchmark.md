# Tranche 13 Pass 2 - Agent 2 Standards / Regulatory Honesty Check

**Scope:** red-team the honesty and currency of benchmark / closure docs after implementation. No code changes, no doc changes.

## Verdict

The tranche 13 benchmark docs are mostly honest. They keep ISA-95, NIST SP 800-82 Rev. 3, NIST SSDF, FDA Part 11, and OpenTelemetry claims qualified instead of overstating compliance.

One real pass-2 defect remains: the code path for readiness still allows configured-but-unverified Loki to look acceptable at the controller health layer. That means the docs must stay very narrow about what was proven. Transport verification improved; full readiness did not.

## Findings

| Severity | Location | Finding | Why it matters | Evidence |
|---|---|---|---|---|
| High | [HealthController.php](/Users/a10/Documents/mom-tranche13-a2/mom/api/controllers/HealthController.php#L261-L304), [LogTransport.php](/Users/a10/Documents/mom-tranche13-a2/mom/api/services/LogTransport.php#L294-L314) | `loki_available = null` for configured-but-unverified Loki is still treated as healthy by `componentHealthy()`, because that check only fails on explicit `false`. | The implementation and docs correctly say Loki transport is unverified until a successful push, but the `/health` readiness surface still does not reflect that uncertainty. That is a false-confidence risk if anyone reads the docs as meaning operational readiness improved, not just transport proof. This is code-fixable, and the docs should continue to qualify the claim until that layer is aligned. | `LogTransport::getHealth()` returns `null` for `loki_available` until verification; `HealthController::componentHealthy()` only fails when the field is `false`. The unit test [LogTransportHealthTest.php](/Users/a10/Documents/mom-tranche13-a2/mom/tests/Unit/Services/LogTransportHealthTest.php#L43-L55) proves the unverified state, but not the controller-level readiness gating. |
| Medium | [world-class-swarm-closure-tranche13.md](/Users/a10/Documents/mom-tranche13-a2/mom/docs/system/world-class-swarm-closure-tranche13.md#L1-L18) | The phase table is a dated snapshot, not a live state report. | The file is honest if read as a snapshot, but it is easy to misread as current status because it lists `Phase 4` and later items as pending while the integration branch has already advanced through implementation and pass-2 review. This is doc-fixable drift, not a standards problem. | The file itself says it is a snapshot, but the language is still current-state adjacent. |

## Standards check

The current official baselines remain:

- ISA-95 / IEC 62264 for explicit enterprise-control boundary and Level 3 / Level 4 exchange discipline.
- NIST SP 800-82 Rev. 3 for OT security that preserves safety, reliability, availability, and topology constraints.
- NIST SSDF v1.1 / SP 800-218 for lifecycle secure development practices.
- FDA 21 CFR Part 11 scope/application for narrowly scoped regulated records, audit trail, retention, access control, and signature accountability.
- OpenTelemetry for signals, context propagation, and propagators.

Relevant official source URLs:

- https://www.isa.org/standards-and-publications/isa-standards/isa-95-standard
- https://csrc.nist.gov/pubs/sp/800/82/r3/final
- https://csrc.nist.gov/pubs/sp/800/218/final
- https://csrc.nist.gov/projects/ssdf
- https://www.fda.gov/regulatory-information/search-fda-guidance-documents/part-11-electronic-records-electronic-signatures-scope-and-application
- https://opentelemetry.io/docs/specs/otel/overview/
- https://opentelemetry.io/docs/concepts/signals/
- https://opentelemetry.io/docs/specs/otel/context/api-propagators/

## Repo current verified state

What is actually supported by code and tests:

- `SliceObservability` creates request-scoped context and resets it through `beginRequest()`.
- `LogTransport` distinguishes configured Loki from verified Loki and exposes `loki_probe_state`.
- `HealthController` exposes legacy audit sink state and runtime authority slices.
- Focused tests cover request-context reset, Loki health behavior, and runtime authority reporting.

What is still not proven:

- Full ISA-95 conformance.
- OT readiness under NIST SP 800-82 Rev. 3.
- Full Part 11 program evidence.
- Full SSDF program evidence.
- Full OpenTelemetry SDK/collector/propagator implementation.

## Source-policy note

The tranche 13 docs explicitly disclose the `opentelemetry.io` exception relative to the root AGENTS allowlist. That is the right behavior. There is no hidden source-policy drift in the report set, but the exception should stay visible because it is a real policy tension, not a theoretical one.

## False compliance risks

1. Do not read request-scoped structured logging as OpenTelemetry compliance.
2. Do not read transport-level Loki verification as controller-level readiness proof.
3. Do not read branch isolation plus tests as a complete SSDF program.
4. Do not read narrow Part 11 scope language as actual regulated-record validation.
5. Do not read ISA-95 language in docs as full Level 3 / Level 4 exchange conformance unless the runtime registry and exchange artifacts are actually proven.

## Concise findings

- The benchmark docs remain mostly honest and qualified.
- The most important remaining risk is readiness overconfidence around Loki health propagation.
- The tranche 13 snapshot doc should stay labeled as historical unless it is explicitly updated to the live pass-2 state.

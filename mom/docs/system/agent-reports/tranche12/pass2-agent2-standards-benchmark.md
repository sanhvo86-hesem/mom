# Tranche 12 Pass 2 - Agent 2 Standards Doc Honesty Check

**Scope:** red-team the honesty of benchmark / closure docs against current official standards baseline. No code fixes, no doc fixes, no artifact regeneration.

## Verdict

The docs are mostly honest about the difference between verified code and unproven claims, but there are still a few places where the prose is too strong for the evidence.

The main overreach is not in the standards themselves. It is in how the closure narrative generalizes local proof improvements into broader claims about ISA-95 alignment, OT readiness, and OpenTelemetry compliance.

Source-policy note: OpenTelemetry citations use `opentelemetry.io` as an explicit tranche exception, because the root repo allowlist does not list it even though the user requested it for this audit.

## Findings

| Severity | File / line area | Finding | Why it is dishonest or too strong | Evidence |
|---|---|---|---|---|
| High | `mom/docs/system/world-benchmark-dossier-tranche12.md:13-14` | The ISA-95 and NIST SP 800-82 rows are framed as if the repo has broader verified alignment than this pass can support. | ISA-95 requires explicit Level 3 / Level 4 boundary handling and exchange models; NIST SP 800-82 Rev. 3 is about OT security with unique performance, reliability, and safety requirements. The current repo evidence in this pass shows local service/doc separation and local health/fallback improvements, but not a full verified ISA-95 / OT architecture. The phrase `Current docs and services separate planning, execution, analytics, and control authority in several places` is too general for the evidence. The phrase `Health and fallback signals are stronger after this run` is fine as a local observation, but it should not read like OT readiness has been established. | ISA-95 official page says the standard defines the interface between Level 3 manufacturing systems and Level 4 business systems and is about enterprise-control integration. NIST SP 800-82 Rev. 3 says it guides OT security while addressing unique performance, reliability, and safety requirements. Current code evidence here is limited to `SliceObservability`, `LogTransport`, and queue/health probes. |
| High | `mom/docs/system/world-class-swarm-closure-tranche12.md:33-39` | The implementation summary is honest about specific local changes, but it still risks implying broader OpenTelemetry compliance than the code shows. | The code under `mom/api/services/SliceObservability.php` is bespoke structured logging plus request-scoped correlation IDs. The OpenTelemetry overview says signals share a common context-propagation subsystem, and the propagators spec requires inject/extract behavior for context and baggage across process boundaries. This repo slice shows `beginRequest()` and request-scoped IDs, but not an OTel SDK, propagators, or context propagation wired through carriers. So `OTel-compatible structured event emission` and `OpenTelemetry` should stay qualified as inspired / partial, not compliance claims. | OpenTelemetry overview states signals share common context propagation, and the propagators API requires `Inject` and `Extract` operations to move `Context`, `SpanContext`, and `Baggage` across requests. The current implementation does not show those SDK/propagator pieces. |
| Medium | `mom/docs/system/world-class-swarm-closure-tranche12.md:13-18` | The phase table reads like a current project status, but it is really a historical worklog snapshot. | This pass is already a second-pass standards audit on top of the integration commit. Leaving Phase 3 as `In progress` and Phase 4+ as `Pending` is not wrong as historical context, but it is misleading if a reader interprets the document as current state. If the doc is meant to be living status, these rows are stale. If it is meant to be a dated snapshot, it needs that framing to avoid false confidence. | The file date is fixed to `2026-04-14`, but the worktree is now on integration commit `db10c311`. The prose should make clear that the table is a historical record, not the active pass-2 state. |
| Low | `mom/docs/system/unresolved-backlog-ledger-tranche12.md:20-23` | The `FIX_NOW -> CLOSED` items are plausible, but the wording can still be read as stronger than the benchmark baseline alone proves. | The ledger is better than the closure doc because it ties items to specific tests and local code paths. Still, `CLOSED` should be read as “closed in this workspace with current tests” rather than “fully compliant with the upstream standard.” That distinction matters for Part 11, SSDF, and OTel where the standards require broader program evidence than one tranche can produce. | The ledger cites `LogTransportHealthTest`, `SliceObservabilityTest`, `QueueServiceFallbackTest`, and `HealthControllerRuntimeAuthorityTest`, which is enough for local closure evidence, but not enough to claim end-to-end regulatory or standards compliance. |

## Current baseline check

The official baselines remain:

- ISA-95 / IEC 62264: enterprise-control integration and the Level 3 / Level 4 boundary.
- NIST SP 800-82 Rev. 3: OT security with performance, reliability, and safety constraints.
- NIST SP 800-82 Rev. 3 is the current final baseline, but do not phrase it as permanently static if future revision work is being tracked separately.
- NIST SSDF (SP 800-218 v1.1): secure development practices as a lifecycle system.
- FDA Part 11 scope/application: narrow scope, predicate rules, authorized access, audit trail, and record/signature controls.
- OpenTelemetry: signals plus context propagation, with traces, metrics, logs, and baggage connected through propagators.

Relevant official source URLs:

- https://www.isa.org/standards-and-publications/isa-standards/isa-95-standard
- https://csrc.nist.gov/pubs/sp/800/82/r3/final
- https://csrc.nist.gov/pubs/sp/800/218/final
- https://www.fda.gov/regulatory-information/search-fda-guidance-documents/part-11-electronic-records-electronic-signatures-scope-and-application
- https://opentelemetry.io/docs/specs/otel/overview/
- https://opentelemetry.io/docs/specs/otel/context/api-propagators/

## Bottom line

What is honest now:

- The docs correctly separate local proof from unproven system-level claims.
- The queue, health, and request-context improvements are written as concrete local changes.
- The backlog ledger is more disciplined than the closure narrative.

What still needs tighter wording:

- Don’t convert local observability hardening into broad OT readiness.
- Don’t convert request-scoped structured logging into OpenTelemetry compliance.
- Don’t leave a dated phase table looking like live project status.

## Changed files

- `mom/docs/system/agent-reports/tranche12/pass2-agent2-standards-benchmark.md`

# Tranche 18 Pass 1 - Agent 2 Standards / Regulatory Benchmark

Date: 2026-04-15

Scope: official standards and regulator sources only, plus current repo evidence.

## Standards Baseline

| Standard / source | World-class requirement | Repo-safe wording |
| --- | --- | --- |
| ISA-95 / IEC 62264 | Enterprise-control integration, Level 3/4 boundary discipline, lifecycle and information exchange modeling | ISA-95-aligned boundary discipline; not conformance certification |
| NIST SP 800-82 Rev. 3 | OT security must protect performance, reliability, safety, and controlled interaction with physical processes | OT-adjacent fail-closed and least-privilege posture; not OT compliance proof |
| NIST SSDF SP 800-218 | Secure development practices integrated into SDLC to reduce vulnerabilities and improve supplier communication | Evidence-based secure development practices; not certification |
| FDA Part 11 scope/application | FDA interprets Part 11 scope narrowly and ties expectations to predicate rules, validation, audit trails, and electronic-signature meaning | Part 11-capable / scoped evidence path; not blanket compliance |
| OpenTelemetry specification | Signals, context propagation, traces, metrics, logs, and baggage enable distributed correlation | Observability context support unless a live collector/exporter is proven |

## Findings

- ISA-95 language in repo docs is directionally sound when it stays about ERP/MOM/MES/EQMS boundary discipline.
- NIST SP 800-82 language must not equate dashboards or registry status with OT readiness.
- SSDF should remain tied to reviewable changes, tests, and secure implementation evidence.
- Part 11 wording was too broad in some benchmark/demo text and was code-fixable as documentation truthfulness.
- OpenTelemetry claims must remain limited because this repo does not prove a deployed collector/exporter path.

## Code-Fixable Doc Issues

- `mom/docs/world-class-platform-benchmark-2025-2026.md` used blanket "21 CFR Part 11 compliant" wording for vendor e-signature rows. This run changed the wording to Part 11-capable when validated and scoped.
- `mom/docs/world-class-benchmark-matrix-graphics-control-plane.md` used readiness phrasing that needed explicit repo-local evidence qualifiers and refreshed publication truth counts.
- Tranche16 benchmark/closure docs needed current 271/271 re-verification wording.

## Official Sources

- ISA-95: https://www.isa.org/standards-and-publications/isa-standards/isa-95-standard
- ISA-95 committee scope: https://www.isa.org/standards-and-publications/isa-standards/isa-standards-committees/isa95
- NIST SP 800-82 Rev. 3: https://csrc.nist.gov/pubs/sp/800/82/r3/final
- NIST SSDF SP 800-218: https://csrc.nist.gov/pubs/sp/800/218/final
- FDA Part 11 scope/application: https://www.fda.gov/regulatory-information/search-fda-guidance-documents/part-11-electronic-records-electronic-signatures-scope-and-application
- 21 CFR Part 11 regulation: https://www.ecfr.gov/current/title-21/chapter-I/subchapter-A/part-11
- OpenTelemetry overview/spec: https://opentelemetry.io/docs/specs/otel/overview/

# Tranche 16 Agent 2 - Standards and Regulatory Benchmark

Date: 2026-04-15

## Official Sources Refreshed

- ISA-95 / IEC 62264: ISA official standard family page, https://www.isa.org/standards-and-publications/isa-standards/isa-95
- NIST SP 800-82 Rev. 3 OT security: https://csrc.nist.gov/pubs/sp/800/82/r3/final
- NIST SSDF SP 800-218: https://csrc.nist.gov/pubs/sp/800/218/final
- 21 CFR Part 11 electronic records/signatures: https://www.ecfr.gov/current/title-21/chapter-I/subchapter-A/part-11
- FDA Part 11 scope/application guidance: https://www.fda.gov/regulatory-information/search-fda-guidance-documents/part-11-electronic-records-electronic-signatures-scope-and-application
- OpenTelemetry concepts/specification: https://opentelemetry.io/docs/concepts/ and https://opentelemetry.io/docs/specs/otel/

## Benchmark Interpretation

| Requirement | Repo Verified State | Classification |
| --- | --- | --- |
| ISA-95 role separation between enterprise, MOM/MES execution, quality, and equipment layers | Boundary docs and service ownership improved; execution truth remains service/event authority rather than dashboards. | VERIFIED_PARTIAL |
| OT security segmentation, least privilege, auditability, and fail-safe operations | No machine-control behavior added; rate-limit failure now fails closed; live OT network controls are outside repo. | VERIFIED_PARTIAL |
| SSDF evidence for secure changes | Tests, lint, schema/publication gates, and no-history-rewrite branch evidence exist for this tranche. | VERIFIED_PARTIAL |
| Part 11 record/signature thinking | Signature events now require challenge binding when `auth_challenge_id` is present; this is not a full Part 11 compliance claim. | VERIFIED_PARTIAL |
| OTel signals/context/correlation | Repo has proof scripts and runtime logs; no verified collector/export pipeline in this run. | UNPROVEN_EXTERNAL |

## Required Truth Wording

The repo can claim stronger governed authority, replay/idempotency, and publication proof. It must not claim full ISA-95, Part 11, OT, SSDF, or OTel compliance without deployed controls, SOPs, validation packages, infrastructure evidence, and operational records.


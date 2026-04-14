# Tranche 15 Pass 1 - Agent 2 Standards Benchmark

Date: 2026-04-14

## Official Sources

- ISA-95 / IEC 62264: https://www.isa.org/products/ansi-isa-95-00-01-2025-iec-62264-1-mod-enterprise
- ISA/IEC 62443: https://www.isa.org/standards-and-publications/isa-standards/isa-iec-62443-series-of-standards
- NIST SP 800-82 Rev. 3: https://csrc.nist.gov/pubs/sp/800/82/r3/final
- NIST SSDF SP 800-218: https://csrc.nist.gov/pubs/sp/800/218/final
- FDA Part 11 scope/application: https://www.fda.gov/regulatory-information/search-fda-guidance-documents/part-11-electronic-records-electronic-signatures-scope-and-application
- OpenTelemetry specification: https://opentelemetry.io/docs/specs/otel/
- OPC UA: https://opcfoundation.org/about/opc-technologies/opc-ua/
- MTConnect Part 1: https://docs.mtconnect.org/MBSD_MTConnect_Part_1_2-1-0.pdf

## Findings

| Standard | Benchmark requirement | Repo status |
|---|---|---|
| ISA-95 / IEC 62264 | Explicit enterprise-control boundary and manufacturing operations model. | PARTIAL: architecture and contract layers align, but full runtime breadth is not end-to-end proven. |
| NIST SP 800-82 Rev. 3 | OT security must preserve safety, reliability, performance, segmentation, and recovery. | BLOCKED_EXTERNAL: code has guard rails; live OT segmentation/recovery proof is outside repo. |
| NIST SSDF | Secure development practices should cover prepare/protect/produce/respond. | PARTIAL: branch/test/generator proof exists; external CI/security attestation remains unproven. |
| FDA Part 11 | Scope must follow predicate-rule thinking; in-scope records need trustworthy controls. | PARTIAL: evidence/signature/retention services exist; formal validation scope is a product/compliance decision. |
| OpenTelemetry | Signals and context propagation must be proven across deployed boundaries. | PARTIAL: structured trace/correlation fields exist; live collector/exporter proof is external. |
| ISA/IEC 62443 | Industrial control cybersecurity must address IACS lifecycle, shared responsibility, zones/conduits. | UNPROVEN in code: no full executable 62443 control model in this repo. |
| OPC UA / MTConnect | Machine identity/context adapters must be governed before production claims. | READINESS_ONLY: stable direction, no live adapter proof. |

## Fix-Now Items

- Do not claim OT, Part 11, OpenTelemetry collector, OPC UA, MTConnect, or 62443 production readiness without external proof.
- Keep schema/publication artifacts honest so frontend release status does not mask database authority drift.


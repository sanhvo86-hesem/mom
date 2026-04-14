# Tranche 12 Pass 1 - Agent 2 Standards / Regulatory Benchmark

**Scope:** official standards and regulatory baseline refresh only. No code changes, no product claims, no implementation fixes.

## Executive summary

The current world-class baseline for this repo is not a vague "compliance" claim. It is a set of explicit operational requirements:

1. `ISA-95 / IEC 62264` must keep the enterprise-to-control boundary explicit, versioned, and model-driven.
2. `NIST SP 800-82 Rev. 3` must drive OT-aware security, segmentation, resilience, and safety-conscious design.
3. `NIST SSDF` must be treated as a secure development system, not a checklist after deployment.
4. `FDA 21 CFR Part 11` must be applied by scope, with regulated records and signatures separated from ordinary business data.
5. `OpenTelemetry` must be the observability contract for traces, metrics, logs, baggage, and context propagation.

Current repo evidence I could verify in this pass is limited to older benchmark docs that already reference these domains; I did not audit code in this standards-only pass, so implementation status remains unproven.

## Benchmark matrix

| Standard / regulation | Official source | World-class requirement | Repo evidence verified this pass | Status in this pass |
|---|---|---|---|---|
| ISA-95 / IEC 62264 | [ISA-95 standard](https://www.isa.org/standards-and-publications/isa-standards/isa-95-standard) and [ISA95 committee / standard update material](https://www.isa.org/standards-and-publications/isa-standards/isa-standards-committees/isa95) | Explicit Level 3 / Level 4 boundary, shared vocabulary for enterprise-control integration, versioned information exchange, and disciplined separation of planning, execution, and control authority | Existing repo benchmark docs reference ISA-95, but I did not verify implementation code in this pass | Requirement confirmed, repo implementation unproven |
| NIST SP 800-82 Rev. 3 | [CSRC final publication page](https://csrc.nist.gov/pubs/sp/800/82/r3/final) | OT security must be designed around industrial process constraints, segmentation, monitoring, recovery, and safety-aware operations; IT-only controls are not enough | Existing repo benchmark docs cite SP 800-82 Rev. 3, but no code-level audit was performed in this pass | Requirement confirmed, repo implementation unproven |
| NIST SSDF | [SP 800-218 final](https://csrc.nist.gov/pubs/sp/800/218/final) and the [NIST SSDF project page](https://csrc.nist.gov/projects/ssdf) | Secure development must be built into the SDLC: planning, implementation, verification, and release practices should reduce vulnerabilities and make provenance and review visible | Existing repo benchmark docs cite SSDF concepts, but no code-level audit was performed in this pass | Requirement confirmed, repo implementation unproven |
| FDA 21 CFR Part 11 | [FDA scope and application guidance](https://www.fda.gov/regulatory-information/search-fda-guidance-documents/part-11-electronic-records-electronic-signatures-scope-and-application) | Apply Part 11 by scope, not by marketing label: determine whether electronic records and signatures are actually used for regulated records, then enforce access control, audit trail, signature linkage, accountability, and retention integrity | Existing repo benchmark docs mention Part 11, but no regulated-record verification was performed in this pass | Requirement confirmed, repo implementation unproven |
| OpenTelemetry | [Specification overview](https://opentelemetry.io/docs/specs/otel/), [Signals](https://opentelemetry.io/docs/concepts/signals/), [Propagators API](https://opentelemetry.io/docs/specs/otel/context/api-propagators/) | Traces, metrics, logs, and baggage should share a common context model; propagation must be explicit, standards-based, and usable across process and service boundaries | Existing repo benchmark docs mention OpenTelemetry, but no instrumentation audit was performed in this pass | Requirement confirmed, repo implementation unproven |

## World-class requirements by standard

### ISA-95 / IEC 62264

Official ISA materials treat ISA-95 as the reference for enterprise/control integration. The useful world-class reading is:

- keep the enterprise planning layer and the shop-floor execution/control layer explicit;
- give the system a stable vocabulary for sites, lines, work centers, resources, and material/production flows;
- version interfaces instead of burying control decisions inside ad hoc UI or CRUD logic;
- preserve the boundary between operational authority and reporting/read-model layers.

This is not just an architecture preference. It is the structural prerequisite for multi-site manufacturing systems that need clean planning-to-execution handoff and traceable feedback.

**Inference from source:** in this repo, any attempt to call a screen, dashboard, or analytics view "ISA-95 aligned" is weak unless the underlying authoritative entities and transitions are also modeled at the boundary.

### NIST SP 800-82 Rev. 3

NIST's current Rev. 3 publication is the right OT baseline for CNC and discrete manufacturing because it treats industrial systems as systems with process, availability, and safety constraints.

World-class requirements:

- segment OT and IT trust zones instead of flattening them into one application trust boundary;
- assume telemetry, remote access, and integrations are attack paths unless explicitly constrained;
- design for monitoring, detection, recovery, and operational continuity;
- treat latency, determinism, and safety as first-class constraints, not afterthoughts;
- document compensating controls where pure IT controls do not fit OT reality.

**Inference from source:** a credible MOM/MES platform should not only be "secure" in the generic web-app sense; it should be survivable under industrial failure modes, noisy networks, and partial connectivity.

### NIST SSDF

NIST's SSDF baseline is the correct standard for turning "secure coding" into an operating system for software delivery.

World-class requirements:

- define secure development practices before release gates, not after them;
- make review, testing, and dependency management visible and repeatable;
- capture provenance and change evidence as part of the engineering record;
- treat vulnerability handling as a standard lifecycle path, not an exception queue;
- version the claim if a newer SSDF draft or profile is used, instead of blending drafts and finals into one vague label.

Current practical benchmark reading: use the final SP 800-218 baseline as the stable reference. If the project later chooses to adopt a newer draft revision, that must be labeled as a draft-derived benchmark, not a finalized standard.

### FDA 21 CFR Part 11

Part 11 is often misused as a checkbox. The FDA scope/application guidance makes the real posture clearer: first decide whether the use case is actually in the regulated-record / electronic-signature scope, then apply the relevant controls.

World-class requirements:

- separate regulated records from ordinary operational records;
- define when a record is authoritative, when it is a read model, and when it is only an auxiliary artifact;
- ensure signatures are attributable, linked to the signed record, and not mechanically replayable as a UI event;
- preserve audit trail integrity, record retention, and record retrieval over the full retention horizon;
- document the scope decision so regulated and non-regulated paths do not drift together.

For this repo, the useful test is not "do we have an e-sign button." The useful test is whether production records that matter for quality, release, or traceability have a defensible, scoped record/signature model.

### OpenTelemetry

OpenTelemetry is the observability contract, not just the tracing library.

World-class requirements:

- emit traces, metrics, and logs as related signals, not competing islands;
- keep baggage small, intentional, and safe, because it is contextual metadata that can cross boundaries;
- use standard context propagation so correlation works across service boundaries and async hops;
- keep semantic conventions consistent so instrumentation is analyzable and portable;
- avoid custom propagation schemes unless there is a very strong and documented reason.

**Inference from source:** a world-class manufacturing platform should be able to explain an order, a dispatch, a signature, and an exception through the same correlated observability plane.

## Repo current verified state

What I could verify locally in this pass:

- The repo already contains older benchmark docs that reference ISA-95, NIST SP 800-82 Rev. 3, FDA Part 11, and OpenTelemetry, for example [mes-world-class-benchmark-2026-03-30.md](/Users/a10/Documents/mom-tranche12-a2/mom/docs/mes-world-class-benchmark-2026-03-30.md) and [world-class-platform-benchmark-2025-2026.md](/Users/a10/Documents/mom-tranche12-a2/mom/docs/world-class-platform-benchmark-2025-2026.md).
- Those documents are useful context, but they are not a substitute for current official-source refresh or code-level verification.
- I did not inspect runtime code, migrations, or tests in this standards pass, so no implementation claim should be upgraded from `claimed` to `verified` based on this report alone.

## Repo claimed but unproven state

The repo currently appears to *claim* broad alignment with:

- ISA-95-style planning/execution separation;
- OT-security-aware operating practices;
- regulated quality and signature concepts;
- observability maturity.

Those claims remain unproven until a code and test audit ties them to concrete data models, routes, controls, and evidence paths.

## Current benchmark conclusion

The refreshed world-class standard baseline is clear:

1. `ISA-95 / IEC 62264` for boundary discipline and canonical manufacturing structure.
2. `NIST SP 800-82 Rev. 3` for industrial security and resilience.
3. `NIST SSDF` for secure engineering practice.
4. `FDA 21 CFR Part 11` for scoped electronic records and signatures.
5. `OpenTelemetry` for cross-signal observability and context propagation.

The repo should be judged against those standards using verified code, verified tests, and verified generated artifacts, not by older narrative claims.

## Source URLs

- https://www.isa.org/standards-and-publications/isa-standards/isa-95-standard
- https://www.isa.org/standards-and-publications/isa-standards/isa-standards-committees/isa95
- https://csrc.nist.gov/pubs/sp/800/82/r3/final
- https://csrc.nist.gov/pubs/sp/800/218/final
- https://www.fda.gov/regulatory-information/search-fda-guidance-documents/part-11-electronic-records-electronic-signatures-scope-and-application
- https://csrc.nist.gov/projects/ssdf
- https://opentelemetry.io/docs/specs/otel/
- https://opentelemetry.io/docs/concepts/signals/
- https://opentelemetry.io/docs/specs/otel/context/api-propagators/

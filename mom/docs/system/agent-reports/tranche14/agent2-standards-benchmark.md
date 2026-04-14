# Agent 2 - Standards / Regulatory Benchmark

Branch: `codex/tranche14-a2-standards-benchmark`  
Worktree: `/Users/a10/Documents/mom-tranche14-a2`  
Access date for official sources: `2026-04-14`

Scope: current official/public primary sources only. No repo code was modified. Local repository evidence is limited to files inspected in this worktree and is called out explicitly where used.

## Method

I refreshed the benchmark against the current official sources for:

- ISA-95 / IEC 62264
- NIST SP 800-82 Rev. 3
- NIST SP 800-218 SSDF
- FDA 21 CFR Part 11 scope-and-application thinking
- OpenTelemetry specification and context propagation

I treated a requirement as verified only when the source text itself supported it. I treated repository claims as local evidence only when they were visible in files in this worktree. I did not inspect application code paths in this agent, so repo conformance is mostly unproven unless a local document explicitly states otherwise.

## Strict Dossier

| Requirement | Source citation | MOM implication | Proof expected | Repo evidence / gap |
|---|---|---|---|---|
| ISA-95 / IEC 62264 requires explicit enterprise-control integration, with the current ISA publication naming Part 1 as “Enterprise-Control System Integration - Part 1: Models and Terminology.” ISA’s 2025 update says the standard summarizes the scope of the manufacturing operations and control domain, the organization of physical assets, the functions at the interface between control and enterprise functions, and the information shared among those functions. | [ISA news release, 2025-04-10](https://www.isa.org/news-press-releases/2025/april/update-to-isa-95-standard-addresses-integration-of) and [ISA product page for ANSI/ISA-95.00.01-2025](https://www.isa.org/products/ansi-isa-95-00-01-2025-iec-62264-1-mod-enterprise) | Planning, execution, quality, analytics, and AI must stay on the right side of the enterprise/MOM/MES boundary. Orders, work centers, resources, and operations should be modeled as explicit integration objects, not mixed into ad hoc CRUD. | A published boundary model, command contracts, and tests proving that planning data does not silently become execution truth; explicit hierarchy and interface mapping for plant/site/work center/resource semantics. | Local repo docs already cite ISA-95 as a required standard in [`docs/benchmark/global-world-class-refresh.md`](../../../../docs/benchmark/global-world-class-refresh.md) and [`mom/docs/system/erp-mom-backend-target-architecture-2026-04-10.md`](../../erp-mom-backend-target-architecture-2026-04-10.md). That is citation evidence only; I did not verify code-level boundary enforcement in this agent. |
| NIST SP 800-82 Rev. 3 frames OT security as securing systems that interact with the physical environment while addressing unique performance, reliability, and safety requirements. The revision explicitly expands scope from ICS to OT, updates OT threats and vulnerabilities, updates OT risk management, recommended practices, architectures, and adds an OT overlay for NIST SP 800-53 Rev. 5. It also includes OT cybersecurity governance, risk management, incident response, and recovery/restoration. | [NIST SP 800-82 Rev. 3 PDF](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-82r3.pdf) | Shop-floor integrations need zone/conduit thinking, least privilege, safety-aware controls, incident response, and recovery. Any machine-facing route or adapter must be hardened as OT-adjacent, not treated like ordinary web CRUD. | Security architecture showing OT/IT boundary controls, machine-adapter hardening, incident/recovery runbooks, and tests for replay safety, authorization, and input validation on shop-floor interfaces. | Local repo docs cite NIST SP 800-82 in [`mom/docs/system/erp-mom-backend-target-architecture-2026-04-10.md`](../../erp-mom-backend-target-architecture-2026-04-10.md). I did not inspect runtime OT endpoints or adapter code here, so operational control coverage remains unproven locally. |
| NIST SSDF says secure software development practices should be integrated throughout the SDLC. The Executive Summary calls for organizations to prepare people/processes/technology, protect components from tampering and unauthorized access, produce well-secured releases with minimal vulnerabilities, and identify/respond to residual vulnerabilities. | [NIST SP 800-218 SSDF Version 1.1 PDF](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-218.pdf) and [NIST CSRC publication page](https://csrc.nist.gov/pubs/sp/800/218/final) | Branching, review, testing, dependency hygiene, and release evidence should be treated as part of product security, not as optional DevEx. Security-sensitive remediation work should leave auditable proof of the change and its verification. | CI evidence, branch hygiene, dependency/update discipline, regression tests, vulnerability response artifacts, and release records that show security is integrated into the SDLC rather than appended afterward. | Local repo docs reference SSDF in the global benchmark and architecture docs, but I did not inspect build pipeline or release artifacts in this agent. No local artifact proves full SSDF execution; only partial citation alignment is visible. |
| FDA Part 11 scope-and-application guidance says Part 11 applies to electronic records and signatures required by predicate rules; FDA recommends a narrow interpretation of scope and asks firms to document applicability decisions. The guidance also states that FDA will enforce key closed-system controls such as limiting system access, authority checks, device checks, training competence, policies holding people accountable for electronic signatures, documentation controls, and signature-related requirements. It also distinguishes legacy systems and enforcement discretion. | [FDA Part 11 Scope and Application guidance](https://www.fda.gov/regulatory-information/search-fda-guidance-documents/part-11-electronic-records-electronic-signatures-scope-and-application) | The platform must classify which records are truly in scope before it designs forms or signatures. For regulated records, it must bind record identity, signer identity, meaning, audit trail, retention, and authority checks to the governed command path. | An applicability matrix, record-classification rules, e-signature ceremony, immutable audit trail, retention rules, role/authority checks, and tests proving scope decisions are documented and enforced. | Local repo docs already cite Part 11 in [`docs/backend/DOMAIN_COMMAND_SPEC.md`](../../../../docs/backend/DOMAIN_COMMAND_SPEC.md), [`docs/backend/WORLD_CLASS_BACKEND_REMEDIATION_PLAN.md`](../../../../docs/backend/WORLD_CLASS_BACKEND_REMEDIATION_PLAN.md), and [`mom/docs/system/erp-mom-backend-target-architecture-2026-04-10.md`](../../erp-mom-backend-target-architecture-2026-04-10.md). That confirms awareness, not compliance proof. I did not inspect the e-signature/runtime command path in this agent. |
| OpenTelemetry’s specification is explicit about the core signals and context model: traces, metrics, logs, resource, and context. The spec overview lists API, SDK, data, traces, metrics, logs, and semantic conventions, while the Propagators API says context propagation may be used for traces, metrics, logging, and more, and may be enabled independently. It also requires propagators to inject/extract context across process boundaries. | [OpenTelemetry Specification 1.55.0](https://opentelemetry.io/docs/specs/otel/) and [OpenTelemetry Propagators API](https://opentelemetry.io/docs/specs/otel/context/api-propagators/) | Every governed command, queue hop, and operational read model should carry trace context and emit observability events with the same identity lineage. Logging alone is not enough; telemetry must be structured around propagation and correlation. | Trace/metric/log instrumentation, context propagation across HTTP and async boundaries, collector/export configuration, and tests or sample runs showing the correlation IDs survive process hops. | Local repo docs say the platform should be OpenTelemetry-native, including [`docs/benchmark/global-world-class-refresh.md`](../../../../docs/benchmark/global-world-class-refresh.md) and [`mom/docs/system/erp-mom-backend-target-architecture-2026-04-10.md`](../../erp-mom-backend-target-architecture-2026-04-10.md). I did not inspect runtime instrumentation code here, so local proof of actual propagation remains missing. |

## Requirement-by-Requirement Notes

### ISA-95 / IEC 62264

The current official ISA material makes the boundary requirement explicit: ISA-95 is about enterprise-control system integration, not about blending enterprise planning and shop-floor execution into one undifferentiated layer. For this repository, that means:

- planning objects must remain distinct from execution objects
- work center / site / plant / resource hierarchy must be explicit
- the MOM layer must own execution truth
- analytics and AI must stay downstream unless routed through governed commands

The strongest proof artifact for this standard is not a citation-heavy strategy doc. It is a set of domain contracts, data model rules, and tests that prove planning does not mutate into execution by accident.

### NIST SP 800-82 Rev. 3

NIST’s OT guidance expands the baseline from ICS to OT and centers the unique needs of performance, reliability, and safety. For this repository, the main implication is that machine-adjacent integrations are not ordinary web traffic. They need:

- authentication and authorization fit for OT-adjacent operations
- strict validation on inbound machine or adapter data
- replay awareness and idempotency where events can repeat
- incident response and recovery assumptions
- safety-aware change control around anything that can affect the physical environment

The local repo’s current documentation shows the right vocabulary, but I did not validate the implementation path in this agent.

### NIST SSDF

SSDF matters here less as a compliance logo and more as a way to keep remediation honest. The framework’s four outcome areas map directly to this branch-based closure work:

- prepare the organization
- protect software components
- produce well-secured software
- respond to vulnerabilities

For tranche-style closure work, that means branch hygiene, current verification, regression tests, and evidence artifacts are part of the secure-development outcome, not side work.

### FDA 21 CFR Part 11

The FDA guidance is narrower than many internal benchmark docs make it sound. The important line is not “everything is Part 11.” The important line is “determine applicability from predicate rules, document the decision, and then enforce the relevant controls.” For this repository, that means:

- classify regulated records before designing the flow
- bind signature meaning to the record and action
- enforce authority checks and accountability
- preserve auditability and retention
- treat legacy-system discretion as a documented exception, not a design excuse

The repo already uses Part 11 language in several docs, but those are benchmark claims, not runtime proof.

### OpenTelemetry

OpenTelemetry gives the observability contract shape the repo needs: traces, metrics, logs, context propagation, and semantic conventions. The key operational implication is that correlation must survive process boundaries. If a work order is dispatched, completed, inspected, or rejected, the telemetry chain should still let us tie the event back to the governing command and actor.

The current repo docs already point toward OpenTelemetry-native instrumentation, but the only thing verified in this agent is the presence of that intent in documentation.

## Local Repo Evidence Summary

Verified locally in this worktree:

- `docs/benchmark/global-world-class-refresh.md` exists and already cites ISA-95, Part 11, and OpenTelemetry as benchmark inputs.
- `mom/docs/system/erp-mom-backend-target-architecture-2026-04-10.md` exists and explicitly lists ISA-95 and FDA Part 11 as target architecture references.
- `docs/backend/DOMAIN_COMMAND_SPEC.md` and `docs/backend/WORLD_CLASS_BACKEND_REMEDIATION_PLAN.md` use Part 11 and audit/evidence language.

Not verified locally in this agent:

- any code path proving ISA-95 separation is enforced in runtime services
- any OT security control proving NIST SP 800-82 posture at adapter or route level
- any CI or supply-chain evidence proving full SSDF practice adoption
- any runtime e-signature ceremony proving Part 11 applicability and enforcement
- any actual OpenTelemetry trace/metric/log propagation chain in the application runtime

## Bottom Line

The repo already speaks the language of the standards. The gap is proof. For tranche 14, the useful benchmark is not whether the docs mention the standards; it is whether the codebase can prove boundary discipline, regulated-record scope control, OT-safe hardening, secure-development evidence, and telemetry correlation with current executable artifacts.

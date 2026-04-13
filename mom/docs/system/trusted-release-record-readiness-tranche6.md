# Trusted Release Record Readiness - Tranche 6

**Declared:** 2026-04-13
**Scope:** Release-critical production record packet for work-order, lot, or serial release.

This document maps only verified tranche 6 evidence. It does not claim complete eDHR/eBR, Part 11, ISA/IEC 62443, or SSDF readiness for the whole platform.

## Verified Runtime Evidence

- `TrustedReleaseRecordService` assembles release packets from the production-history read model.
- `PostgresTrustedReleaseRecordRepository` persists packets in `mes_trusted_release_record` when DataLayer has PostgreSQL authority.
- `FileTrustedReleaseRecordRepository` is explicit fallback compatibility storage and reports `json_fallback`.
- `TrustedReleaseRecordController` exposes assemble, readiness, release, detail, provenance, rollup, and probe actions through modular operations routes.
- `RuntimeAuthorityService` includes the `trusted_release_record` slice and reports backend state plus release counters.
- Unit tests prove packet assembly, blocker enforcement, release immutability, provenance ordering, and enterprise rollup behavior.

## Part 11-Style Mapping

| Control expectation | Verified evidence | Gap |
|---|---|---|
| Trustworthy electronic record | Structured release packet with packet version, payload schema version, deterministic hash, provenance, retention metadata, and record-copy metadata. | Full validated export/copy package and controlled rendering are deferred. |
| Audit trail | Packet provenance carries ordered source event references and release decision metadata. | Live audit-chain integration for every release mutation remains partial. |
| Electronic signatures | Packet assertions include approval/signature events when present in production history. | Signature capture and reauthentication are provided by adjacent eQMS surfaces, not fully enforced inside release service for all deployments. |
| Record retention/copy | Packet contains retention class, retention period, record-copy status, and hash metadata. | Automated retention lock enforcement and export copy generation are deferred. |
| Change control after release | Released packets are immutable by repository guard; changed hash after release raises `release_record_immutable`. | Supersede/void governance exists in the state model but full operator workflow is deferred. |

## SSDF / Secure Development Evidence

| Practice area | Verified evidence | Gap |
|---|---|---|
| Requirements and threat-aware design | Gap matrix documents release-critical invariants and unproven claims before implementation. | Formal threat model and abuse-case test suite are deferred. |
| Secure implementation | Release mutations go through service/repository boundaries and RBAC controller guards; no direct controller file persistence. | Live DB concurrency tests and authorization matrix fuzzing are deferred. |
| Verification | Focused PHPUnit, backend smoke, Data Schema smoke, enterprise registry smoke, and full PHPUnit were run. | Independent validation protocol and regulated validation package are deferred. |
| Response and remediation | Runtime authority/probe exposes degraded fallback state and counters. | Operational alerting integration is deferred. |

## OT / ISA-IEC 62443-Relevant Evidence

| Concern | Verified evidence | Gap |
|---|---|---|
| Reliability of release-critical path | Release invariants block missing execution, quality, evidence, signature, and qualification assertions. | Live failover/resume tests are deferred. |
| Role separation | Controller release actions are limited to admin/quality/production governance roles. | Full asset-owner/supplier/integrator/operator responsibility matrix is deferred. |
| Diagnosability | Runtime authority reports backend state and release counters. | OpenTelemetry trace export is deferred. |
| Data integrity | Packet hash and immutable-after-release repository guard are implemented. | DB trigger-level immutability for the release table is not yet implemented. |

## Readiness Classification

- Release packet authority: **YELLOW**
- Release invariant enforcement: **YELLOW**
- Record retention/copy semantics: **YELLOW**
- Electronic-signature closure: **YELLOW**
- Live concurrency/failover proof: **RED**
- Platform-wide eDHR/eBR coverage: **RED**

## Deferred Work

- Add DB trigger or RLS-backed immutability for released `mes_trusted_release_record` rows.
- Add live PostgreSQL transaction/concurrency tests for simultaneous release attempts.
- Add regulated export/copy artifact generation while keeping structured packet as authority.
- Integrate release packet creation with live shipment gate and eQMS approval workflows where required.
- Add OpenTelemetry trace/span export for release flows.

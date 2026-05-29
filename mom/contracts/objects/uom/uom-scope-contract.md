# UoM Measurement Intelligence Subsystem — Scope Contract

**Package:** HESEM_UOM_PROMPT_OS_V1_2026-05-28  
**Version:** 1.0  
**Date:** 2026-05-29  
**Branch:** codex/uom-foundation-20260529  
**Posture:** development/prototype → pre-production readiness. Not production release.

---

## Scope

This contract defines the boundary of the HESEM Unit of Measure / Measurement Intelligence Subsystem (UoM MIS v1). It is the authoritative reference for what this subsystem IS, IS NOT, and who may interact with it.

## What this subsystem IS

- A governed catalog of canonical unit of measure identities (UOM)
- A semantic quantity kind and dimension registry (QKIND/DIMVEC)
- A versioned, e-signed conversion rule engine (UOMCONV + ConversionEngine)
- A MeasurementValue evidence envelope factory (MEASVAL)
- An Item UoM Policy manager (ITUOM) for per-item/context unit assignment
- An alias resolution and quarantine service for external unit strings (UOMALIAS)
- A read-only API for unit catalog, quantity kinds, and conversion preview
- A governed mutation API for rule submission, review, and approval
- A UI control center and quantity input widget

## What this subsystem IS NOT

- A currency conversion engine (finance domain boundary)
- A physical dimension database (we reference QUDT/BIPM; we do not re-derive physics)
- A free-text unit storage system (all units must be canonical_code-anchored)
- An autonomous AI decision system (AI is advisory; humans approve all governed decisions)
- A simple lookup table (uom(code, factor) design is explicitly rejected)

## Governance

- All UOMCONV rule changes require: workflow → human approval → audit event
- Regulated/high-risk rules require e-sign (per P12 workflow Class C)
- AI suggestions are advisory only; logged in uom_ai_advisory_log
- All mutations create audit_events rows with trace_id

## Migration IDs reserved: 214–225

## Service namespace: MOM\Api\Services\Uom\

## IMPL gate token: UOM_IMPL00_SCOPE_CONTRACT_COMPLETE

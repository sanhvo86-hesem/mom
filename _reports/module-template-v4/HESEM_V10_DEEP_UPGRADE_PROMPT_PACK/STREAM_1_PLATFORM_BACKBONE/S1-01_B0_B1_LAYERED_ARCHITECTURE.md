# S1-01 — B0 Overview + B1 Layered Architecture (Deep Upgrade)

```
prompt_id:        S1-01
stream:           1 (Platform Backbone)
sequence:         1 of 9
estimated_effort: ~80 minutes substantive output
```

## Pre-flight reading (mandatory before producing output)

```
1. README.md (HESEM project root)
2. AGENTS.md (governance rules)
3. _reports/module-template-v4/HESEM_V10_DEEP_UPGRADE_PROMPT_PACK/
     README.md
   _reports/module-template-v4/HESEM_V10_DEEP_UPGRADE_PROMPT_PACK/
     STREAM_1_PLATFORM_BACKBONE/S1-00_STREAM_MASTER.md
4. Current V9 baseline (read in full):
   _reports/module-template-v4/HESEM_WORLDCLASS_WAVE_PLAN_V9_CLAUDE/
     PART_B_ARCHITECTURE_MASTER/B0_PART_B_OVERVIEW.md
   _reports/module-template-v4/HESEM_WORLDCLASS_WAVE_PLAN_V9_CLAUDE/
     PART_B_ARCHITECTURE_MASTER/B1_LAYERED_ARCHITECTURE.md
5. Cross-Part references (read for context):
   _reports/module-template-v4/HESEM_WORLDCLASS_WAVE_PLAN_V9_CLAUDE/
     MASTER_OVERVIEW.md
   _reports/module-template-v4/HESEM_WORLDCLASS_WAVE_PLAN_V9_CLAUDE/
     PART_A_VISION_AND_SCOPE/A1_PRODUCT_VISION.md
   _reports/module-template-v4/HESEM_WORLDCLASS_WAVE_PLAN_V9_CLAUDE/
     PART_M_REFERENCE/M2_DOMAIN_MODELS.md
6. Standards references (citation level only):
   ISA-95 / IEC 62264 functional hierarchy
   ISA-88 / IEC 61512 batch control
   21 CFR Part 11; EU GMP Annex 11
   GAMP 5 V-model
   IEC 62443 industrial cyber
   OWASP ASVS 5.0 architecture section
   NIST SP 800-204 microservices security
```

## Deliverable

Upgrade two V9 files in place:

```
_reports/module-template-v4/HESEM_WORLDCLASS_WAVE_PLAN_V9_CLAUDE/
  PART_B_ARCHITECTURE_MASTER/B0_PART_B_OVERVIEW.md

_reports/module-template-v4/HESEM_WORLDCLASS_WAVE_PLAN_V9_CLAUDE/
  PART_B_ARCHITECTURE_MASTER/B1_LAYERED_ARCHITECTURE.md
```

Target depth: V10 GPT-Pro-equivalent. Each file substantively
expanded.

## Depth requirements

### B0 Part B Overview

Must contain (at minimum):

```
1.  Purpose of Part B (1-2 sentences; no marketing)
2.  Architectural principles (≥ 12 explicit principles, each with
     concrete justification — not aspirational adjectives)
3.  Architectural style (microservices vs monolith vs modular
     monolith; chosen style with justification; rejected
     alternatives with reasons)
4.  System decomposition map (every architectural component
     enumerated; their owner; their dependencies; their
     boundaries)
5.  Quality attributes (per ISO/IEC 25010): availability,
     reliability, performance, security, privacy, accessibility,
     maintainability, testability, regulatory conformance, AI
     governance — each with target level + how achieved
6.  Cross-cutting concerns map (the 12+ concerns and where they
     live)
7.  Decision-record discipline (every architectural decision is
     an ADR; ADR template; ADR review cycle)
8.  Architectural risk register (top architectural risks; cross-
     reference per M6)
9.  Reading order within Part B
10. Cross-references to other Parts
11. Decision phrase
```

### B1 Layered Architecture

Must contain (at minimum):

```
1.  The 8 layers + L9 OT (intent + boundary + ownership)
    L1 Identity & Authentication
    L2 Authority & Policy
    L3 Workflow & Command Bus
    L4 Domain Roots & Mutations
    L5 OTG / Persistence
    L6 Frontend / Presentation
    L7 API Gateway / Public Surface
    L8 Platform / SRE / Observability
    L9 OT (Operational Technology / Edge — for MES/MOM)

    For each layer:
    - Bounded responsibility (concrete; not "handles X")
    - Components inside the layer (concrete list)
    - Inputs (from which layers; specific interface kind)
    - Outputs (to which layers; specific interface kind)
    - Cross-cutting concerns this layer owns
    - Cross-cutting concerns this layer consumes
    - Per-layer SLOs (latency / availability / freshness)
    - Per-layer team ownership (Skelton-Pais classification)
    - Per-layer scaling characteristic (stateless / sticky /
      partition / etc.)
    - Per-layer security posture (per IEC 62443 SL where
      applicable)

2.  Layer-to-layer interfaces
    Per pair of layers (or where coupled), the interface contract:
    - Direction
    - Protocol (sync RPC / async event / DB query / file)
    - Format (OpenAPI / AsyncAPI / SQL / etc.)
    - Idempotency requirement
    - Tenant boundary handling
    - Failure semantics
    - Observability instrumentation

3.  Why 8 layers (not 6, not 12)
    Concrete trade-off discussion: what is gained by separating
    L1 from L2; what is gained by separating L4 from L5; etc.

4.  L9 OT special discipline
    OT zones per IEC 62443; OT write-path with N prerequisites
    (enumerate N prerequisites; each one defined);
    air-gap considerations; per ISA-95 functional hierarchy
    mapping (Levels 0-1-2-3-4 mapping to L9-L4 here);
    edge gateway responsibilities

5.  Forbidden cross-layer dependencies
    Specific rules: e.g., L4 never calls L7; L6 never directly
    queries L5; L9 OT never directly mutates L4 (only via
    bounded write-path through L3 + L4)

6.  Migration discipline (how layers evolve)
    Adding a layer = ADR Class A; deleting = ADR Class A;
    layer responsibility shift = ADR Class B+

7.  Mapping to per-domain code (per Part C)
    Each L4 domain root family lives in which layer slot;
    cross-cutting C12 / C13 / C14 fold in where

8.  Mapping to wave plan (per Part G)
    Per layer, which wave brings it to L4 / L5 / L6 / L7
    maturity

9.  Decision phrase
```

### Anti-patterns (forbidden output)

```
- "Layered architecture is a clean separation..." (definitional
  fluff)
- "Best practice is to..." (instead: state the practice; cite
  source; explain why)
- "Industry-leading microservices design"
- "Robust authentication" (instead: WebAuthn FIDO2 + ...)
- Empty layer description (each layer needs ≥ 8 substantive
  bullets)
- ASCII art diagrams replacing prose substance (a diagram is OK
  IF accompanied by full prose explanation)
- Marketing-speak in justification ("delivers value")
- Dropdown / toggle style ("could be either X or Y") without
  picking + justifying
```

## Required substance per element

### Each layer description

Minimum 250 words per layer × 9 layers = ~2,250 words on layer
substance alone in B1.

### Layer-to-layer interfaces

Minimum 9-15 interface contracts (between coupled pairs) at ≥
80 words each.

### B0

Minimum 1,500 words substantive. Architectural principles count
≥ 12. ADR registry stub with at least 8 ADRs referenced.

### B1

Minimum 4,500 words substantive.

## Cross-references that MUST appear

```
B0 →   A1 (vision); A3 (domain scope); A4 (standards); M6 (risks)
B1 →   B2 (Authority Ledger); B3 (OTG); B4 (State Machines);
        B6 (Cross-Cutting); C12/C13/C14 (cross-cutting domains);
        E0..E15 (API surface at L7); F0..F12 (UI at L6);
        I7 (security at L8); G0..G14 (waves)
```

## Per-pack overlay (where applicable in B1)

```
PHARMA J1     L9 OT cleanroom + sterile-line constraints;
              edge gateway near-aseptic disposition
AUTO J2       L9 OT shopfloor; SCADA integration; per-OEM
              EDI at L7
AERO J3       L1 Identity ITAR person-of-record; per-region
              isolation impact on L8; FIPS 140-3 cipher at
              L1-L8 transitions
MD J4         L4 + L5 product-instance lifecycle (DHF / DHR);
              L9 OT for sterilizer cycles
FOOD J5       L9 OT for HACCP CCP monitoring; per-zone EMP
              constraints in L9
```

## Acceptance criteria

```
[ ] B0 contains ≥ 12 explicit architectural principles, each
    with justification (no aspirational adjective)
[ ] B0 contains system decomposition map with explicit owners
[ ] B0 contains ISO/IEC 25010 quality attribute table with
    targets
[ ] B0 contains architectural risk register stub (cross-ref M6)
[ ] B0 contains ADR template + review cycle
[ ] B1 contains all 9 layers (L1..L8 + L9 OT)
[ ] B1 each layer contains: responsibility, components, inputs,
    outputs, cross-cutting, SLOs, team owner, scaling,
    security posture
[ ] B1 contains layer-to-layer interface contracts
[ ] B1 contains "why 8 layers" trade-off discussion
[ ] B1 contains L9 OT special discipline + ISA-95 mapping
[ ] B1 contains forbidden cross-layer dependency rules
[ ] B1 contains per-pack overlay (J1..J5 callouts)
[ ] No marketing language present
[ ] No empty section headers
[ ] All cross-references resolve to real chapters
[ ] Decision phrase emitted at end
```

## Output

Both files written back to V9 paths.
Format: existing V9 chapter shape (numbered sections, fenced
code blocks for tables, prose for explanation).
Total target: B0 ~1,500 words; B1 ~4,500 words.

## Decision phrase upon completion

```
S1-01_B0_B1_LAYERED_ARCHITECTURE_DEEP_UPGRADE_COMPLETE
```

After emit: load `S1-02_B2_AUTHORITY_LEDGER.md` next.

# PART_B — ARCHITECTURE MASTER — Overview

Part B describes how HESEM is structured. It does not describe what HESEM
does (that is Part C). It describes how the platform is organized so that
what it does can be done correctly, repeatably, and observably.

Part B is divided into ten chapters. Each chapter describes one
architectural concern at the level of plain-language description — what
each layer or concern is, why it exists, who owns it, what it produces,
what it consumes, and what evidence proves it works.

```
B0  this overview
B1  Layered Architecture (the 8 layers L1-L8)
B2  Authority Model (Authority Ledger; the rules that govern who can change what)
B3  Operational Truth Graph (the single graph of operational facts)
B4  State Machine Network (the 14 coupled state machines)
B5  Data Flow & Lineage (CDC, projections, materialized views, data products)
B6  Cross-Cutting Concerns (the 12 concerns that thread through every layer)
B7  Deployment Topology (how HESEM runs in cloud and on-premise)
B8  Integration Boundaries (Edge Gateway, Partner Connectors, External Surfaces)
B9  Observability & Metrics (OpenTelemetry, SLOs, dashboards, alerts)
```

---

## Reading order within Part B

If you are an architect or engineer about to build something, read in
this order:

```
B0  this overview                            (5 min)
B1  Layered Architecture                     (15 min)
B2  Authority Model                           (15 min)
B3  Operational Truth Graph                   (20 min)
B4  State Machine Network                     (15 min)
B5  Data Flow & Lineage                       (10 min)
B6  Cross-Cutting Concerns                    (15 min)
B7  Deployment Topology                       (10 min)
B8  Integration Boundaries                    (10 min)
B9  Observability & Metrics                   (10 min)
```

Total: ~125 minutes for full Part B absorption.

---

## What Part B contains in plain terms

Part B is the answer to "how is HESEM built." It does not contain:

- Specific deployment manifests (those live in `mom/deploy/...`)
- Specific database schemas (those live in `mom/database/migrations/...`)
- Specific service code (those live in `mom/api/...`)

Part B contains, for each architectural concern:

- **Purpose** — what the concern addresses
- **Decomposition** — what the concern is built from
- **Boundary** — what the concern owns and what it does not own
- **Public contract** — what the concern offers to the layers above and below
- **Forbidden coupling** — what the concern must not depend on
- **Failure mode** — what happens when the concern is degraded
- **Owner** — which role on the team owns the concern
- **Evidence** — what proves the concern is working

This is the level of detail an engineer needs to design the concern without
having designed already.

---

## Architectural principles (carried into every Part B chapter)

```
- Authority is explicit. No layer hides authority from another.
- Layer boundaries are honored. No skipping. No reaching across.
- Cross-cutting concerns thread through layers; they are not extra layers.
- The Operational Truth Graph is the single source of operational truth.
- The Authority Ledger is the single source of authorization truth.
- The Workflow Mutation Command Bus is the single mutation pathway.
- Open standards are preferred. Proprietary protocols only by exception.
- Tenant isolation is double-enforced. Middleware plus row-level security.
- Observability is mandatory. OpenTelemetry everywhere.
- Per-slice graduation. L0 to L7. No skipping. No bulk graduation.
```

---

## How Part B serves the rest of V9

The other Parts depend on Part B as follows:

| Part | Dependency on Part B |
|---|---|
| C (Capabilities) | Each capability lives in one or more layers (B1) |
| D (Workflows) | Each workflow uses the State Machine Network (B4) |
| E (APIs) | Each API observes the Layered Architecture (B1) and Cross-Cutting Concerns (B6) |
| F (Frontend) | Frontend lives in L6; binds to L7 APIs (B1) |
| G (Wave Plan) | Each wave delivers capabilities of layers in B1 (per spine in B6) |
| H (Quality + Compliance) | Validation and audit honor Cross-Cutting Concerns (B6) |
| I (Operations) | Operations are governed by Deployment (B7) and Observability (B9) |
| J (Vertical Packs) | Each pack extends the Layered Architecture (B1) |
| L (AI Discipline) | AI lives in specific layers and respects cross-cutting governance |

---

## Decision phrase

```
PART_B_OVERVIEW_BASELINE_LOCKED
NEXT: B1_LAYERED_ARCHITECTURE.md
```

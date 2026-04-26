# C14 — Core Platform

```
domain_code:    D-14
domain_name:    Core Platform
owner_role:     Platform Lead (with Identity Lead, Compliance Lead, SRE Lead)
primary_state_machine: (substrate; not a single state machine)
```

---

## 1. Purpose

The Core Platform domain owns the substrate that every other domain
depends on. It is the most concentrated source of cross-cutting value:
investment here pays off in every other domain.

If domains C1 through C13 are the visible features, this domain is the
foundations underneath. Without it, none of them work.

---

## 2. The roots within this domain

```
Identity & Access Management   The IAM subsystem (auth, authorization,
   (IAM)                        session). Users from C10 are stored here.
Workflow Engine                The state machine runtime that powers
                               every state machine in B4.
Evidence Engine                The audit chain and evidence record store.
Audit Engine                   The detailed audit trail per object.
Notification Service          The delivery of events to humans (email,
                               in-app, SMS, push).
Graphics Authority            The design token registry and simulation
                               modal that protects visual consistency.
Design System                 The reusable UI primitives and components.
SRE Service                   The Site Reliability subsystem.
Observability Stack           OpenTelemetry collector, metrics, logs,
                               traces, dashboards, alerts.
Authority Ledger              The authoritative registry of authority
                               rules per root (B2).
Operational Truth Graph       The graph itself (B3).
```

---

## 3. The capabilities within this domain

### CAP-C14-01 — Identity & Access Management

**Purpose.** Authentication, authorization, session management.
Multi-factor authentication. Step-up authentication for sensitive
actions. JIT (just-in-time) elevation with audit trail.

**Wave target.** L4 by W0.5; L7 by W12.

### CAP-C14-02 — Workflow Engine

**Purpose.** Runtime that executes every state machine in B4. Reads
state machine definitions; evaluates guards; commits transitions; emits
workflow events.

**Wave target.** L4 by W0.5 (substrate); L7 by W12.

### CAP-C14-03 — Evidence Engine

**Purpose.** The audit chain (hash-chained, daily-anchored) and evidence
record store with WORM retention.

**Wave target.** L4 by W0.5; L7 by W9.

### CAP-C14-04 — Audit Engine

**Purpose.** The per-object audit trail. Every authoritative record's
mutation history queryable.

**Wave target.** L4 by W0.5; L7 by W9.

### CAP-C14-05 — Notification Service

**Purpose.** Deliver events to humans via configurable channels (email,
in-app, SMS, push). Per-tenant delivery preferences.

**Wave target.** L4 by W3; L7 by W9.

### CAP-C14-06 — Graphics Authority

**Purpose.** Per the existing repo discipline (Graphics Authority Link
in CLAUDE.md): design tokens are the source of truth for visual
parameters. No-hardcode rule. Simulation before commit.

**Wave target.** L4 by W0.5 (foundational); L7 by W12.

### CAP-C14-07 — Design System

**Purpose.** Reusable UI primitives (buttons, forms, tables, dialogs,
drawers, charts) with consistent style, accessibility, and behavior.

**Wave target.** L4 by W1; L7 by W12.

### CAP-C14-08 — Site Reliability Engineering Service

**Purpose.** Deployment automation, observability, capacity, cost
attribution, DR.

**Wave target.** L4 by W0.5; L7 by W12.

### CAP-C14-09 — Observability Stack

**Purpose.** OpenTelemetry collector + Prometheus + Loki + Jaeger /
Tempo + Grafana + AlertManager. Per B9.

**Wave target.** L4 by W0.5; L7 by W12.

### CAP-C14-10 — Authority Ledger

**Purpose.** The Authority Ledger (B2) is the authoritative registry of
authority rules per root.

**Wave target.** L4 by W0.5; L7 by W12.

### CAP-C14-11 — Operational Truth Graph

**Purpose.** The OTG (B3): the single graph of operational facts.

**Wave target.** L4 by W4.5; L7 by W12.

---

## 4. Workflows

Participant in: every workflow (Core Platform is substrate).

---

## 5. APIs

```
- IAM API (auth, decide, session)
- Workflow Engine API (state machine introspection)
- Audit Trail API (per-object history)
- Evidence Engine API (record retrieve)
- Notification API (preferences, delivery)
- Authority Ledger API (read-mostly)
- OTG Query API (per B3 query catalog)
- Admin / SRE API (operational management)
```

---

## 6. Frontend surfaces

```
- IAM Admin (users, roles, permissions)
- Authority Ledger Viewer (read-only)
- OTG Explorer (genealogy, audit)
- Notification Preferences
- Graphics Authority Admin (token registry)
- SRE Dashboard
- Observability Dashboards
```

---

## 7. Cross-cutting concerns

This domain implements the cross-cutting concerns themselves; every
concern in B6 has its substrate here.

---

## 8. Wave assignments

```
IAM                    L4 W0.5; L7 W12
Workflow Engine        L4 W0.5; L7 W12
Evidence Engine        L4 W0.5; L7 W9
Audit Engine           L4 W0.5; L7 W9
Notification Service    L4 W3; L7 W9
Graphics Authority     L4 W0.5; L7 W12
Design System          L4 W1; L7 W12
SRE Service            L4 W0.5; L7 W12
Observability          L4 W0.5; L7 W12
Authority Ledger       L4 W0.5; L7 W12
OTG                    L4 W4.5; L7 W12
```

---

## 9. Standards

```
- All standards in PART_A4 (Core Platform implements them)
```

---

## 10. Boundary with adjacent domains

Core Platform supports every domain. There is no domain it does not
touch.

---

## 11. Decision phrase

```
C14_CORE_PLATFORM_BASELINE_LOCKED
PART_C_COMPLETE
NEXT: PART_D_WORKFLOW_CATALOG/D0_PART_D_OVERVIEW.md
```

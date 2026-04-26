# C12 — Integration

```
domain_code:    D-12
domain_name:    Integration
owner_role:     Platform Lead (with API Lead)
primary_state_machine: (none specific; this domain provides infrastructure)
```

---

## 1. Purpose

The Integration domain owns the boundary between HESEM and other
systems. It is the platform's nervous system: messages flow through it,
contracts gate it, observability traces it. Without this domain, HESEM
is an island.

---

## 2. The roots within this domain

```
API Gateway                  The front door for external HTTP calls.
Event Bus                    The asynchronous message backbone (RabbitMQ
                              for early waves; Kafka or NATS at scale).
Idempotency Service          The replay-protection store.
Live API Toggle Registry     The per-tenant per-root flag system that
                              controls which APIs are live (per V8 file 14
                              equivalent).
CDC Pipeline                 The Change Data Capture consumer that
                              materializes the OTG.
Partner Integration Connector Specific connectors to Salesforce, SAP,
                              Oracle, PTC Windchill, Siemens NX, MS 365,
                              Slack/Teams, MS Dynamics 365, plus customer-
                              specific connectors.
EDI Engine                   Electronic Data Interchange transactions
                              (ANSI X12 / EDIFACT) for automotive /
                              aerospace exchange.
Webhook Subscription          External system subscriptions to HESEM
                              events.
```

---

## 3. The capabilities within this domain

### CAP-C12-01 — API Gateway

**Purpose.** Single entry point for all external HTTP calls into HESEM.
Handles TLS termination, rate limiting, authentication, request /
response logging, contract enforcement.

**Wave target.** L4 by W0.5; L7 by W12.

### CAP-C12-02 — Event Bus

**Purpose.** Asynchronous message routing between HESEM services and to
external subscribers.

**Wave target.** L4 by W0.5 (RabbitMQ); L7 by W7 (with Kafka / NATS
JetStream introduced when scale demands).

### CAP-C12-03 — Idempotency Service

**Purpose.** Replay-protection store; prevents duplicate mutations on
retry.

**Wave target.** L4 by W0.5; L7 by W12.

### CAP-C12-04 — Live API Toggle Registry

**Purpose.** Per-tenant per-root flag system controlling which APIs are
live (vs fixture). Critical to per-slice graduation discipline.

**Wave target.** L4 by W4; L7 by W12.

### CAP-C12-05 — CDC Pipeline

**Purpose.** Change Data Capture consumer that materializes the OTG by
consuming database mutations.

**Wave target.** L4 by W4.5; L7 by W12.

### CAP-C12-06 — Partner Integration Connectors

**Purpose.** Per-vendor connectors. Each connector is a separate
component with its own contract, signature, and lifecycle.

**Initial connector set** (Wave 9 / 10):
- Salesforce CRM (SO and complaint sync)
- SAP S/4 HANA (financial postings)
- Oracle EBS (alternative ERP)
- Microsoft Dynamics 365 (alternative ERP)
- PTC Windchill (PLM revision sync)
- Siemens NX / Teamcenter (CAD reference)
- MS 365 / SharePoint (document repo)
- Google Workspace (alternative)
- Slack / MS Teams (notifications)
- Avalara / Vertex (tax)
- IBM Maximo / IFS (legacy maintenance migration)

**Wave target.** Per-connector targets in W9 and W10.

### CAP-C12-07 — EDI Engine

**Purpose.** Electronic Data Interchange for automotive / aerospace
customer exchange (ANSI X12 850 PO, 856 ASN, 810 Invoice, 860 PO Change,
862 Schedule, 865 PO Acknowledgment, 997 Functional Acknowledgment).

**Wave target.** L4 by W10 (automotive vertical pack drives this).

### CAP-C12-08 — Webhook Subscription

**Purpose.** Allow external systems to subscribe to HESEM events (e.g.,
"notify me when SO ships"). Per-subscription authentication, retry,
backoff.

**Wave target.** L4 by W7; L5 by W7.

### CAP-C12-09 — Schema Registry

**Purpose.** Versioned schema registry for events (Avro + JSON Schema
mirror). Producers register schemas; consumers fetch + validate.

**Wave target.** L4 by W4; L7 by W8.

---

## 4. Workflows

Participant in: every workflow (Integration is infrastructure).

Specific reference: D11 Release to Trace (event publication on release).

---

## 5. APIs

```
- (Integration is the API layer; per-connector APIs are described in
  per-connector specifications)
- Webhook Subscription Management API
- Schema Registry API
- Live API Toggle Management API
```

---

## 6. Frontend surfaces

```
- Connector Health Dashboard
- Webhook Subscription Workspace
- Live API Toggle Admin
- EDI Transaction Viewer
- Schema Registry Browser
- Integration Audit Log
```

---

## 7. Cross-cutting concerns

- C1 Audit chain on every external transaction
- C5 Idempotency on every external endpoint
- C7 Problem details on every error
- C8 Observability traced across boundaries
- C10 Retention: integration audit logs per regulatory class

---

## 8. Wave assignments

```
API Gateway              L4 W0.5; L7 W12
Event Bus                L4 W0.5; L7 W7
Idempotency Service      L4 W0.5; L7 W12
Live API Toggle Registry L4 W4; L7 W12
CDC Pipeline             L4 W4.5; L7 W12
Partner Connectors       L4 W9-W10 (per connector)
EDI Engine               L4 W10
Webhook Subscription     L4 W7; L5 W7
Schema Registry          L4 W4; L7 W8
```

---

## 9. Standards

```
- OpenAPI 3.1.1 (REST contracts)
- AsyncAPI 2.6 (event contracts)
- RFC 9457 (Problem Details)
- ANSI X12, EDIFACT (EDI)
- AS2 / SFTP / web service (EDI transport)
- W3C Trace Context, Baggage (observability propagation)
```

---

## 10. Boundary with adjacent domains

The Integration domain interacts with every other domain (because
every domain has external integration). Specific notes:

- D-01 Commercial: Customer EDI; CRM connector.
- D-02 Engineering: PLM connector.
- D-04 Procurement: Supplier EDI; supplier portal.
- D-06 Production: Edge gateway integration (PART_B8).
- D-11 Finance: GL integration to customer's primary financial system.

---

## 11. Decision phrase

```
C12_INTEGRATION_BASELINE_LOCKED
NEXT: C13_ANALYTICS_AI.md
```

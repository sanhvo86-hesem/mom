# E15 — Integration API

```
api_family:     Integration (Webhook, CDC, Partner Connector, EDI, GraphQL gateway)
owner_role:     API Lead
scope:          External integration: webhook subscriptions, CDC consumer,
                partner connector contracts, EDI exchange, GraphQL convenience
```

---

## 1. Purpose

The Integration API exposes integration concerns to external systems and
to internal services that translate between HESEM's internal protocols
and external protocols.

---

## 2. Endpoints

### E15.1 — Webhook subscription management

**Purpose**: External systems subscribe to HESEM events.

**Audience**: Customer integrations, partner systems.

**Subscription shape**: callback URL, event filter, signature secret,
retry policy.

### E15.2 — Webhook delivery audit

**Purpose**: Retrieve delivery history (delivered, failed, retried) for
a subscription.

### E15.3 — Schema registry

**Purpose**: Retrieve event schemas (Avro + JSON Schema mirror) for
external systems wanting to consume HESEM events.

### E15.4 — Schema registry (admin)

**Purpose**: Author / publish event schemas (governance via ECO).

### E15.5 — CDC consumer probe

**Purpose**: External CDC consumers query consumer state, lag, slot
status.

**Audience**: Internal CDC pipeline + admin.

### E15.6 — Partner connector status

**Purpose**: Check connector health (per partner: Salesforce, SAP,
Oracle, Windchill, Teamcenter, etc.).

### E15.7 — Partner connector configuration

**Purpose**: Configure per-tenant connector (credentials, sync
schedule, mapping).

### E15.8 — EDI engine endpoints

**Purpose**: Submit / retrieve EDI transactions (ANSI X12 or EDIFACT)
per customer agreement.

**Examples**: 850 PO, 856 ASN, 860 PO Change, 810 Invoice, 855 PO Ack,
997 Functional Acknowledgment, 862 Schedule.

### E15.9 — DSCSA / EPCIS (Pharma vertical)

**Purpose**: Per-tenant DSCSA T3 event publishing and retrieval.

### E15.10 — GraphQL gateway

**Purpose**: Convenience GraphQL surface mirroring REST. Same auth,
audit, contracts. Persisted queries only in production.

**Wave target**: L4 by W9.

---

## 3. Authentication and authorization

Per-endpoint requirements. Webhook subscriptions use HMAC signing for
delivery authenticity. Partner connectors use per-connector
credentials.

---

## 4. Failure modes

```
- auth/unauthorized                    401
- auth/forbidden                      403
- contract/schema-violation             422 (event schema mismatch)
- contract/version-deprecated          410
- server/dependency-degraded           503 (partner system down)
- rate-limit/exceeded                  429
```

---

## 5. Wave target

L4 by W7 (webhooks); L4 by W9 (GraphQL); L5 by W10 (vertical-pack
specific exchanges: DSCSA, EDI).

---

## 6. Decision phrase

```
E15_INTEGRATION_API_BASELINE_LOCKED
PART_E_COMPLETE
NEXT: PART_F_FRONTEND_CATALOG/F0_PART_F_OVERVIEW.md
```

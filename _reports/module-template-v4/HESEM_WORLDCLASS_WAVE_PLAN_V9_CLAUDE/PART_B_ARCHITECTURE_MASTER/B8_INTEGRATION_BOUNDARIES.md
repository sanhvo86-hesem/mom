# B8 — Integration Boundaries

This chapter describes how HESEM connects to other systems. HESEM is not
an island; every customer has existing systems that HESEM integrates
with. This chapter describes the integration boundaries, the contracts
that govern them, and the discipline that keeps integration sustainable.

---

## 1. The five integration boundary types

HESEM has five types of integration boundaries, each with its own
discipline:

```
B8.1   The Edge Gateway boundary   (HESEM core to plant-floor PLCs and sensors)
B8.2   The Partner Connector boundary (HESEM to specific external vendor systems)
B8.3   The Customer Portal boundary  (HESEM to customer-facing portal)
B8.4   The Supplier Portal boundary  (HESEM to supplier-facing portal)
B8.5   The Open Standard boundary   (HESEM to any system speaking open standards)
```

Each boundary type is described below.

---

## 2. B8.1 — The Edge Gateway boundary

**Purpose.** Mediate between HESEM core (in IT zone) and plant floor
control systems (in OT zone). Per ISA-95 and IEC 62443 discipline,
HESEM core never talks directly to PLCs or SCADA systems; the Edge
Gateway is the only mediator.

**Topology.**
- HESEM core in IT zone (IEC 62443 SL-2).
- Edge Gateway appliance in DMZ between IT and OT (SL-2 plus SL-3 controls).
- OT zone (SL-3 for regulated verticals).

**Edge Gateway responsibilities.**
- Speak OPC UA (preferred), Modbus TCP, MQTT Sparkplug B, or raw TCP to
  the OT layer.
- Speak HTTPS / mTLS to HESEM core.
- Authenticate per X.509 device certificate (with HSM-backed cert for
  regulated tenants).
- Pre-aggregate telemetry from raw rates (10-100 Hz) to 1-second buckets
  before forwarding upstream.
- Store-and-forward up to 24 hours of events when HESEM core is
  unreachable; replay on reconnect.
- Enforce the 6-prerequisite check before forwarding any OT write
  command (see "OT write path" below).
- Mirror local audit chain to HESEM core via the audit-bridge service.

**OT write path discipline.**
HESEM may issue commands back to the OT layer (e.g., to a PLC) only when
all six of these prerequisites are met:

1. Equipment registered in EQP root with active calibration and zone
   assignment.
2. Operator authorization confirmed (specific equipment-eligible per
   qualification).
3. Workflow state allows the write (state-machine guard in SM-8).
4. Safety interlock evaluator returns clear (no LOTO, no maintenance
   lock, no EHS incident open).
5. Dual-control approval present (two principals signed within 5-minute
   window).
6. Manual override audit chain primed (override would be caught and
   recorded).

If any of the six fails, the command is rejected with HTTP 423 Locked
plus problem-detail "ot/zone-policy-violation".

**Failure modes.**
- Edge Gateway loses connectivity: HESEM core continues; on reconnect,
  store-and-forward replays.
- Edge Gateway certificate expired: written to alarm 30 days ahead.
- OT command rejected: documented in audit, presented to UI as a
  workflow guard failure.

**Owner.** OT Security Specialist with Maintenance Lead.

---

## 3. B8.2 — The Partner Connector boundary

**Purpose.** Connect HESEM to specific external vendor systems where
HESEM does not own the system but depends on data flowing in or out.

**Examples** (not exhaustive):
- Salesforce CRM (sales pipeline; sync orders)
- SAP S/4 HANA, Oracle EBS, Microsoft Dynamics (financial postings)
- PTC Windchill, Siemens Teamcenter (PLM authoritative engineering
  specification; sync item revisions)
- MS 365 / SharePoint, Google Workspace (document repository)
- Slack, Microsoft Teams (notifications)
- Avalara, Vertex (tax engines)
- Cornerstone, SAP SuccessFactors (HR / training)
- IBM Maximo, IFS (legacy maintenance systems being migrated to HESEM)

**Connector architecture.**
- Each connector is a separate component (a sidecar or service).
- Each connector carries its own contract: what data it produces, what
  data it consumes, what events it emits, what failures it surfaces.
- Each connector is signed (cosign) and has a published manifest.
- Connectors live in `hesem-edge` namespace if regional, `hesem-system`
  if global.
- Connectors honor the Authority Ledger: data they produce is treated
  as input from a system, not as authoritative HESEM data; HESEM's
  authoritative records remain HESEM's.

**Discipline.**
- Connector contract version per semver.
- Connector failures alarmed within 5 minutes.
- Connector data quality checks per file 18 (per ingest, per outbound).
- Connector access is per-tenant; no cross-tenant connector data
  leakage.

**Owner.** Per-connector lead (typically Platform Lead for shared
connectors; Vertical Pack Lead for pack-specific).

---

## 4. B8.3 — The Customer Portal boundary

**Purpose.** Customers (the manufacturer's own customers, e.g., the
companies buying the manufacturer's product) interact with HESEM
through a separate portal application.

**Architecture.**
- Separate web application at customer.hesem.io (or per-tenant subdomain).
- SSO from main HESEM identity provider (OIDC).
- Customer-facing permission claims (subset of internal claims).
- Customer-only views: order status tracking, invoice download,
  complaint submission, document download (released CDOC visible per
  customer agreement).
- Customer cannot access internal HESEM workspaces or any data outside
  their own orders / shipments / invoices / complaints.

**Discipline.**
- Customer portal is its own deployment unit (its own pods, own ingress,
  own observability slice).
- Customer portal authenticates via OIDC.
- Customer portal honors all V9 disciplines (Authority Ledger, audit
  chain, RFC 9457, OpenTelemetry).
- Customer portal is feature-flagged; not all tenants enable it.

**Wave introduction.** Wave 9 (W9 stream 9J).

**Owner.** Customer Success Lead with Frontend Lead.

---

## 5. B8.4 — The Supplier Portal boundary

**Purpose.** Suppliers (the manufacturer's suppliers) interact with HESEM
through a separate portal application.

**Architecture.**
- Separate web application at supplier.hesem.io.
- SSO from main HESEM identity provider (OIDC).
- Supplier-facing capabilities:
  - PO acknowledgment
  - ASN (Advanced Shipping Notice) submission
  - Quality score visibility (the supplier's own scorecard)
  - SCAR submission and response
  - Document upload (controlled drop-zone with virus scanning)

**Discipline.** Same as Customer Portal, applied to supplier scope.

**Wave introduction.** Wave 9 (W9 stream 9J).

**Owner.** Procurement Lead with Frontend Lead.

---

## 6. B8.5 — The Open Standard boundary

**Purpose.** Any external system that speaks an open standard HESEM
adopts can integrate with HESEM via that standard. This is the broadest
boundary; the standards are described in PART_A4.

**Open-standard channels HESEM provides.**
- **OPC UA companion specifications**: PackML, Robotics, Vision,
  EUROMAP 77, PROFINET — at the Edge Gateway.
- **MQTT Sparkplug B**: at the Edge Gateway.
- **OpenAPI 3.1.1 REST APIs**: per resource family at L7.
- **AsyncAPI 2.6 event surface**: for partners subscribing to HESEM
  events via WebSocket / SSE / RabbitMQ.
- **GraphQL**: convenience layer on REST (Wave 9).
- **B2MML XML**: for ISA-95 enterprise/MES message exchange (Wave 10).
- **EDI ANSI X12 + EDIFACT**: for automotive / aerospace customer
  exchange (Wave 10).
- **HL7 FHIR (where applicable)**: not in V9 baseline; relevant if
  HESEM extends to medical-device clinical workflows.
- **DSCSA EPCIS**: for pharma serialization exchange (Wave 10).
- **ICH E2B(R3)**: for pharmacovigilance ICSR submissions (Wave 10).

**Discipline.** Each open standard has a documented compliance posture
in PART_J or PART_E. Drift from declared compliance triggers SEV-2.

**Owner.** API Lead for protocol-level standards; Vertical Pack Lead for
vertical-specific standards.

---

## 7. Per-customer integration onboarding

When a new customer onboards, the integration boundary is documented as
part of the Customer Onboarding Plan (PART_I8 + PART_K5):

1. List of external systems the customer expects to integrate.
2. For each external system: which boundary type (Connector / Open
   Standard / Edge Gateway).
3. For each: which data flows (in, out, both).
4. For each: which contract version applies.
5. For each: who owns the integration on the customer side.
6. Per integration: validation evidence (regulated only).
7. Per integration: failure mode contract (what happens when the
   integration is degraded).

This documentation is a key deliverable of the customer onboarding's
Phase P3 / P4.

---

## 8. The "no proprietary protocol" rule

HESEM does not adopt proprietary protocols at any boundary. Where a
specific vendor's protocol is required (e.g., SAP IDoc), the connector
isolates the proprietary protocol behind a HESEM-side open contract.
The connector itself is the proprietary integration; the boundary HESEM
exposes inward is open standard.

This rule serves two purposes:
1. HESEM's own contracts stay open and testable.
2. Replacing one vendor with another does not require rewriting HESEM
   core; only the connector changes.

---

## 9. Decision phrase

```
B8_INTEGRATION_BOUNDARIES_BASELINE_LOCKED
NEXT: B9_OBSERVABILITY_AND_METRICS.md
```

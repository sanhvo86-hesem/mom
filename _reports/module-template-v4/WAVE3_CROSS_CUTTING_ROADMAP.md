# WAVE 3 — Cross-Cutting + Integration + AI/ML Roadmap

**Companion to**: `STRATEGIC_MASTER_V2_WORLDCLASS.md` Part 4
**Duration**: 16 weeks
**Goal**: Add finance core, supply chain depth, AI/ML augmentation, multi-tenancy, customer/supplier portals

---

## Wave 3 streams (parallel)

### Stream 3A: Finance core (4-6 weeks)

#### New roots
- **GL** — General Ledger entry (AR transactional)
- **AP** — Accounts Payable invoice (AR transactional)
- **AR** — Accounts Receivable invoice (AR transactional)
- **FA** — Fixed Asset (AR transactional)
- **COSTRUN** — Cost rollup batch (AR governed-batch)
- **PERIODCLOSE** — Month/quarter close packet (AR governed-release)

#### New workspaces
- **Trial Balance** (WS projection)
- **AP Aging** (WS projection)
- **AR Aging** (WS projection)
- **Cost Roll Comparison** (WS projection: standard vs actual)

#### Platform additions
- Multi-currency engine
- Multi-entity consolidation
- Tax compliance plugin (VAT, GST, multi-jurisdiction)

### Stream 3B: Supply chain depth (4 weeks)

#### New roots
- **DEMANDPLAN** — Demand forecast packet
- **REPLENPLAN** — Replenishment order proposal
- **CYCLECOUNT** — Cycle count instance
- **PHYSINV** — Physical inventory event
- **SHIPMENT** — Outbound shipment (already implicit; formalize)

#### New workspaces
- **Demand Planning Workspace** (WS projection with forecast+actuals)
- **Replenishment Inbox** (WS projection)
- **Inventory Variance Analysis** (WS projection)

### Stream 3C: CRM + commercial (3 weeks)

#### New roots
- **LEAD** — Lead
- **OPPTY** — Opportunity
- **CONTRACT** — Customer contract
- **CREDIT** — Credit profile + collections

#### New workspaces
- **Sales Pipeline** (WS projection)
- **Account 360** (WS projection)

### Stream 3D: HR / EHS (3 weeks)

#### New roots
- **EMPLOYEE** — Employee master
- **SHIFT** — Shift schedule
- **TIMEATTENDANCE** — Time entry
- **SAFETYINC** — Safety incident
- **ENERGYREADING** — Energy reading

### Stream 3E: Asset / maintenance depth (4 weeks)

#### New roots
- **PM-SCHEDULE** — Preventive maintenance schedule
- **RELIABILITY-RUN** — Weibull / MTBF analysis run
- **SPARE-PART** (extends LOT for maintenance bin)

#### New workspaces
- **PM Calendar** (WS projection)
- **Asset Reliability Dashboard** (WS projection — MTBF/MTTR/Weibull)

### Stream 3F: Multi-tenancy (4 weeks platform)

#### Architecture
```
Tenant model:
  - Single physical DB, schema-per-tenant OR shared schema with tenant_id
  - Frozen choice: shared schema with tenant_id (lower ops cost, higher data isolation discipline)
  - Tenant context middleware enforces every query

Tenant management:
  - /admin/tenants CRUD
  - Per-tenant config (locale, timezone, branding, feature flags)
  - Per-tenant rate limits

Migration:
  - All existing tables get nullable tenant_id (migration 200_tenant_id_columns)
  - New rows require tenant_id (after grace period)
  - Default tenant 'hesem' for legacy single-tenant deployments
```

#### ADRs
- ADR-0023: Multi-tenancy data model
- ADR-0024: Tenant context middleware
- ADR-0025: Per-tenant feature flags

### Stream 3G: AI/ML platform (4-6 weeks platform + 2-3 weeks per ML feature)

#### Platform foundation
```
Inference service:
  - Python microservice with FastAPI
  - Model registry (MLflow or simple S3 + version manifest)
  - Batch + real-time inference endpoints
  - Per-model SLO

Feature store:
  - Online (Redis) + offline (PostgreSQL)
  - Feature versioning
  - Backfill from production events

Training pipeline:
  - Triggered manual or scheduled
  - Eval metrics + champion/challenger
  - Promotion gate (manual or automated by metrics)
```

#### ML features (each ~3 weeks)
- **Predictive maintenance** — Weibull + LSTM on equipment sensor data
- **Demand forecasting** — Prophet + transformer ensemble for SO/CPO trends
- **Anomaly detection** — Isolation forest on OEE events (real-time alarms)
- **Defect image classification** — CNN on inspection photos (binary + multi-class)
- **Complaint NLP classification** — BERT-based for customer complaint routing

### Stream 3H: Real-time push + GraphQL (3 weeks platform)

#### WebSocket / SSE
```
WebSocket gateway: subscriber multiplexing per topic
SSE fallback for legacy clients
ADR-0026: Real-time push pattern
```

#### GraphQL gateway
```
GraphQL schema mirrors REST canonical paths
Same auth, same auth, same audit
Convenience layer for frontend bulk queries
ADR-0027: GraphQL gateway scope
```

### Stream 3I: Customer + Supplier portals (4 weeks)

#### Customer portal
```
Separate Next.js / Vue web app at customer.hesem.io
Auth: SSO from main HESEM (OIDC)
Features:
  - Order placement (extends QUO/CPO/SO)
  - Order status tracking
  - Invoice download
  - Complaint submission
  - Document download (controlled docs released to customer)
```

#### Supplier portal
```
Separate web app at supplier.hesem.io
Auth: SSO from main HESEM
Features:
  - PO acknowledgment
  - ASN (advanced shipping notice)
  - Quality score visibility
  - SCAR submission
  - Documentation upload
```

#### ADRs
- ADR-0028: External portal architecture
- ADR-0029: Portal SSO + permission claim
- ADR-0030: Public-API surface for portals

---

## Wave 3 timeline (16 weeks, 4 parallel streams)

```
Week 1-4:    Stream 3F multi-tenancy (foundational, blocks others)
             Stream 3A finance core (parallel)

Week 5-8:    Stream 3B supply chain depth (parallel)
             Stream 3C CRM (parallel)
             Stream 3G AI/ML platform foundation

Week 9-12:   Stream 3D HR/EHS (parallel)
             Stream 3E asset/maintenance (parallel)
             Stream 3G AI/ML feature 1: predictive maintenance

Week 13-16:  Stream 3H real-time push + GraphQL
             Stream 3I customer + supplier portals
             Stream 3G AI/ML features 2-3: demand forecasting + anomaly detection
             Wave 3 integration QA
```

---

## Wave 3 closure deliverables

- ~20 new roots
- 15+ new workspaces
- 10+ new ADRs (total ~32)
- Multi-tenant data model live
- AI/ML platform with 3 production features
- GraphQL gateway live (alongside REST)
- WebSocket / SSE push live
- Customer + supplier portals MVP
- Finance core operational (GL/AP/AR/FA + multi-currency)
- Demand planning + supply chain depth
- ~600+ E2E tests
- Production traffic capacity ~10K concurrent users (load test pass)

```
WAVE3_GO_GATE: WAVE_2_CLOSED + USER_APPROVED_D1_D2_D3_D4_D5
```

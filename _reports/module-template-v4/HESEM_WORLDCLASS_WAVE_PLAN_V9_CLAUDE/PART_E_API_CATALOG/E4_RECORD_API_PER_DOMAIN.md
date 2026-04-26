# E4 — Record API per Domain

```
api_family:     Record APIs (per-resource-family read access)
owner_role:     Per-domain lead (one per the 14 domains in PART_C)
scope:          Read access to authoritative records across all 14 domains
```

This chapter is the master cross-reference for all record-level read
APIs. There is one Record API per resource family (about 95 total
families per the root catalog). Rather than describe each family
endpoint-by-endpoint, this chapter establishes the common shape every
Record API observes, then references the per-domain chapters for any
domain-specific deviations.

---

## 1. Purpose

The Record API is how clients read authoritative records. There is one
API per resource family. They share a common shape so that knowing one
means knowing all.

---

## 2. The common shape per resource family

For every resource family (e.g., Sales Order, Purchase Order, Lot,
Nonconformance Case, Controlled Document, Equipment, Calibration Record,
etc.), the Record API exposes:

### List endpoint

**Purpose**: Retrieve a paginated list of records for a tenant.

**Pagination**: cursor-based (no offset).

**Filter**: per-family filter set; common filters include status, date
range, owner, tag.

**Sort**: stable sort with at least one tiebreaker (typically by id
when other fields tie).

**Audience**: UI workspaces, downstream services, partner integrations.

**Idempotency**: read-only.

**Cache**: per L5 projection refresh policy (typically 5-30 seconds for
high-velocity families, hours for slow-changing master data).

### Single-record endpoint

**Purpose**: Retrieve a single record by id.

**ETag**: returned in response header for use in subsequent If-Match
on mutations.

**Authority class**: returned in response body so clients know whether
this is authoritative, projection, dependency, etc.

### History / audit endpoint

**Purpose**: Retrieve the audit trail for a single record.

**Audience**: Record Shell UI (audit tab), audit pack generator.

### Search endpoint (for families with full-text search support)

**Purpose**: Free-text search over a family's records.

**Audience**: UI search bars, AI-advisory features.

**Note**: Powered by the search index (per OpenSearch in B7).

### Bulk export endpoint (for families with high export volume)

**Purpose**: Bulk export records (CSV, JSON) for analytic or migration
use.

**Audience**: Analytics, customer-side migration tools, audit pack.

**Performance**: long-running operation pattern (E13).

---

## 3. The 14 per-domain Record API chapters (cross-references)

Each domain in PART_C lists the resource families and capabilities. The
Record APIs follow:

```
D-01 Commercial APIs:        Customer, Quotation, CPO, SO, Shipment,
                              Invoice, Complaint, RMA
D-02 Engineering APIs:        Item, Item Revision, BOM, Routing, ECO,
                              CAD Drawing Link, FMEA, Process Flow
D-03 Planning APIs:           MPS, MRP, Capacity Plan, Schedule,
                              Dispatch List, Kit
D-04 Procurement APIs:        Supplier, PO, Receipt, IQC, Supplier
                              Qualification, SCAR, PPAP
D-05 Inventory APIs:          Inventory Transaction, Lot, Serial, WIP,
                              Warehouse Task, Cycle Count, Reservation,
                              Quarantine
D-06 Production APIs:         JO, WO, OPER, Work Instruction, EBR, EDHR,
                              OEE Event, Andon, SPC
D-07 Quality APIs:            INSP, NQCASE, CAPA, CDOC, Audit Finding,
                              MRB, Risk, APR, Deviation
D-08 Traceability APIs:       Lot Genealogy Edge, BREL, Recall, Release
                              Packet, DSCSA Transaction, Serialized Unit
D-09 Maintenance APIs:        EQP, MWO, PMSCH, CAL, MSA, EHS Incident, LOTO
D-10 Workforce APIs:          USER, ROLE, TRAIN_COURSE, TRAIN_RECORD,
                              COMP_MATRIX, Shift, Labor
D-11 Finance APIs:            Standard Cost, Actual Cost, WIP Cost,
                              Variance, Inventory Valuation, COPQ
D-12 Integration APIs:        (most are admin endpoints; see E14)
D-13 Analytics APIs:          OEE Analytics, Quality Analytics,
                              Throughput, Predictive Maintenance,
                              Data Product Catalog, AI Decision Record
D-14 Core Platform APIs:      (most are admin endpoints; see E14)
```

---

## 4. Common authentication and authorization

Every Record API endpoint requires authenticated session.

Per-tenant scoping enforced by middleware + RLS double-defense (per B6
C4).

Per-record authorization via the /can endpoint (E1.7) — typically
coarse-grained (any authenticated user in the tenant can read; specific
roles can mutate). Some sensitive resource families (e.g., regulated
audit records, ITAR-controlled items) have field-level authorization.

---

## 5. Common pagination

```
- Cursor pagination only.
- Default page size: 50.
- Maximum page size: 1000 (admin override possible).
- Pagination cursor includes integrity hash (anti-tampering).
```

---

## 6. Common filtering

Every list endpoint supports at least:
- Status filter (per state machine state)
- Date range (created_at, updated_at)
- Owner filter
- Custom field filter per family

---

## 7. Common cache headers

```
- Authoritative_root list:        Cache-Control: private, max-age=10
- Projection_workspace list:      Cache-Control: private, max-age=5
- Derived_read_model list:        Cache-Control: private, max-age=60
- Audit/historical:               Cache-Control: private, max-age=86400, immutable
- Configuration:                   Cache-Control: public, max-age=300
```

---

## 8. Common failure modes

Most Record APIs return:
```
- auth/unauthorized              401
- auth/forbidden                 403
- workflow/state-machine-not-found 404
- concurrency/precondition-required 428
- rate-limit/exceeded            429
- projection/freshness-stale     503
```

---

## 9. Wave target

Record APIs reach L4 (live read-only) per the wave assignments declared
in each PART_C chapter. Most of D-01 through D-10 reach L4 by Wave 4 to
Wave 8; vertical-pack APIs reach L4 by Wave 10.

---

## 10. Decision phrase

```
E4_RECORD_API_PER_DOMAIN_BASELINE_LOCKED
NEXT: E5_WORKSPACE_PROJECTION_API.md
```

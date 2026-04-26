# E14 — Admin API

```
api_family:     Admin (Tenant Management, Feature Flag, SRE)
owner_role:     Platform Lead
scope:          Tenant provisioning; feature flag management; per-tenant
                configuration; SRE operations
```

---

## 1. Purpose

The Admin API supports the operational management of HESEM itself:
provisioning tenants, managing feature flags, configuring per-tenant
settings, and performing SRE tasks. These endpoints are not exposed to
typical end users.

---

## 2. Endpoints

### E14.1 — Tenant provisioning

**Purpose**: Create / update / suspend a tenant.

**Audience**: Customer Success Lead, Platform Lead.

### E14.2 — Per-tenant configuration

**Purpose**: Configure tenant-level settings (region, vertical pack
flags, custom workflows, branding, locale defaults).

### E14.3 — Feature flag management

**Purpose**: Enable / disable feature flags per tenant per file 14
inert flag registry equivalent.

### E14.4 — Live API toggle management

**Purpose**: Enable / disable per-tenant per-root live API flags
(per V8 file 14 carry-forward).

### E14.5 — Per-tenant cost reports

**Purpose**: Retrieve per-tenant cost attribution (per file 25
equivalent).

### E14.6 — Tenant offboarding (data export + deletion)

**Purpose**: When a tenant departs, export their data per their
agreement, then mark records inactive (with retention compliance).

### E14.7 — SRE operational endpoints

**Purpose**: Service health, deployment status, capacity utilization,
SLO compliance, alerting.

### E14.8 — Database operations (admin)

**Purpose**: PITR initiation, backup verification, migration triggers.

### E14.9 — Disaster recovery initiation

**Purpose**: Initiate failover to DR region; planned drills and
emergency.

### E14.10 — Tenant data residency controls

**Purpose**: Configure per-tenant region pinning (for ITAR / GDPR /
Schrems II compliance).

---

## 3. Authentication and authorization

Authenticated session required. All endpoints require admin or SRE
role. Some endpoints (E14.6, E14.9, E14.10) require multi-party
approval per file 18 approval workflow.

---

## 4. Idempotency

Critical for E14.1 (tenant provisioning), E14.6 (offboarding), E14.9
(DR failover).

---

## 5. Failure modes

```
- auth/unauthorized                   401
- auth/forbidden                     403
- tenant/boundary-violation          403
- server/dependency-degraded         503
- approval/required                  401 (multi-party approval required)
```

---

## 6. Wave target

L4 by W0.5 (basic tenant provisioning); L5 by W9 (full multi-tenancy
controls); L7 by W13 (multi-region).

---

## 7. Decision phrase

```
E14_ADMIN_API_BASELINE_LOCKED
NEXT: E15_INTEGRATION_API.md
```

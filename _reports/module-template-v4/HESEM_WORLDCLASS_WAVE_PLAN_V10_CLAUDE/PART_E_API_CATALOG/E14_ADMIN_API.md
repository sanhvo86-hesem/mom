# E14 — Admin API

```
api_family:     Admin (Tenant Management, Feature Flag, SRE,
                Privacy, Compliance Configuration)
owner_role:     Platform Lead with Compliance Lead and SRE Lead
scope:          Tenant provisioning + offboarding; per-tenant
                configuration; feature flag management; SRE
                operations; privacy + retention configuration;
                DR initiation; data residency control;
                authority + quorum policy management
sources:        OpenAPI 3.1.1, RFC 9457, NIST SP 800-53 r5
                AC + CM controls, SOC 2 CC8.1, ITIL change
                management, FedRAMP equivalent (sovereign
                variants)
```

The Admin API is the operational membrane between HESEM-the-vendor
and tenant-side configuration. Every regulated change to tenant
state passes through here under H7 governance. Multi-party signoff
enforced for tier-A operations (offboarding, DR, region change,
banned-decision boundary tightening).

---

## 1. Purpose and scope

```
IN SCOPE                              OUT OF SCOPE / HANDED OFF
Tenant provisioning + lifecycle         user identity (E1)
Per-tenant configuration                 workflow command (E3)
Feature flag mgmt (per-tenant)           projection (E5)
Live API toggle (live mode flag)
Per-tenant cost report
Tenant offboarding (data export +
 retention compliance)
SRE operational endpoints
Database operations (admin)
DR initiation (drill + emergency)
Tenant data residency controls
Authority quorum policy (per L1 §9)
Per-tenant retention class config
Privacy / DPA / sub-processor list
Per-pack toggle + sub-toggle
Regulatory profile mgmt (per H1 §5)
Branding / theming (visual only)
i18n locale defaults (per F12)
Calendar coordination (audit window;
 per H3 §5; per I8 freeze window)
Customer SLA / tier upgrade
Banned-decision surface mgmt (per L1 §3)
```

---

## 2. Endpoint inventory

### 2.1 Tenant provisioning

```
PATH                              POST /v1/admin/tenant
                                  PATCH /v1/admin/tenant/{id}
                                  GET   /v1/admin/tenant/{id}
PURPOSE                            create / update / suspend tenant
AUDIENCE                            CSM + Platform Lead
PRECONDITIONS                       per K1 tier; per H1 §5 regulatory
                                  profile; per H7 Class A (regulated
                                  impact);
                                  multi-sig for tenant-create
                                  (CSM + Compliance Lead);
                                  for Sovereign / ITAR: + Security
                                  Lead
INPUT                              tenant_name, region, tier,
                                  pack toggles, regulatory profile,
                                  primary admin email (kicks E1
                                  identity), DPA reference,
                                  sub-processor list initial,
                                  per-tenant CSR overlay refs
RESPONSE                            tenant_id;
                                  initial admin invite token;
                                  per-region storage + queue
                                  provisioned
EVIDENCE EMIT                       tenant_provision (EC-22 + EC-2
                                  multi-sig);
                                  per H4 EC-16 change_record
SLO                                 per I8 §2 onboarding tier SLA
RATE LIMIT                          very low
SPECIAL                              IQ executed at provision
                                  (per H2 §11 S8) before tenant
                                  active
```

### 2.2 Per-tenant configuration

```
PATH                              PATCH /v1/admin/tenant/{id}/
                                  config
                                  GET   /v1/admin/tenant/{id}/
                                  config
PURPOSE                            tenant-level settings
INPUT                              region (data residency);
                                  vertical pack flags;
                                  custom workflows (per H7);
                                  branding / theming;
                                  locale defaults;
                                  AAL minimum;
                                  freeze windows;
                                  customer change-window
                                  agreement
ERRORS                              422 below_floor (cannot relax
                                  regulator floor per L1 §9);
                                  403 not-tenant-admin
EVIDENCE EMIT                       config_change (EC-16)
PRECONDITIONS                       most are H7 Class B+; some
                                  Class A (region change;
                                  pack-toggle; AAL floor)
```

### 2.3 Feature flag management

```
PATH                              POST /v1/admin/feature-flag
                                  GET  /v1/admin/feature-flag
PURPOSE                            per-tenant feature flag
                                  enable / disable (per HMV4
                                  flag inert registry; per L2
                                  AI feature toggle; per pack
                                  toggle)
PRECONDITIONS                       per H7 Class A (regulated
                                  impact) or B (cosmetic)
EVIDENCE EMIT                       feature_flag_change (EC-16)
SPECIAL                              regulator floor protected;
                                  cannot disable banned-decision
                                  triple defense
```

### 2.4 Live API toggle (live mode flag)

```
PATH                              POST /v1/admin/live-mode/
                                  {tenant_id}/{root_kind}
PURPOSE                            per-tenant per-root toggle
                                  between fixture mode and live
                                  mode (per HMV4 v4 fixture
                                  discipline)
PRECONDITIONS                       per H7 Class A;
                                  validation evidence current
                                  per H2 §13;
                                  customer ack;
                                  IQ + OQ + PQ evidence per H4
                                  EC-1 verified
EVIDENCE EMIT                       live_mode_change (EC-16 +
                                  EC-2 multi-sig)
SPECIAL                              gates F4 + F5 surfaces from
                                  fixture to live
```

### 2.5 Per-tenant cost reports

```
PATH                              GET /v1/admin/tenant/{id}/cost
PURPOSE                            per-tenant cost attribution
                                  (per I6)
RESPONSE                            per dimension breakdown:
                                  compute, memory, storage,
                                  network, AI inference,
                                  observability, sub-processor;
                                  vs envelope; per period
RATE LIMIT                          medium
EVIDENCE EMIT                       cost_access (EC-22 sampled)
```

### 2.6 Tenant offboarding

```
PATH                              POST /v1/admin/tenant/{id}/
                                  offboard
PURPOSE                            controlled offboarding per
                                  I8 §7
PRECONDITIONS                       multi-party approval:
                                  CSM + Compliance Lead +
                                  Customer-side Quality Lead;
                                  customer notice received +
                                  acknowledged
WORKFLOW                              T+0 initiate;
                                  T+30 final export;
                                  T+60 access disabled;
                                  T+per-H5 retention preserved
EVIDENCE EMIT                       offboarding_record (EC-16 +
                                  EC-2 multi-sig);
                                  final_audit_pack (per H3 §4);
                                  per H5 retention attestation
SPECIAL                              cannot delete data before
                                  retention floor (per H5);
                                  pseudonymization-key destruction
                                  optional per customer choice
```

### 2.7 SRE operational endpoints

```
PATH                              GET /v1/admin/sre/health
                                  GET /v1/admin/sre/deployment
                                  GET /v1/admin/sre/capacity
                                  GET /v1/admin/sre/slo
                                  GET /v1/admin/sre/alerts
PURPOSE                            service health; deploy status;
                                  capacity utilization; SLO
                                  compliance; alert state
AUDIENCE                            SRE team; on-call
EVIDENCE EMIT                       sampled access; SRE actions
                                  retained per H5 audit
```

### 2.8 Database operations (admin)

```
PATH                              POST /v1/admin/db/pitr-initiate
                                  POST /v1/admin/db/backup-verify
                                  POST /v1/admin/db/migration-
                                  trigger
PURPOSE                            PITR (point-in-time recovery)
                                  initiation;
                                  backup verification per I4 §4;
                                  migration triggers per H7
PRECONDITIONS                       per H7 Class A (PITR / migration);
                                  multi-party approval (SRE Lead +
                                  Engineering Lead +
                                  Compliance Lead for regulated)
EVIDENCE EMIT                       db_op_record (EC-16 + EC-2
                                  multi-sig)
```

### 2.9 Disaster recovery initiation

```
PATH                              POST /v1/admin/dr/initiate
                                  POST /v1/admin/dr/drill
PURPOSE                            initiate failover to DR region
                                  (planned drill or emergency)
PRECONDITIONS                       multi-party signoff:
                                  SRE Lead + Platform Lead +
                                  CEO (emergency);
                                  per H7 emergency CR (Class E)
                                  for unplanned;
                                  per I4 §3 RB-DR-002 runbook
EVIDENCE EMIT                       dr_drill (EC-26) +
                                  signature (EC-2 multi-sig)
SLO                                 per I4 §2 RTO + RPO
                                  measurement
```

### 2.10 Tenant data residency controls

```
PATH                              PATCH /v1/admin/tenant/{id}/
                                  region-pinning
PURPOSE                            configure per-tenant region
                                  pinning (per B6 C5 + I4 §5)
PRECONDITIONS                       per H7 Class A;
                                  Compliance + Privacy Lead
                                  signoff;
                                  customer acknowledgment;
                                  for ITAR: Security Lead
                                  signoff;
                                  for GDPR / Schrems II: legal
                                  review
EVIDENCE EMIT                       region_pinning_change (EC-16)
SPECIAL                              cross-region migration is
                                  itself an LRO (per E13 type
                                  registry)
```

### 2.11 Authority quorum policy (per L1 §9)

```
PATH                              PATCH /v1/admin/authority/quorum
                                  GET   /v1/admin/authority/quorum
PURPOSE                            tenant-specific quorum tighter
                                  than regulator floor
PRECONDITIONS                       per H7 Class A (regulated
                                  impact);
                                  Compliance Lead signoff;
                                  cannot relax floor (per L1 §9)
EVIDENCE EMIT                       quorum_change (EC-16)
```

### 2.12 Per-tenant retention class config

```
PATH                              PATCH /v1/admin/retention
                                  GET   /v1/admin/retention
PURPOSE                            per-tenant retention floor
                                  configuration within H5 floor
                                  (longer-of rule)
PRECONDITIONS                       per H7 Class A;
                                  Compliance + Privacy joint
EVIDENCE EMIT                       retention_change (EC-16)
SPECIAL                              cannot shorten per H5 §11 FM4
```

### 2.13 DPA + sub-processor list management

```
PATH                              POST /v1/admin/dpa/sub-processor
                                  GET   /v1/admin/dpa/sub-processor
PURPOSE                            per-tenant sub-processor lifecycle
                                  (add / remove / amend) per L2 §8
                                  + I8 §6
PRECONDITIONS                       per H7 Class A;
                                  Compliance + Legal signoff;
                                  customer notification per DPA
                                  window;
                                  customer objection-window honored
EVIDENCE EMIT                       sub_processor_change (EC-16 +
                                  EC-2 multi-sig)
SPECIAL                              tenant DPO can read; new
                                  addition triggers tenant comm
```

### 2.14 Banned-decision surface management

```
PATH                              POST /v1/admin/banned-decision
                                  GET   /v1/admin/banned-decision
PURPOSE                            governance of banned-decision
                                  list per L1 §1 + §3 (vertical
                                  pack extensions)
PRECONDITIONS                       per H7 Class A;
                                  Compliance + Quality + AI Lead
                                  joint signoff;
                                  cannot relax baseline 8
                                  decisions (regulator floor);
                                  pack-extension addition
                                  permitted; removal requires
                                  explicit period-of-low-scrutiny
                                  attestation
EVIDENCE EMIT                       banned_decision_change (EC-16
                                  + EC-2 multi-sig)
SPECIAL                              triple-defense (CI + runtime +
                                  offline) reverified post-change;
                                  per L1 §6
```

### 2.15 Calendar coordination (audit + freeze windows)

```
PATH                              POST /v1/admin/calendar
                                  GET   /v1/admin/calendar
PURPOSE                            per-tenant audit window + freeze
                                  window calendar (per H3 §5 + I8
                                  §6)
RESPONSE                             upcoming events;
                                  conflict alerts (overlap)
EVIDENCE EMIT                       calendar_event (EC-22)
```

### 2.16 Customer SLA / tier upgrade

```
PATH                              POST /v1/admin/tier-upgrade
PURPOSE                            tier change per K1 + I8
PRECONDITIONS                       per H7 Class B+;
                                  CSM + customer ack;
                                  capacity check (per I5)
EVIDENCE EMIT                       tier_change (EC-16)
```

---

## 3. Authentication + authorization

```
EVERY ENDPOINT                  authenticated session
ELEVATED ROLE                    admin role per type:
                                tenant admin (per E14.2);
                                platform admin (E14.1, E14.7);
                                SRE admin (E14.7-9);
                                compliance admin (E14.6, E14.10-14)
MULTI-PARTY SIGNOFF              for E14.1 create, E14.6 offboard,
                                E14.8 db, E14.9 DR, E14.10 region,
                                E14.11 quorum, E14.13 sub-processor,
                                E14.14 banned-decision
TENANT BOUNDARY                  cross-tenant impossible per B6 C5
HARDWARE TOKEN                    ITAR / CMMC tenants per E7
PRIVILEGED ACCESS                per I7 §3 (PAM; session recording)
```

---

## 4. Cross-cutting concerns

```
PROBLEM DETAILS (RFC 9457)        per error class
H7 GOVERNANCE                       every admin action is itself a
                                 change record (EC-16) per H7
MULTI-SIG                            via E7
EVIDENCE EMIT                          all anchored daily (B6 C1)
TENANT BOUNDARY                         per B6 C5
DEPRECATION                              per E0
RATE LIMITING                            per identity + per tenant
                                 (very low typical)
PII REDACTION                            per role
CUSTOMER NOTIFICATION                     per H1 §3 + DPA windows
DATA RESIDENCY                              per region pinning
```

---

## 5. Failure modes (RFC 9457)

```
TYPE                                  STATUS  MEANING
admin/below-floor                       422     attempt to relax
                                              regulator floor
                                              (per L1 §9 / H5 / etc.)
admin/multi-sig-incomplete               422     quorum not yet met
admin/customer-ack-required               401     per DPA window
admin/cross-tenant-attempt                403     SEV-1 BD-equivalent
admin/freeze-window                         409     attempted change in
                                              tenant freeze window
                                              (per H3 / I8)
admin/capacity-insufficient                503     per I5
admin/migration-blocked                    409     in-flight migration
                                              prevents change
admin/region-blocked                         403     per ITAR / GDPR /
                                              Schrems II
auth/unauthorized                              401
auth/forbidden                                 403
deprecation/sunset                              410
```

---

## 6. SLO + budget

```
2.1 tenant provision               LRO per E13 (long; multi-step)
2.2 config patch p95                  < 500ms write
2.3-2.4 toggle                          < 500ms
2.5 cost                                  < 500ms
2.6 offboard                              LRO per E13
2.7 SRE                                    < 250ms
2.8 db ops                                  LRO per E13
2.9 DR                                       LRO per E13
2.10-2.16 admin patches                       < 500ms write
ERROR RATE                                    per SLO-9
```

---

## 7. Wave target

```
W0.5      L4 substrate (basic tenant provision; SRE
          health; feature flags)
W3        L5 active (config; cost; live mode toggle;
          retention)
W5        offboard + DR drill workflow
W7        SOC 2 + DORA Elite path
W9        full multi-tenancy controls;
          banned-decision surface mgmt
W10       per-pack overlay
W12       sovereign region variants;
          quorum policy active
W13       multi-region DR + SBOM provenance for admin
          actions
```

---

## 8. Per-pack overlays

```
PHARMA (J1)                      QP / Designated Person config;
                                 DSCSA trading partner add;
                                 EU FMD partner add;
                                 stability protocol governance
AUTO (J2)                        per-OEM CSR overlay;
                                 customer EDI partner add;
                                 PPAP signoff role
AERO (J3)                        ITAR person-of-record;
                                 NADCAP cycle calendar;
                                 GIDEP submission gov;
                                 service-life-limited part
                                 governance
MD (J4)                          PRRC config;
                                 NB engagement;
                                 PCCP envelope governance
FOOD (J5)                        PCQI appointment;
                                 HACCP plan reauthorization;
                                 FSMA §204 partner config
```

---

## 9. Failure modes (operational)

```
FM1   Regulator floor relaxation attempt
      Behavior: 422 admin/below-floor
      Recovery: per L1 §9 enforcement;
              tenant comm

FM2   Multi-sig incomplete
      Behavior: 422 admin/multi-sig-incomplete
      Recovery: complete quorum then retry

FM3   Customer ack absent
      Behavior: 401 admin/customer-ack-required
      Recovery: per DPA window; retry post-ack

FM4   Cross-tenant admin attempt
      Behavior: 403 SEV-1
      Recovery: per B6 C5; H8 systemic

FM5   Freeze window violation
      Behavior: 409 admin/freeze-window
      Recovery: respect freeze; re-schedule;
              emergency-override requires CEO ack

FM6   Capacity insufficient (e.g., tier upgrade)
      Behavior: 503 admin/capacity-insufficient
      Recovery: per I5 capacity plan;
              per CSM intervention

FM7   Region change blocked (ITAR / GDPR)
      Behavior: 403 admin/region-blocked
      Recovery: per legal review; alternative path

FM8   Banned-decision floor relaxation
      Behavior: 422 admin/below-floor
      Recovery: per L1 §9; cannot relax baseline

FM9   Sub-processor add without DPA amendment
      Behavior: 422 admin/customer-ack-required
      Recovery: per DPA cycle; legal review

FM10  DR drill failed
      Behavior: per I4 §10 FM4
      Recovery: STOP-5 program halt if 2 consecutive
              fails; H8 systemic CAPA
```

---

## 10. Roles and authority (RACI)

```
ENDPOINT             PLAT  CSM  COMP  SEC  PRIV  TENANT  CEO
2.1 tenant provision  A     A    A    -   -     -       -
2.2 config            A     C    -    -   -     A       -
2.3 feature flag      A     -    C    -   -     A       -
2.4 live mode         A     C    A    -   -     A       -
2.5 cost              A     R    -    -   -     R       -
2.6 offboard          A     A    A    C   A     A       -
2.7 SRE               A     -    -    -   -     -       -
2.8 db ops            A     -    A    -   -     -       -
2.9 DR (drill)        A     -    A    A   -     -       -
2.9 DR (emergency)    A     -    A    A   -     -       A
2.10 region           A     -    A    A   A     A       -
2.11 quorum           A     -    A    -   -     A       -
2.12 retention        A     -    A    A   -     A       -
2.13 sub-processor    A     -    A    C   A     A       -
2.14 banned-decision  A     -    A    -   -     A       -
2.15 calendar         A     A    C    -   -     A       -
2.16 tier upgrade     A     A    -    -   -     A       -
```

---

## 11. Cross-references

- B6 — RBAC + tenant boundary substrate
- E0 — API conventions
- E1 — identity issuance for new tenant admin
- E2 — authority for governance signoff
- E7 — multi-sig for admin actions
- E11 + E13 — bulk + LRO orchestration for offboarding / migration
- F1 + F4 — admin UI surfaces
- H1 §3 + §5 — regulator notification + tenant profile
- H3 §5 — calendar coordination
- H4 — change_record (EC-16) + multi-sig (EC-2)
- H5 — retention + WORM + offboarding
- H7 — change control (canonical)
- I3 — incident-driven admin
- I4 — DR + backup
- I5 — capacity coupling
- I6 — cost classification
- I7 — privileged access
- I8 — tenant operations (canonical)
- L1 §3 + §9 — banned-decision boundary + tenant config floor
- L2 §8 — sub-processor governance
- M5 — admin SLOs
- M9 — cross-reference

---

## 12. Decision phrase

```
E14_ADMIN_API_BASELINE_LOCKED
NEXT: E15_INTEGRATION_API.md
```

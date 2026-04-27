# I8 — Tenant Operations and Customer Onboarding

```
chapter_purpose: per-tenant lifecycle from onboarding through steady
                 state through offboarding; access reviews; regulatory
                 profile; QBR cadence; per-tenant change management;
                 CVLP delivery; auditor portal; per-tenant feature flags;
                 tenant KPIs
owner_role:      Customer Success Lead with Implementation Lead
sources:         SOC 2 CC6.1-CC6.7 logical and physical access,
                 ISO 27001:2022 A.5.15-A.5.18 access management,
                 GDPR Art 28 processor obligations, NIST SP 800-53 r5
                 SA and AC control families, FinOps Foundation
                 customer maturity model, ISO 44001 collaborative
                 business relationships, ITIL 4 customer lifecycle
```

A tenant is the unit of accountability for HESEM. Every regulated
guarantee resolves at the tenant boundary: data is per-tenant, audit
chain is per-tenant, billing is per-tenant, regulatory relationship is
per-tenant. This chapter is the operational discipline of that boundary,
from first sales contact to final deletion confirmation.

---

## 1. Onboarding phases (canonical 8-phase)

### Phase 1 — Discovery (1–2 weeks)

```
PURPOSE
  Establish mutual understanding of the tenant's regulatory posture,
  data scale, vertical pack requirements, existing systems integration
  needs, and success criteria before any provisioning begins.

INPUTS
  Customer industry profile (SIC / NAICS code; regulated vs
    non-regulated product lines)
  Applicable regulatory bodies (FDA, EMA, NHTSA, FAA, USDA, CFDA,
    MHRA, TGA, etc.)
  Pack selection intent (J1 Pharma, J2 Auto, J3 Aero, J4 MD, J5 Food)
  Data scale estimate (active lots, active devices, active suppliers,
    active users, annual record volume)
  Existing systems and integration list (ERP, LIMS, MES, supplier
    portals, EDI partners)
  Compliance posture (existing QMS certifications; last audit date;
    open CAPAs; known gaps)

OUTPUTS
  Statement of Work (SoW) signed
  Tier proposal with cost overlay per I6 §6
  Vertical-pack-toggle decision list
  Project plan with owner assignments and milestone dates
  Success criteria (measurable KPIs agreed between tenant and HESEM)
  Regulatory profile draft (per §3 below; finalized in P3)

OWNER
  Sales + Customer Success Manager + Implementation Lead
```

### Phase 2 — Validation Scoping (2–4 weeks; regulated tenants only)

```
PURPOSE
  Establish the boundary of the tenant's validation obligation and
  map HESEM's CVLP (H2 §14) against the tenant's existing validated
  state. Produce a per-tenant validation plan before any regulated
  configuration begins.

INPUTS
  Tenant's User Requirements Specification (URS) or equivalent
  Tenant's existing system validation documentation for legacy systems
  Risk assessment per H9 (risk classification of the HESEM
    implementation in the tenant's GxP context)
  HESEM CVLP current version (per I8 §8)
  Per-pack validation overlay (H2 §15)

OUTPUTS
  Per-tenant Validation Plan (document: VP-[tenant_id]-001)
    - Validation scope boundary
    - GAMP 5 category assignment for HESEM per H2 §4
    - IQ / OQ / PQ scope per H2 §11..§13
    - Test protocol scope and resource assignment
    - Schedule aligned with go-live target
  Validation depth tier: light / moderate / full (per H2 §3)
  Gap analysis between HESEM CVLP and tenant URS
  Per-pack overlay decisions (Pharma/MD/Aero appendices)

OWNER
  Customer Validation Lead (tenant-side) + HESEM Validation Engineer
  + Vertical Pack Lead (per pack)
```

### Phase 3 — Tenant Provisioning (1–2 weeks)

```
PURPOSE
  Physically create the tenant in HESEM: tenant root, region
  selection, IAM, SSO, initial admin account, pack toggles, IQ
  execution.

STEPS
  1. Tenant root created in multi-tenant registry
  2. Region selected per regulatory profile (H1 §5 data residency)
  3. DR region configured per I4 (Enterprise / Sovereign tiers)
  4. IAM configured: SSO IdP integration (OIDC / SAML per I7 §3.1)
  5. Initial tenant admin account created; credentials provisioned
     via hardware token for Enterprise / Sovereign
  6. Vertical pack toggled per SoW; pack flags activated
  7. Feature flags per §10 set to agreed initial state
  8. IQ executed: Installation Qualification per H2 §11
     - Evidence emitted: EC-1 (IQ subtype) per H4
     - IQ summary signed by HESEM Validation Engineer and
       tenant Quality Lead
  9. Tenant regulatory profile finalized per §3 below

OUTPUTS
  Tenant active in HESEM multi-tenant registry
  Tenant admin account live; credentials delivered securely
  IQ summary report (EC-1 evidence; retained per H5)
  Regulatory profile record created

OWNER
  Implementation Lead + Security Lead + Vertical Pack Lead
```

### Phase 4 — Master Data Migration (2–6 weeks)

```
PURPOSE
  Load the tenant's foundational master data into HESEM so that
  operational workflows start from a verified baseline rather than
  empty state.

SCOPE (per pack)
  Core: Item master, Customer, Supplier, Equipment, User, Role,
        Lot / Batch master, Specification, Routing, BOM,
        Workflow templates, Document templates, Org units
  Pharma add: Active substance master, Stability schedule,
              Registered products, LIMS reference data
  Med Device add: Medical device master (MDevice root), DHF
                  index, Device history record skeleton, SOUP
                  register
  Auto add: Customer part master, Customer-specific requirements,
            PPAP submission history skeleton
  Aero add: AS9100D approval items, ITAR-controlled part list,
            Authorized supplier list
  Food add: HACCP plan reference data, SQF element list,
            Environmental monitoring zone map

STEPS
  1. Extract: tenant provides extract from legacy system in
     agreed format
  2. Transform: data mapping + cleaning per agreed schema
  3. Load: staged import via bulk import API per E14 equivalent
  4. Reconcile: cross-foot count per entity type; sample
     integrity check (10% sample spot-check); business rule
     check (BOM completeness, spec linkage, role assignment)
  5. Sign-off: tenant Data Lead + HESEM Implementation Lead
     sign migration verification record

EVIDENCE
  Migration record per H4 (EC-16 subtype: migration_event);
  fields: tenant_id, entity_type, record_count_source,
  record_count_loaded, reconciliation_result, issues_list,
  sign_off_timestamp, sign_off_users
  Retained per H5

OWNER
  Implementation Lead (HESEM) + Customer Data Lead (tenant)
```

### Phase 5 — Configuration (2–8 weeks)

```
PURPOSE
  Activate the tenant's operational configuration: domain-specific
  workflows, effective dates, user assignments, role mappings,
  SLO thresholds, and OQ execution.

STEPS
  1. Domain workflow configuration (per Part C; D-series domains)
  2. Per-domain SOPs drafted and linked to HESEM workflow templates
  3. Effective dates established for all operational configurations
  4. User assignment to roles; role mapping to tenant org chart
  5. SLO targets configured per agreed tier (per M5 per-tenant
     thresholds)
  6. AI feature toggles per §10: shadow mode enabled per L3 ramp
  7. Integration configuration: E15 integration API endpoints;
     EDI / DSCSA / MES links per pack
  8. OQ executed: Operational Qualification per H2 §12
     - Evidence emitted: EC-1 (OQ subtype) per H4
     - OQ summary signed by HESEM Validation Engineer and
       tenant Quality Lead

OUTPUTS
  Per-tenant operational runbook (documented procedure for
    tenant admin; covers day-to-day + escalation)
  OQ summary report (EC-1 evidence; retained per H5)
  Configuration baseline record (snapshot; version-controlled)
  Integration test results per integration type

OWNER
  Domain Leads per Part C (HESEM) + Customer Operations Lead
    (tenant) + Quality Lead (tenant)
```

### Phase 6 — Pilot Operation (4–12 weeks)

```
PURPOSE
  Limited-scope go-live: tenant operates a subset of processes
  in HESEM while Production Qualification (PQ) observation runs.
  Issues resolved before full cutover.

STEPS
  1. Scope defined: select 2–4 workflows and 1–2 product families
     as pilot scope; full scope per Phase 7
  2. Live operations begin in pilot scope
  3. PQ observation per H2 §13: collect performance data across
     ≥ N operational cycles per agreed sample size
  4. AI feature ramp: shadow mode active; advisory-only disclosure
     (per L3 ramp protocol); human validation of AI suggestions
  5. Issues logged in per-tenant issue register; SEV classified
     per I3 conventions
  6. Iterative refinement: bug fixes, config adjustments, runbook
     updates
  7. Tenant team trained on regular operational procedures (per D8)
  8. PQ observation complete when sample size met and acceptance
     criteria confirmed

OUTPUTS
  PQ summary report (EC-1 evidence subtype; retained per H5)
  Per-tenant issue register (open items resolved or risk-accepted)
  Per-tenant readiness signoff (tenant Quality Lead + HESEM CSM
    countersign)
  AI feature shadow-mode performance report (per L3 §4)

OWNER
  Customer Operations Lead + HESEM CSM + Implementation Lead
```

### Phase 7 — Pre-Production Cutover (2–4 weeks)

```
PURPOSE
  Transition from limited pilot to full operational scope; prepare
  communications, on-call, and rollback plans.

STEPS
  1. Training: full user base trained per D8 training plan
  2. Runbook handoff: tenant admin receives final operational
     runbook; HESEM CSM confirms understanding
  3. On-call rotation established: HESEM SRE + tenant contact
     for cutover window
  4. Communication plan: stakeholder list; message templates;
     status page subscription
  5. Freeze window scheduled with HESEM Platform (per H7 and
     I5 capacity calendar)
  6. Rollback plan documented: conditions, owner, steps, timeline
  7. Cutover window executed: full-scope activation

OUTPUTS
  Cutover plan signed by HESEM Implementation Lead + tenant QP /
    PRRC / Designated Person (per pack)
  Rollback plan documented and tested
  Communication sent to tenant stakeholders
  Status page entry for cutover window

OWNER
  CSM + Customer Operations Lead + SRE Lead (HESEM)
```

### Phase 8 — Steady State (ongoing)

```
PURPOSE
  Ongoing operational relationship: SLA monitoring, QBR, periodic
  review support, audit support, CVLP updates, upgrade adoption.

ACTIVITIES
  SLA monitoring per tier promise (per §2)
  QBR per §5 (quarterly)
  Periodic review coordination per H6 (per tenant schedule)
  Audit support per H3 and §9 auditor portal
  Customer Validation Leverage Pack delivery per §8 (per release)
  Upgrade adoption assistance (per H7 platform CR communication)
  Health score tracking per §11

OWNER
  CSM (HESEM) + Domain Leads + Tenant Admin
```

---

## 2. Per-tier onboarding SLA

```
TIER          TOTAL IMPL   CSM SCOPE             VALIDATION DEPTH
──────────────────────────────────────────────────────────────────────
Standard      4–8 weeks     shared pool;          light; tenant self-
                            business-hours         service with CVLP
Pro           8–16 weeks    dedicated CSM;         moderate; assisted
                            business-hours         IQ/OQ; tenant PQ
Enterprise    16–52 weeks   dedicated CSM;         full per H2;
                            24×5 coverage          HESEM supports IQ,
                                                   OQ, PQ co-execution
Sovereign     per agreement per-agreement          full + per-tenant
                            extended; 24×7         isolation review
                            coverage
Pilot         2–4 weeks     limited shared         none (pre-production
                                                   only)

PACK ADD-ONS (on top of base tier)
+Pharma       +20–24 weeks  validation specialist  full GAMP 5; APR
                            assigned               readiness; site
                                                   validation audit
+Med Device   +16–20 weeks  validation specialist  DHF migration review;
                                                   SOUP register build;
                                                   TPLC baseline
+Auto         +10–12 weeks  OEM CSR integration    APQP integration test;
                            specialist             per-OEM CSR
+Aero         +40–52 weeks  ITAR compliance lead   AS9100D + NADCAP +
                            assigned               ITAR onboarding;
                                                   CMMC readiness
+Food         +10–12 weeks  food safety specialist HACCP + FSMA §204
                                                   baseline; EMP config
```

---

## 3. Tenant regulatory profile (canonical record)

The tenant regulatory profile is the authoritative record of a tenant's
jurisdictional obligations, pack configuration, and contract scope.
Changes to the profile are Class A changes per H7 (require QP / PRRC /
Designated Person co-sign where applicable).

```
ATTRIBUTE                          SUBSTANCE
─────────────────────────────────────────────────────────────────────
tenant_id                          system-generated UUID; immutable
tenant_name                        legal entity name; per DPA
incorporation_jurisdiction         country of incorporation; per legal
data_residency_region              primary region per B6 C5; locked
                                   at provisioning; change = H7 Class A
secondary_residency_region         DR region (per I4); Enterprise /
                                   Sovereign only
vertical_pack(s)                   J1..J5 enabled flags; change = H7
                                   Class A
sub_vertical_risk_class            per pack: e.g., MD class I / II / III;
                                   Pharma sterile / non-sterile; Aero
                                   defense / commercial
applicable_regulators              list: FDA, EMA, MHRA, TGA, NHTSA,
                                   FAA, USDA, CFDA, etc.
applicable_jurisdictions            list: determines notification windows
                                   per H1 §3; GDPR / CCPA / PIPL flags
contract_tier                       Standard / Pro / Enterprise /
                                   Sovereign / Pilot per K1
QP_PRRC_DP_designee                Qualified Person / PRRC / Designated
                                   Person: name, registration, email;
                                   required for sign-off events per
                                   relevant pack
authorized_representative_EU       per MDR Art 11 (J4 tenants in EU)
DPO                                 Data Protection Officer; per GDPR
                                   Art 37 where required
identity_proofing_level             IAL2 (standard); IAL3 (ITAR / CMMC)
contract_term                       start date, end date, renewal window
DPA_version                         current DPA effective date + version
sub_processor_list                  per DPA addendum; tenant approved
customer_specific_requirements      L4 overlay rule pack entries specific
                                   to this tenant (per H1 §4 CSR
                                   ingestion)
auditor_portal_scope               date range; record classes; audit
                                   purpose; expiration (per §9)
freeze_windows                      agreed change-freeze periods (e.g.,
                                   annual audit window; product launch
                                   freeze per OEM CSR)
notification_preferences           per DPA + per H1 §3; escalation
                                   contacts; preferred channel
key_management_model               HESEM KMS / customer-managed key
                                   (CMK) per I7 §4.1
KPI_thresholds                      agreed SLO deltas from platform
                                   defaults (where tier allows)
data_classification_flags           PII / PHI / CUI / FCI presence
                                   flags; determines I7 controls tier
pack_certification_status           J1..J5 HESEM certification applicable
                                   to this tenant's scope (ISO 13485,
                                   AS9100D, SQF, etc.)
```

---

## 4. Tenant access reviews

Access reviews are a control obligation at multiple frequencies. The
review owner is Security Lead + Customer Success Lead jointly.

```
ACCESS TYPE              FREQUENCY        PROCEDURE
─────────────────────────────────────────────────────────────────────
Privileged (HESEM-side)  Quarterly        per SOC 2 CC6.3 +
                                          ISO 27001 A.5.18; review
                                          all HESEM admin access to
                                          tenant data; orphan account
                                          auto-detected; summary report
                                          per tenant

Standard tenant users    Semiannual       tenant admin performs review
                                          via admin portal; HESEM CSM
                                          confirms completion; orphan
                                          accounts flagged if SSO SCIM
                                          sync shows departure

Role-change immediate    Per event        any role elevation, scope
                                          change, or new privileged
                                          assignment triggers same-day
                                          review by tenant admin +
                                          HESEM Security Lead sign

Orphan account           Monthly auto     SSO SCIM sync cross-checked
detection                                 against active-user list;
                                          orphans auto-flagged for
                                          deprovisioning within 24h
                                          of confirmation

Auditor access           Per session      provisioned per §9; expiration
                                          enforced; auto-deprovision;
                                          every session logged

HESEM support access     Per incident     break-glass only; explicit
                                          tenant admin approval per
                                          incident; session recorded;
                                          post-incident review per I3;
                                          access auto-revoked at incident
                                          close

Cross-tenant access      Forbidden        API gateway enforces tenant_id
                                          scope; audit chain checks cross-
                                          tenant reference; violation =
                                          SEV-1 + H8 systemic CAPA

Emergency break-glass    Rare; per IR     multi-person quorum (SRE Lead
                                          + Compliance Lead); auto-revoke
                                          after defined TTL; post-incident
                                          review per I3; evidence per H4
```

---

## 5. Quarterly Business Review (QBR)

### 5.1 Input package

```
INPUT                               SOURCE
─────────────────────────────────────────────────────────────────────
SLA compliance report per period    I2 SLO dashboard; per-tier SLA
SLO performance vs target           M5 SLO directory; per-tenant
                                    configured thresholds
Incident history (SEV-0..SEV-2)     I3 incident register; resolved +
                                    in-flight CAPAs (H8 link)
Change history per H7               change register for period;
                                    tenant-visible impacts summarized
Cost vs budget per I6               FinOps attribution report; actuals
                                    vs tier envelope; optimization
                                    savings realized
AI feature KPIs per L2 §6          where AI features enabled; usage,
                                    accuracy drift, advisory adoption
                                    rate; L3 ramp progress
CAPA status per H8                  open CAPAs affecting tenant;
                                    closure rate; overdue items
Audit / inspection findings         H3 audit record; per-tenant
                                    findings and responses
Validation evidence freshness       H2 §13 re-validation triggers;
                                    any outstanding re-IQ/OQ items
Security posture update             I7 relevant findings; patch SLA
                                    compliance for tenant-facing
                                    components
```

### 5.2 Outputs and commitments

```
Customer health score             composite: SLA compliance (30%),
                                  incident MTTR (20%), cost health
                                  (15%), audit pass rate (15%),
                                  user adoption (20%); trend vs
                                  prior 3 quarters
Roadmap discussion                HESEM roadmap items relevant to
                                  tenant regulatory obligations; tenant
                                  requests fed to product backlog
Risk register update              identified operational risks; per
                                  H9 risk class; HESEM mitigation
                                  commitments
Action items                      each action: owner, due date, H8
                                  CAPA or project link where systemic
Renewal trajectory                K5 renewal signal; expansion
                                  opportunities identified
Documentation                     QBR minutes retained per H5
                                  (EC-36 operational metric evidence)
```

### 5.3 Cadence

```
Standard tier:    QBR every 6 months (BHR — Business Health Review)
Pro tier:         QBR quarterly
Enterprise tier:  QBR quarterly + monthly operational check-in
Sovereign tier:   QBR monthly + weekly operational sync during
                  any active regulated event
Pilot tier:       Milestone reviews at end of each phase
```

---

## 6. Per-tenant change management

All platform changes affecting tenants follow H7. Below are the
tenant-specific scoping rules for each change type.

```
CHANGE TYPE                   CLASS    TENANT NOTIFICATION    TENANT APPROVAL
───────────────────────────────────────────────────────────────────────────────
Platform change (HESEM-       per H7   impact summary for     required for
released new version)         class    regulated-path changes Class A; for
                                       delivered per CVLP (§8) Enterprise /
                                                               Sovereign tiers

Tenant configuration change   per H7   tenant-owned CR; HESEM tenant has
(tenant's own settings)       class    reviews for compliance  approver quorum
                                       impact                  (Quality Lead
                                                               + tenant admin)

Tenant master data migration  H7 B     per change window;     migration
                                       HESEM notified in       sign-off per §1
                                       advance                 Phase 4 protocol

Tenant role / RBAC change     H7 C     per access review      tenant admin +
                                       (§4)                    Security Lead
                                                               co-sign for
                                                               privileged roles

Vertical pack toggle          H7 A     minimum 30 days        QP / PRRC /
                                       advance notice;         Designated Person
                                       validation re-scope     co-sign;
                                       communicated            validation plan
                                                               update required

Tier upgrade                  H7 B     CSM-facilitated;       tenant admin;
                                       capacity check per I5   FinOps approval

Region migration              H7 A     minimum 60 days;       tenant admin +
                                       cross-region plan       QP / PRRC +
                                       disclosed               legal (DPA)

Key rotation (tenant CMK)     H7 C     automated notification  tenant admin
                                       per rotation event      acknowledgement

DPA amendment                 H7 A     per legal process;     tenant legal +
                                       effective per           HESEM DPO
                                       amendment date

Sub-processor addition        H7 A     per DPA objection      objection window
                                       window (typically 30    honored; tenant
                                       days); written notice   can exit per
                                                               DPA terms

Emergency change              H7 E     retrospective notice   post-change
affecting tenant              within   within 24h of change    review with
                              emergency if regulatory impact    tenant within
                              window                           5 business days
```

---

## 7. Tenant offboarding (canonical lifecycle)

Offboarding is itself a regulated operation. Retention obligations
may prevent immediate deletion for certain packs; the contract
reflects this before engagement begins.

```
T+0     Notice received (typical contractual notice: 30–90 days)
        Trigger: formal written notice from tenant; acknowledged
        by HESEM CSM; offboarding plan initiated

T+a     Data export planning (within 10 business days of T+0)
        Agreed format: JSON + CSV + PDF audit pack
        Agreed schema: per E8 evidence API export format
        Scope: all tenant data per H5 classes; all evidence
        records; all audit chain entries
        Owner: Implementation Lead + tenant Data Lead

T+b     Final data export executed (by T+14 days minimum before
        T+d; Enterprise / Sovereign: per SLA agreed in SoW)
        Export signed: HESEM Implementation Lead + tenant
        Quality Lead digital signature on export manifest
        Export integrity check: hash manifest per EC-33

T+c     Customer acknowledgement received in writing
        Tenant confirms receipt and integrity of export
        Retained as evidence EC-16 (migration_event subtype:
        offboarding_export_ack)

T+d     Live access disabled
        Tenant user accounts deprovisioned
        API keys revoked; SSO federation removed
        Tenant data isolated to archive-only read mode
        HESEM CSM confirms deprovisioning to tenant in writing

T+e     Per H5 retention floors (varies by pack):
        Pharma: 1 year post-last-use + 5 years minimum (GxP)
        Med Device: life-of-device + 5 years (MDR)
        Auto: per OEM CSR agreed retention
        Aero: 10+ years per aviation records requirement
        Food: 2 years § 204; HACCP per FSMA floor
        HESEM acts as custodian per DPA during retention window
        Tenant access to archived data: read-only via
        legacy auditor portal scope with HESEM CSM co-review

T+(retention-expiry)
        Retention expiry trigger per H5 scheduled job
        Deletion confirmation sent to tenant before execution
        (14-day notice period)
        Data deleted per deletion procedure (per H5 §7);
        deletion manifest signed and delivered to tenant
        Final deletion confirmation letter retained per H5

CMK DESTRUCTION
        Tenant may elect pseudonymization key destruction at
        T+d (effectively irreversible pseudonymization of
        records); this option cannot be reversed; tenant
        Quality Lead co-signs destruction record;
        evidence: EC-16 (key_destruction_event)
```

---

## 8. Customer Validation Leverage Pack (CVLP) delivery (per H2 §14)

Per every platform release, HESEM assembles and delivers CVLP to
tenants with regulated packs enabled. Delivery is automated via E8
secure channel; notification to tenant DPO + Quality Lead.

```
CVLP ARTIFACT                       APPLICABILITY
─────────────────────────────────────────────────────────────────────
Platform IQ template                  all regulated tenants; re-execute
                                      on infrastructure change
Platform OQ evidence per affected     delta per release; capabilities
capability                            changed in this release documented
Platform PQ continuous monitoring     ongoing; per I2 operational
evidence                              metrics for PQ observation period
DHF excerpt (security + validation)   J4 Med Device tenants; per-release
                                      delta to DHF per IEC 62304
SBOM (CycloneDX) + Sigstore           all tenants; per I1 §9 + I7 §7.2
attestation
Latest penetration test report        all regulated tenants; per I7 §8;
(executive summary)                   restricted scope to HESEM platform
SOC 2 Type II report                  from W12/W13 when available; covers
                                      prior 12-month window
ISO 27001 / ISO 13485 certificate     when applicable; per pack
Customer-side validation gap list     HESEM assessment of remaining
with templates                        customer validation obligations;
                                      template test protocols provided
Per-pack evidence supplement:
  Pharma: APR evidence templates      J1 tenants
          PSUR contribution data
  Med Device: safety report evidence  J4 tenants
              DHR template updates
  Auto: PPAP capability evidence      J2 tenants
        APQP phase evidence
  Aero: AS9100D / NADCAP evidence     J3 tenants
        FAI template updates
  Food: HACCP audit evidence          J5 tenants
        § 204 traceability report
```

CVLP version is bound to the platform release version. Tenants must
maintain a mapping of HESEM platform version → CVLP version → their
own validation status. HESEM tracks this mapping in the tenant
regulatory profile per §3.

---

## 9. Auditor portal (per H3 §7)

The auditor portal provides scoped, read-only access to a tenant's
evidence records for use during regulatory inspections, customer
audits, or certification surveillances.

```
PROVISIONING
  Request submitted by tenant Quality Lead via admin portal
  Scope defined: date range, record classes (per H4 EC list),
    audit purpose (e.g., FDA PAI, ISO 13485 surveillance,
    AS9100D initial certification), sample methodology
  HESEM Security Lead reviews scope; confirms cross-tenant
    barrier is enforced for scope submitted
  Auditor account created: scoped read-only role;
    expiration date (maximum 90 days; renewable with request)
  Credentials delivered via secure channel to tenant admin;
    tenant admin delivers to auditor

SCOPE ENFORCEMENT
  Cross-tenant barrier: absolute; no auditor account can view
    records outside the scoping tenant_id; enforced at API
    gateway + OTG query layer
  Date-range filter: enforced at query layer; records outside
    range return 404 (not 403) to prevent information leakage
  Record-class filter: enforced per H4 EC-class per scope
    definition; no over-broad "all records" scope permitted
    without explicit tenant + HESEM CSM approval

QUERY AUDIT LOG
  Every auditor query logged per H4 EC-31 (audit_event);
  fields: auditor_account_id, query_type, parameters,
  record_count_returned, timestamp
  Retained per H5; cannot be deleted even by tenant admin

SESSION RECORDING
  Where contract requires; session capture enabled per IAM
  policy; recording retained per H5

RE-AUDIT REPLAY
  Same scope query executed at a later date returns the same
  sample deterministically; query parameterized by date range
  and record class; result set is point-in-time frozen snapshot
  per H3 §6

EXPIRATION
  Auto-deprovision at expiration date; no extension without
  new request; tenant Quality Lead notification 7 days before
  expiration

EMERGENCY ACCESS (during active inspection)
  If auditor requires broader scope mid-inspection, tenant
  Quality Lead submits scope expansion; HESEM Security Lead
  reviews within 2 hours; H7 Class C CR for scope change
  evidence
```

---

## 10. Per-tenant feature flags

Feature flags allow per-tenant opt-in or opt-out of capabilities,
subject to regulatory floor enforcement. The floor cannot be disabled
by tenant admin; HESEM blocks any configuration below the compliance
floor.

```
FLAG TYPE                      OWNER           EVIDENCE
─────────────────────────────────────────────────────────────────────
Vertical pack toggle            HESEM +         H7 Class A CR; EC-16
                                tenant admin    validation re-scope

AI feature toggle               tenant admin    H7 Class B CR; L3
                                (per L2 enable  ramp protocol re-started
                                / disable)      for re-enable

Deployment scope toggle         tenant admin    H7 Class C CR
(embed vs portal vs API-only)

Integration toggle per E15      tenant admin    H7 Class C CR; partner
(e.g., DSCSA on/off,            + HESEM         notification for
 EDI on/off, LIMS on/off)       Integration Ld  active integrations

Experimental feature toggle     tenant admin    H7 Class B CR; SLA
(pre-GA capability for          (opt-in)        exclusion disclosed;
consenting tenants)                             tenant accepts risks

AI degraded-mode override       HESEM platform  automated; tenant
(forced degraded per L4)        (automatic)     notified via status
                                                page + CSM

Kill switch per feature         HESEM AI Lead   L4 §6; H7 Class A;
(per L4 §6)                     + SRE Lead      tenant notified in
                                                advance where possible;
                                                immediate for safety
                                                or breach event

Compliance floor lock           HESEM           cannot be overridden
(minimum required config)       Compliance Lead by tenant admin; any
                                                attempt to configure
                                                below floor is blocked
                                                at API with clear
                                                rejection reason
```

Flag changes that affect regulated capabilities are H7 Class A or B
(per impact analysis); evidence per EC-16.

---

## 11. Tenant KPIs

```
KPI                                   TARGET / NOTE
─────────────────────────────────────────────────────────────────────
Onboarding within tier SLA            ≥ 90% of phase milestones met on
(SLO-22 per M5)                       schedule; tracked per tier by
                                      implementation PM

Customer health score (composite)     ≥ 80/100 per §5.2 formula;
                                      below 60 triggers CSM escalation
                                      and joint recovery plan

SLA compliance per period             per tier SLA; published per I2
                                      SLO dashboard; tenant visible

Customer-side adoption rate           ≥ 80% of licensed users active
(workflows live; users active)        within 90 days of go-live;
                                      tracked per domain module

AI feature adoption (where enabled)   ≥ 50% advisory-acceptance rate
                                      within 6 months of GA ramp
                                      (per L3 ramp KPIs)

Customer-side audit pass rate         ≥ 95% of audits where HESEM is
                                      a contribution point receive
                                      zero major findings attributable
                                      to HESEM evidence gaps

Renewal rate                          ≥ 90% annual renewal; tracked
                                      per cohort per tier

Expansion / cross-sell rate           ≥ 25% of tenants expand pack or
                                      tier within 24 months of go-live

CSAT after onboarding                 ≥ 4.0 / 5.0 (NPS equivalent)

CSAT after critical incident          ≥ 3.8 / 5.0; measured within
(SEV-0 or SEV-1)                      30 days of incident resolution

QBR action item closure rate          ≥ 85% of agreed actions closed
                                      by next QBR

Access review completion rate         100%; any missed review = H8
                                      finding
```

---

## 12. Failure modes

```
FM1   Onboarding SLA missed (tier milestone)
      Root cause: resource contention; scope creep in discovery;
        data migration volume larger than estimated
      Recovery: CSM intervention; scope analysis; customer
        communication; schedule recovery plan; H8 CAPA on
        implementation process if pattern repeats

FM2   Master data migration fails reconciliation
      Root cause: source data quality issues; schema mismatch;
        transformation rule gaps
      Recovery: rollback per migration plan; root cause analysis;
        re-run migration after fix; H8 CAPA on migration
        pre-flight data quality assessment

FM3   Tenant fails customer-side validation
      Root cause: gap in CVLP coverage; tenant URS diverged from
        HESEM capability; validation scope underestimated in P2
      Recovery: gap analysis; CVLP supplement; HESEM validation
        engineer support; possibly extend P7 cutover timeline;
        H8 CAPA on P2 scoping accuracy

FM4   Tenant operating HESEM in unvalidated state
      Root cause: tenant bypassed validation phases; time pressure;
        IQ/OQ not formally closed
      Recovery: per H1 §3 + H8; tenant + HESEM joint CAPA;
        validation evidence completed retroactively where allowed;
        regulator notification if required by applicable reg

FM5   Cross-tenant data access detected
      Root cause: API gateway ABAC misconfiguration; OTG query
        scope overflow; scope-bypass exploit
      Recovery: SEV-1; access revoke; investigation; affected
        tenant + regulator notification per H1 §3; H8 systemic
        CAPA on tenant-boundary discipline; root cause fixed
        before re-enable

FM6   Auditor portal escapes scope
      Root cause: scope-enforcement bug; date-range filter
        misconfigured; record-class filter overridden by admin
      Recovery: SEV-1; access revoke; investigation; HESEM
        Security Lead review; H8 systemic CAPA on portal
        scoping enforcement

FM7   Platform change pushed during tenant freeze window
      Root cause: freeze window not in deployment calendar;
        automation override not checking freeze flag
      Recovery: freeze enforcement mechanism strengthened;
        H8 CAPA on freeze-calendar integration in I1 deploy
        pipeline; retrospective discussion with tenant

FM8   Tenant offboarding data export delayed past deadline
      Root cause: export job failure; volume larger than expected;
        tenant contact unresponsive
      Recovery: extension negotiated; escalated to Implementation
        Lead; H8 CAPA on offboarding pipeline reliability; legal
        exposure assessed

FM9   Tenant DPA out of sync (sub-processor added without DPA)
      Root cause: vendor relationship moved faster than legal
        process; DPA amendment not triggered by procurement
      Recovery: per H1 + H7 governance; tenant communication
        (required by DPA); DPA amendment expedited; H8 systemic
        CAPA on sub-processor addition workflow integration with
        DPA amendment trigger

FM10  Per-tenant cost runaway (per I6)
      Root cause: per I6 FM1 attribution; tenant automation
        burst beyond plan; grey-zone classification delayed
      Recovery: per I6 §4 classification within 48h; tenant
        communication; throttle applied if appropriate; tier
        upgrade option; H8 CAPA on burst detection
```

---

## 13. Roles and authority (RACI)

```
Role             ONBOARD  CONFIG  CHANGE  ACCESS  OFFBOARD  AUDIT-PORTAL
Customer Success A        R       R       R       R         R
Implementation   R        A       R       -       R         -
Domain Lead      R        A       R       -       -         R
Quality Lead     C        C       A       -       C         A
Compliance Lead  C        C       A       C       A         A
Vertical Pack Ld R(pack)  R(pack) R(pack) -       C         C
Security Lead    C        C       C       A       C         A
Privacy Lead     C        C       C       A       A         R
DPO              C        -       C       A       A         R
SRE Lead         C        C       C       -       C         C
Tenant Admin     A        R       R       R       R         I
Auditor          -        -       -       -       -         R
```

---

## 14. Cross-references

- B6 — tenant boundary substrate; per-tenant isolation in OTG
- H1 §5 — tenant regulatory profile canonical schema (H1 authoritative)
- H2 §14 — CVLP definition and per-pack scope
- H3 §7 — auditor portal scope and evidence delivery
- H7 — tenant change management; per-class tenant notification
- H8 — CAPA from tenant operational findings
- H9 — per-tenant risk assessment
- I1 — deploy pipeline freeze integration
- I3 — tenant-impact incident response
- I4 — tenant region pinning and DR
- I5 — per-tenant tier capacity enforcement
- I6 — per-tenant cost attribution; tier envelope; QBR cost section
- I7 — tenant access reviews; ITAR; identity proofing; break-glass
- L2 — AI feature toggle and ramp per tenant
- L3 — AI advisory ramp per tenant in pilot phase
- L4 — kill switch per tenant
- D8 — training as part of onboarding phases
- K1 — pricing tier definitions and SLA amounts
- K5 — customer success operating model and renewal management
- M5 — SLO-22 onboarding-within-tier SLO definition
- M6 — tenant operations risks
- M9 — cross-reference index

---

## 15. Decision phrase

```
I8_TENANT_OPERATIONS_V10_LOCKED
PART_I_OPERATIONS_DEEP_UPGRADE_COMPLETE
NEXT: PART_J_VERTICAL_PACKS — S4-09 through S4-11
```

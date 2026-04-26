# I8 — Tenant Operations and Customer Onboarding

```
chapter_purpose: per-tenant lifecycle from onboarding through
                 steady state through offboarding; access reviews;
                 region pinning; pack toggling; per-tenant change
                 management; auditor access
owner_role:      Customer Success Lead with Implementation Lead
sources:         SOC 2 CC6.1-6.7 logical + physical access, ISO
                 27001 A.5.15-17 access management, GDPR Art 28
                 processor obligations, NIST SP 800-53 r5 SA + AC
                 controls, FinOps Foundation customer maturity model
```

A tenant is the unit of accountability for HESEM. Every regulated
guarantee resolves at the tenant boundary: data is per-tenant,
audit chain is per-tenant, billing is per-tenant, regulator
relationship is per-tenant. This chapter is the operational
discipline of that boundary.

---

## 1. Onboarding phases (canonical 8-phase)

```
P1  DISCOVERY (1-2 weeks)
    Inputs: customer profile (industry, size, regulatory frame,
     pack selection); existing systems; data scale estimate;
     compliance posture
    Outputs: SoW; tier proposal; vertical-pack-toggle decision;
     project plan; success criteria
    Owner: Sales + CSM + Implementation Lead

P2  VALIDATION SCOPING (2-4 weeks; regulated only)
    Inputs: customer URS; customer existing validation;
     risk assessment per H9
    Outputs: per-tenant validation plan; validation depth tier;
     gap-analysis vs HESEM CVLP; per-pack overlay decision
    Owner: Customer Validation Lead + HESEM Validation Eng

P3  TENANT PROVISIONING (1-2 weeks)
    Steps: tenant root + region selected; IAM + SSO configured;
     initial admin onboarded; vertical pack toggled;
     IQ executed (per H2 §11); evidence emit (EC-1 IQ subtype)
    Outputs: tenant active; admin account live; IQ summary
    Owner: Implementation Lead + Security Lead + Vertical Pack
     Lead

P4  MASTER DATA MIGRATION (2-6 weeks)
    Scope: Item, Customer, Supplier, Equipment, MDevice (med
     device pack), User, Role, Lot, Spec, Routing, BOM,
     Workflow templates, Doc templates, per-pack masters
    Steps: extract → transform → load → reconcile → sign-off
    Verification: cross-foot count + sample integrity check +
     business-rule check
    Evidence: migration_record (per H4)
    Owner: Implementation Lead + Customer Data Lead

P5  CONFIGURATION (2-8 weeks)
    Steps: workflow configuration; per-domain SOPs; effective
     dates; user assignment; role mapping; SLO targets;
     OQ executed (per H2)
    Outputs: per-tenant operational runbook; OQ summary
    Owner: Domain Leads (per Part C) + Customer Operations
     Lead

P6  PILOT OPERATION (4-12 weeks)
    Steps: limited scope go-live; PQ observation; bug fixes;
     iterative refinement; AI feature shadow → advisory
     ramp (per L3)
    Outputs: PQ summary; per-tenant readiness signoff;
     issue / risk register
    Owner: Customer Operations + HESEM CSM + Implementation
     Lead

P7  PRE-PRODUCTION CUTOVER (2-4 weeks)
    Steps: training (per D8); runbook handoff; on-call rotation
     established; communication plan; freeze window scheduled
    Outputs: cutover plan; rollback plan; comms template
    Owner: CSM + Customer Ops + SRE Lead

P8  STEADY STATE (ongoing)
    Activities: SLA monitoring; QBR (per §5); periodic review
     (per H6); audit support (per H3); customer transparency
     (CVLP per release); upgrade adoption
    Owner: CSM + Domain Leads
```

---

## 2. Per-tier onboarding SLA

```
TIER          TOTAL IMPL  CSM SCOPE             VALIDATION
Standard      4-8 wk       shared                light
Pro           8-16 wk      dedicated business-h   moderate
Enterprise    16-52 wk     dedicated 24×5        full per H2
Sovereign     per agreement extended              full + per-tenant
                                                  isolation
Pilot         2-4 wk        limited shared        n/a
PER-PACK ADD-ONS
+Pharma       +24 wk        validation lifecycle full
+Med Device   +20 wk        validation lifecycle + DHF migration
+Auto         +12 wk        APQP integration + per-OEM CSR
+Aero         +52 wk        AS9100D + NADCAP + ITAR onboarding
+Food         +12 wk        HACCP + FSMA §204
```

---

## 3. Tenant regulatory profile (canonical record)

A tenant carries a regulatory profile (per H1 §5):

```
ATTRIBUTE                         SUBSTANCE
tenant_id                          unique
tenant_name                         business name
incorporation_jurisdiction          per legal entity
data_residency_region              primary operational region (per
                                    B6 C5)
secondary_residency_region          DR / cross-region (per I4)
vertical_pack(s)                    J1..J5 enabled
sub_vertical_risk_class             per pack (e.g., MD class III)
applicable_regulators                FDA, EMA, NHTSA, FAA, USDA, etc.
applicable_jurisdictions             per H1 §3 windows determined
contract_tier                        per K1
QP / PRRC / Designated Person        per pack required role
authorized representative (EU)       per MDR Art 11
DPO                                  per GDPR Art 37 (where required)
identity_proofing_level              IAL2 / IAL3 (ITAR / CMMC)
contract_term + renewal_window
DPA + sub-processor list             per addendum
customer-specific requirements        L4 overlay rule pack
auditor portal scope                 per H3 §7
freeze windows                       per change-window agreement
notification preferences              per DPA + per H1 §3
key management                        HESEM KMS / customer-managed key
KPI thresholds                        per agreement
data_classification                    PII / PHI / CUI / FCI tags
```

Profile changes are H7 Class A (regulated CR; QP / PRRC sign).

---

## 4. Tenant access reviews

```
PRIVILEGED ACCESS                quarterly review per SOC 2 CC6.3
                                 + ISO 27001 A.5.18
STANDARD USER ACCESS              semiannual review
ROLE-CHANGE REVIEW                  per change; immediate
ORPHAN ACCOUNT DETECTION            monthly auto + manual review
SSO + SCIM SYNC HEALTH               continuous
LEAVER FLOW                          hours after departure (per
                                     I7); deprovisioned within 24h
                                     for SaaS access; per IAM
                                     policy
SELF-SERVICE REQUEST                  per tenant admin
CROSS-TENANT ACCESS                    forbidden; rejected at API
                                     gateway + audit chain check
HESEM SUPPORT ACCESS                   contract-defined; explicit
                                     per-incident tenant approval
                                     (break-glass); session
                                     recording; auditable
AUDITOR ACCESS                          per H3 §7 scoped
EMERGENCY (BREAK-GLASS)                  rare; multi-person quorum
                                     required; auto-revoke;
                                     post-incident review
```

---

## 5. Quarterly Business Review (QBR)

```
INPUTS
  - SLA compliance per period
  - SLO performance vs target
  - Incident history (SEV-0/1/2)
  - Change history per H7 (impact summary)
  - Cost vs budget per I6
  - AI feature KPIs per L2 §6 (where enabled)
  - CAPA status per H8
  - Audit findings + responses per H3
  - Validation evidence freshness per H2 §13

OUTPUTS
  - Customer health score + trend
  - Roadmap discussion + commit
  - Identified risks + mitigation
  - Action items per H8 if cross-tenant
  - Renewal trajectory per K5

OWNER
  - HESEM: CSM
  - Customer: Tenant Admin / Quality Lead / Compliance Lead
```

---

## 6. Per-tenant change management

```
PLATFORM CHANGE                  per H7; per-tenant impact summary
                                 surfaced; tenant approval where
                                 contract requires (regulated tenants)
TENANT CONFIG CHANGE              per H7 with tenant ownership;
                                 same lifecycle; tenant has approver
                                 quorum
TENANT DATA MIGRATION              per change window; per H7
TENANT ROLE / RBAC CHANGE          per access review + per H7
PACK TOGGLE                         per H7 Class A; freeze impact
                                 review; effectiveness verification
TIER UPGRADE                         per K5 path; per pre-pre-flight;
                                 capacity check (per I5)
REGION CHANGE                         per H7 Class A; per H1 §5;
                                 cross-region migration plan
KEY ROTATION                          per cadence + on-suspicion;
                                 per I7 §4
DPA AMENDMENT                          per legal + Compliance Lead;
                                 effective per amendment date
SUB-PROCESSOR ADDITION                  per H7; tenant notification per
                                 DPA window; objection-window
                                 honored
```

---

## 7. Tenant offboarding (canonical)

```
T+0   notice received (typical 30-90 days)
T+a   final data export plan agreed; format + schema
T+b   final export executed (signed audit pack per H3 §4)
T+c   customer ack received
T+d   live access disabled; tenant data isolated to archive-only
T+e   per H5 retention floor: tenant data retained;
       HESEM as custodian per DPA
T+f   pseudonymization key destruction option per tenant choice
       (immediate erasure of pseudonymized records)
T+(per H5) retention expiry → deletion → confirmed to
   customer (final deletion confirmation per pack)
```

Offboarding is itself a regulated operation. Some tenants (Pharma)
cannot legally permit deletion before retention expires; contract
reflects this.

---

## 8. Customer Validation Leverage Pack delivery (per H2 §14)

Per release HESEM delivers CVLP automatically to enabled tenants:

```
- Platform IQ template
- Platform OQ evidence per affected capability
- Platform PQ continuous monitoring evidence
- DHF excerpt (where MD pack)
- SBOM + signed attestation
- Pen-test report (latest)
- SOC 2 / ISO 27001 cert (post W12/W13)
- ISO 13485 cert (post pack release)
- Customer-side validation gap list with templates
- Per-pack-specific evidence (APR / PSUR / PPAP / FAI / HACCP
  per pack + tenant)
```

CVLP delivery via E8; tenant DPO + Quality Lead notified.

---

## 9. Auditor portal (per H3 §7)

```
PROVISIONING                  scoped account; expiration date;
                              read-only role
SCOPE                          per audit scope (date range, class,
                              record-kind, sample plan)
EVIDENCE-RETRIEVAL             via Evidence API (E8) with auditor-
                              role policy
CROSS-TENANT BARRIER            absolute; cannot be relaxed
QUERY AUDIT LOG                  every auditor query logged + retained
SESSION RECORDING               where contract requires
EXPIRATION                      auto-deprovision at expiration
RE-AUDIT REPLAY                  same scope query yields same sample
                              (deterministic per H3 §6)
```

---

## 10. Per-tenant feature flags

```
PER-PACK TOGGLE              vertical pack on/off
PER-FEATURE TOGGLE            AI features per L2 enable/disable
DEPLOYMENT SCOPE TOGGLE       which surfaces enabled (e.g., embed
                              vs portal)
INTEGRATION TOGGLE            per E15 (e.g., DSCSA on/off)
EXPERIMENTAL FEATURE TOGGLE    pre-GA capability toggle for
                              consenting tenants
KILL SWITCH                    per L4 §6 + per feature
TENANT ADMIN OWNED            tenant admin can toggle (subject to
                              regulator floor); HESEM blocks
                              configuration below floor
```

Flag changes are H7 Class A or B (per impact); evidence per EC-16.

---

## 11. Tenant KPIs

```
- Onboarding within tier SLA per K5 (target SLO-22 ≥ 90%)
- Customer health score (composite of NPS + usage + KPI)
- SLA compliance per period
- Customer-side adoption rate (workflows live; users active)
- AI feature adoption per L2
- Customer-side audit pass rate (where HESEM is contributor)
- Renewal rate
- Expansion / cross-sell rate
- CSAT after onboarding
- CSAT after critical incident
```

---

## 12. Failure modes

```
FM1   Onboarding SLA missed (per tier)
      Recovery: CSM intervention; gap-analysis; tenant
              communication; H8 CAPA on impl process if pattern

FM2   Master data migration fails reconciliation
      Recovery: rollback per migration plan; investigate;
              re-cycle; H8 CAPA on migration process

FM3   Tenant fails customer-side validation
      Recovery: gap analysis; CVLP supplement; HESEM tenant
              support; possibly extend cutover

FM4   Tenant uses HESEM in pre-validated state (per regulator
      finding)
      Recovery: per H1 §3 + H8; tenant + HESEM joint CAPA

FM5   Cross-tenant access detected
      Recovery: BD-equivalent; SEV-1; access revoke; tenant
              + regulator notification per H1 §3; H8 systemic
              CAPA on tenant-boundary discipline

FM6   Auditor portal escapes scope
      Recovery: SEV-1; access revoke; investigation; H8
              systemic CAPA on portal scoping

FM7   Tenant freezes during regulator inspection but HESEM
      pushes change anyway
      Recovery: freeze enforcement strengthened; H8 CAPA on
              freeze discipline

FM8   Tenant offboarding incomplete (data not exported by deadline)
      Recovery: extension + recovery; legal exposure;
              H8 systemic

FM9   Tenant DPA out of sync with operations (e.g., sub-processor
      added without DPA amendment)
      Recovery: per H1 + H7 governance; tenant communication;
              H8 systemic

FM10  Per-tenant cost run-away (per I6)
      Recovery: per I6 §4 classification; tenant
              communication; tier upgrade or absorbing
```

---

## 13. Roles and authority (RACI)

```
Role             ONBOARD  CONFIG  CHANGE  ACCESS  OFFBOARD  AUDIT-PORTAL
Customer Success A        R       R       R       R         R
Implementation Ld R       A       R       -       R         -
Domain Lead       R       A       R       -       -         R
Quality Lead      C       C       A       -       C         A
Compliance Lead   C       C       A       C       A         A
Vertical Pack Ld  R(pack)  R(pack) R(pack) -       C         C
Security Lead     C        C       C       A       C         A
Privacy Lead      C        C       C       A       A         R
SRE Lead          C        C       C       -       C         C
Tenant Admin      A        R       R       R       R         I
Auditor           -        -       -       -       -         R
```

---

## 14. Cross-references

- B6 — tenant boundary substrate
- H1 §5 — tenant regulatory profile
- H2 §14 — CVLP delivery
- H3 §7 — auditor portal
- H7 — tenant change management
- H8 — CAPA from tenant findings
- I3 — tenant-impact incidents
- I4 — tenant region pinning + DR
- I6 — tenant tier + cost
- I7 — tenant access reviews + identity
- L2 — AI feature toggling
- L4 — kill switch per tenant
- D8 — training as part of onboarding
- K1 — pricing tiers
- K5 — customer success operating model
- M5 — SLO-22 onboarding within tier
- M9 — cross-reference

---

## 15. Decision phrase

```
I8_TENANT_OPERATIONS_BASELINE_LOCKED
PART_I_DEEP_UPGRADE_COMPLETE
NEXT: PART_J_VERTICAL_PACKS/J0_PART_J_OVERVIEW.md
```

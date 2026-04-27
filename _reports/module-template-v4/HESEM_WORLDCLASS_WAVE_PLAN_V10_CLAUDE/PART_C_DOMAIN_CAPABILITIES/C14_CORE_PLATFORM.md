# C14 — Core Platform Domain

```
domain_code:        D-14
domain_name:        Core Platform
owner_role:         Platform Lead (with Identity Lead, Compliance Lead, SRE Lead)
v10_upgrade_date:   2026-04-27
cross_refs:         B6 (substrate); E1 E2 E14; H1 §5; H5; I7 I8; L1 §3; M3
```

---

## 1. Purpose

The Core Platform domain is the substrate beneath every other HESEM domain. It provides: tenant lifecycle management, identity and authentication, authority policy enforcement, audit chain and evidence persistence, cryptographic key management, privacy record management, retention class enforcement, legal hold management, and sustainability accounting. All cross-cutting concerns defined in B6 have their primary implementation here.

This chapter departs from the capabilities-centric V9 framing and documents the seventeen resource families that the Core Platform manages, each with its lifecycle state machine, RACI, failure modes, and KPIs. These resources are the persistent governance artifacts that regulators inspect, auditors query, and DR procedures restore.

---

## 2. Resource Families

### RF-C14-01 — Tenant

A Tenant is the top-level organizational boundary. All HESEM data, configuration, identity, and integration resources are owned by a tenant. The tenant is the root of the B6 C5 tenant boundary enforcement: every application middleware check and every Postgres RLS policy references `tenant_id`.

**Fields:** tenant_id (UUID; immutable once assigned), display_name, canonical_slug (URL-safe; immutable), primary_region (cloud region of data residency), billing_plan (CORE|ENTERPRISE|SOVEREIGN), pack_ids[] (enabled industry packs), created_at, activated_at, frozen_at, offboarding_started_at, archived_at.

**SM-TENANT lifecycle:**

| Source State  | Event                  | Guard                                                      | Target State   | Side-Effects                                                | Evidence Emit   |
|---------------|------------------------|------------------------------------------------------------|----------------|-------------------------------------------------------------|-----------------|
| PROVISIONING  | onboarding_complete    | identity_configured ∧ regulatory_profile_set ∧ billing_confirmed | ACTIVE    | activate_all_feature_flags; notify_tenant_admin             | P-01 CREATED    |
| ACTIVE        | admin_freeze           | Platform_Lead ∧ Compliance_Lead approval                   | FROZEN         | block_all_mutations; read-only mode activated               | P-25 SUSPENDED  |
| FROZEN        | admin_unfreeze         | Platform_Lead ∧ billing_cleared                            | ACTIVE         | reactivate_mutations                                        | P-20 RECONCILED |
| ACTIVE        | offboarding_requested  | Tenant_Admin ∧ Platform_Lead approval ∧ data_export_delivered | OFFBOARDING | schedule_data_deletion_jobs; notify_sub_processors         | P-18 FLAGGED    |
| FROZEN        | offboarding_requested  | Platform_Lead ∧ Compliance_Lead approval ∧ data_export_delivered | OFFBOARDING | schedule_data_deletion_jobs; notify_sub_processors        | P-18 FLAGGED    |
| OFFBOARDING   | deletion_complete      | all_data_deleted_or_anonymized ∧ sub_processors_notified ∧ audit_trail_archived | ARCHIVED | deactivate_DNS; revoke_all_credentials          | P-26 ARCHIVED   |

FROZEN state blocks all write operations across every domain for the tenant. Read operations remain available. Audit events continue to be written (audit chain must remain intact even in FROZEN state).

OFFBOARDING enforces GDPR Art 17 erasure within the contractual SLA (typically 30 days), while preserving audit trail records in WORM storage per the applicable retention class (H5). The tension between erasure and retention (GDPR Art 17 vs 21 CFR Part 11.10(c)) is resolved by retaining audit-chain records in pseudonymized form: PII fields are overwritten with HMAC pseudonyms; audit structure is preserved.

**RACI:** R=Platform Lead, A=Compliance Lead, C=Tenant Admin (initiation), I=All domain leads, DPO.

**Failure modes:**
- FM-C14-01-A: Tenant PROVISIONING fails (identity configuration incomplete) → tenant stays in PROVISIONING; onboarding task flagged in E14 admin API; no billable activation.
- FM-C14-01-B: Offboarding data deletion job fails → offboarding stalls; SRE alert; manual remediation; GDPR deletion timeline at risk (DPO notified if > 25 days elapsed).

**KPIs:** Tenant activation lead time (PROVISIONING → ACTIVE) p95 < 4 hours; offboarding data deletion completion < 30 days from OFFBOARDING entry; 100% of ARCHIVED tenants have WORM audit export confirmed.

---

### RF-C14-02 — Tenant Regulatory Profile

The Tenant Regulatory Profile captures which regulatory regimes apply to the tenant and configures regime-specific behavior across all HESEM domains. This resource drives: which banned decisions are extended (L1 §3 pack extensions), which retention classes apply (H5), which e-signature tiers are required (B6 C3), and which observability per-pack metrics are active (B9 §per-pack).

**Fields:** profile_id, tenant_id, regimes[] (array of: 21_CFR_PART_11|EU_GMP_ANNEX_11|DSCSA|EU_MDR|FSMA_204|ITAR|CMMC|ISO_13485|AS9120B|GAMP5|other), pack_ids_active[], qp_required (boolean; Pharma), itar_person_of_record_id (Aero), pcqi_id (Food), prrc_id (Medical Device), electronic_signature_tier (TIER_1_CLICK|TIER_2_PASSWORD|TIER_3_BIOMETRIC|TIER_4_HSM), last_reviewed_at, next_review_due.

**Lifecycle:** DRAFT → ACTIVE → UNDER_REVIEW → ACTIVE cycle. Annual review required. Any pack addition triggers UNDER_REVIEW.

**RACI:** R=Compliance Lead, A=Platform Lead, C=Tenant Admin, I=Regulatory Affairs Lead, DPO.

**KPIs:** Regulatory profile review completion before next_review_due for 100% of tenants; zero tenants with activated packs not reflected in regulatory profile.

---

### RF-C14-03 — Region Pinning Record

A Region Pinning Record specifies the allowed cloud regions for a tenant's data storage, processing, and cross-region replication. It implements the data residency requirements enforced at B7 §4 (deployment topology) and B6 C5 (tenant boundary).

**Fields:** pinning_id, tenant_id, data_class (ALL|PII|ITAR_CUI|PHI|FINANCIAL), allowed_regions[] (cloud region identifiers), deny_regions[] (explicit deny list), legal_basis (GDPR_ART_46|ITAR_22_CFR_120|HIPAA|NIST_800_171|CONTRACTUAL), enforced_at (timestamp when pinning entered effect), last_audit_at.

**Enforcement:** The middleware layer reads the Region Pinning Record on every request and on every cross-region replication event. For ITAR_CUI data class: any attempt to store or process in a non-allowed region is blocked and triggers a SEV-1 incident (FM-C12-05-C cross-reference).

**Lifecycle:** DRAFT → ACTIVE (after Compliance Lead sign-off) → AMENDMENT_PENDING → ACTIVE. Any region change requires Compliance Lead re-approval.

**RACI:** R=Compliance Lead, A=DPO (GDPR residency), C=Platform Lead (technical enforcement), I=CISO, Regulatory Affairs Lead (ITAR).

**KPIs:** Zero ITAR_CUI data events detected outside allowed_regions; region pinning audit lag < 24 hours (i.e., enforcement reflects current pinning record within 24 hours of any amendment).

---

### RF-C14-04 — ROPA (Record of Processing Activities, per GDPR Art 30)

The ROPA enumerates all personal data processing activities performed by HESEM on behalf of a tenant controller, satisfying GDPR Art 30 obligation to maintain records.

**Fields:** ropa_id, tenant_id, processing_activity_name, legal_basis (GDPR Art 6 ground), data_categories[] (H5 PII class codes), data_subjects[], purposes[], retention_period, sub_processors[] (linked RF-C12-05 records), cross_border_transfers[] (destination country + Art 46 safeguard), risk_level (LOW|MEDIUM|HIGH), dpia_required (boolean; derived: HIGH risk → true), last_updated_at, reviewed_by, reviewed_at.

**Lifecycle:** DRAFT → PUBLISHED → UNDER_REVIEW (annual or triggered by new processing activity) → PUBLISHED. Published ROPA is the legally operative record. Superseded versions are archived (immutable).

**RACI:** R=DPO, A=Compliance Lead, C=Platform Lead (technical input), I=Tenant Admin.

**KPIs:** 100% of HESEM processing activities enumerated in ROPA; annual ROPA review completion before anniversary date; zero new processing activities deployed without ROPA update.

---

### RF-C14-05 — DPIA (Data Protection Impact Assessment)

A DPIA is required for processing activities assessed as HIGH risk in the ROPA, per GDPR Art 35. HESEM generates DPIA records for: the AI training corpus (C13 RF-C13-05), new biometric e-signature tier (B6 C3), bulk pseudonymization key rotation, new pack activation for sensitive data categories.

**Fields:** dpia_id, ropa_id (linked), processing_activity, risk_description, likelihood (1-5), severity (1-5), risk_score (likelihood × severity), mitigations[] (each: description, residual_risk_score), dpo_opinion (FAVOURABLE|UNFAVOURABLE|CONDITIONAL), approved_by, approved_at, review_due_at.

**Lifecycle:** REQUESTED → IN_PROGRESS → DPO_REVIEW → APPROVED | REJECTED → (if APPROVED) MONITORING (periodic residual risk review).

**RACI:** R=DPO, A=Compliance Lead, C=Data Platform Lead (for AI-related DPIAs), I=CISO.

**KPIs:** DPIA completion before HIGH-risk processing activity deployment (zero exceptions); residual risk score after mitigations < 12 (3×4) for any approved DPIA.

---

### RF-C14-06 — Privacy Subject Request (DSAR)

A Data Subject Access Request (DSAR) is a formal request from an individual exercising GDPR Art 15 (access), Art 16 (rectification), Art 17 (erasure), Art 18 (restriction), Art 20 (portability), or Art 21 (objection) rights.

**Fields:** dsar_id, tenant_id, request_type (ACCESS|RECTIFICATION|ERASURE|RESTRICTION|PORTABILITY|OBJECTION), subject_identifier (hashed; verified identity), submitted_at, acknowledged_at, fulfillment_due_at (30 days from submitted_at per GDPR Art 12.3), fulfilled_at, outcome (FULFILLED|PARTIALLY_FULFILLED|REJECTED_WITH_REASON), rejection_reason (if applicable; e.g., GDPR Art 17.3 legal obligation basis), response_delivery_method.

**Lifecycle:** RECEIVED → IDENTITY_VERIFIED → IN_PROGRESS → DPO_REVIEW → FULFILLED | REJECTED. For ERASURE requests where H5 retention class requires longer retention: partial fulfillment with explanation of legal basis for retention.

**RACI:** R=DPO, A=Compliance Lead, C=Platform Lead (data retrieval/deletion tooling), I=Tenant Admin.

**KPIs:** DSAR acknowledgment within 5 business days; 100% fulfillment within 30-day statutory deadline; zero DSARs fulfilled without DPO sign-off for ERASURE or RESTRICTION types.

---

### RF-C14-07 — Tenant Onboarding / Offboarding Project

The Onboarding/Offboarding Project is a task-tracking resource that orchestrates the multi-step process of provisioning a new tenant or decommissioning an existing one. It groups the sequence of tasks (identity setup, regulatory profile configuration, connector provisioning, data migration, data deletion jobs) into a trackable project record.

**Fields:** project_id, tenant_id, project_type (ONBOARDING|OFFBOARDING), status (OPEN|IN_PROGRESS|BLOCKED|COMPLETE), tasks[] (each: task_name, owner_role, due_at, completed_at, evidence_ref), blocking_reason (if BLOCKED), project_lead, created_at, completed_at.

**Lifecycle:** OPEN → IN_PROGRESS → BLOCKED (if dependency fails) → IN_PROGRESS → COMPLETE. COMPLETE triggers Tenant SM transition (PROVISIONING → ACTIVE for onboarding; OFFBOARDING → ARCHIVED for offboarding).

**RACI:** R=Platform Lead, A=Compliance Lead (offboarding), C=Tenant Admin (onboarding checklist completion), I=All domain leads.

**KPIs:** Onboarding project p95 completion < 4 hours for CORE plan; < 8 hours for ENTERPRISE; < 5 business days for SOVEREIGN (ITAR onboarding includes security vetting). Offboarding project completion < 30 days.

---

### RF-C14-08 — Identity / Role / Auth Event

Identity resources (Users, Service Accounts, Roles, Permission Grants) are managed by the Identity & Access Management subsystem (E1). Auth Events are immutable audit records of every authentication attempt, token issuance, step-up authentication, and session termination.

**Identity resource fields (User):** user_id, tenant_id, email (pseudonymized in audit trail), display_name, roles[] (role assignments with effective_from, effective_to, granted_by, justification), mfa_enrolled (boolean), last_login_at, account_status (ACTIVE|LOCKED|SUSPENDED|DELETED).

**Auth Event fields (immutable):** event_id, tenant_id, user_id (hashed), event_type (LOGIN_SUCCESS|LOGIN_FAILURE|TOKEN_ISSUED|STEP_UP_GRANTED|SESSION_TERMINATED|MFA_CHALLENGED|MFA_FAILED|PRIVILEGE_ESCALATION), ip_address_hash (SHA3-256; not stored raw; GDPR Art 5.1.e), user_agent_hash, created_at, outcome, failure_reason.

**User lifecycle SM (per E1 §2):**

| Source State | Event                | Guard                                           | Target State | Evidence Emit   |
|--------------|----------------------|-------------------------------------------------|--------------|-----------------|
| INVITED      | accept_invite        | invite_not_expired ∧ email_verified ∧ mfa_setup | ACTIVE       | P-01 CREATED    |
| ACTIVE       | admin_lock           | TENANT_ADMIN role                               | LOCKED       | P-25 SUSPENDED  |
| LOCKED       | admin_unlock         | TENANT_ADMIN role                               | ACTIVE       | P-20 RECONCILED |
| ACTIVE       | consecutive_login_failures(≥5) | none                               | LOCKED       | P-25 SUSPENDED  |
| ACTIVE       | admin_suspend        | PLATFORM_ADMIN role                             | SUSPENDED    | P-25 SUSPENDED  |
| ACTIVE       | user_offboarded      | TENANT_ADMIN ∧ tenant_offboarding_project_active| DELETED      | P-26 ARCHIVED   |

Auth Events are retained per H5 retention class (minimum: 7 years for regulated-domain user actions; WORM-archived monthly).

**RACI:** R=Identity Lead, A=Platform Lead, C=Tenant Admin, I=Compliance Lead.

**Failure modes:**
- FM-C14-08-A: MFA enrollment not completed within 24 hours of invite acceptance → account automatically LOCKED; re-invitation required.
- FM-C14-08-B: Privilege escalation event without justification recorded → SEV-2; auth event logged; account reviewed.

**KPIs:** MFA enrollment rate 100% for all roles requiring step-up auth; failed login lockout trigger < 30 seconds from 5th failure; auth event write latency p95 < 20ms.

---

### RF-C14-09 — Audit Event + Audit Anchor

An Audit Event is the immutable record of every mutation to an authoritative root record in HESEM. Audit Events form a hash chain (B6 C1): each event contains the SHA3-256 hash of the previous event in the chain for that tenant. An Audit Anchor is the daily Merkle root computed over all audit events in a 24-hour window, signed with RFC 3161 TSA timestamp and written to WORM storage.

**Audit Event fields:** event_id, tenant_id, root_kind, root_id, event_type (mutation type), principal_id (hashed), session_id, before_hash (SHA3-256 of record state before mutation), after_hash (SHA3-256 of record state after mutation), chain_hash (SHA3-256 of previous event_id + before_hash + after_hash), created_at, pack_id.

**Audit Anchor fields (per B3 §7):** anchor_id, tenant_id, anchor_date, merkle_root (SHA3-256 of all chain_hashes in window), event_count, tsa_response_token (RFC 3161), worm_object_key (S3 Object Lock COMPLIANCE), computed_at.

**Lifecycle:** Audit Events are write-once and immutable. Anchors are created daily at 00:30 UTC (CronJob). Anchor records are themselves hash-chained to previous anchor.

**RACI:** R=Platform Lead (implementation), A=Compliance Lead (governance), C=none (system-generated), I=all (all mutations generate audit events automatically).

**Failure modes:**
- FM-C14-09-A: Anchor computation fails (e.g., TSA unreachable) → retry with 5-minute backoff; SEV-3 alert after 3 failures; SRE investigates TSA connectivity.
- FM-C14-09-B: Chain hash mismatch detected during audit integrity check → SEV-1 incident; tamper investigation; OTG axiom A-01 violation raised.

**KPIs:** Audit event write success rate 100%; anchor computation success rate ≥ 99.9%; anchor lag < 60 minutes after 00:30 UTC anchor window (SLO-10 per M5).

---

### RF-C14-10 — Pseudonymization Key

A Pseudonymization Key is a per-tenant HMAC-SHA256 key used to pseudonymize PII fields in audit trails, OTG events, and analytics exports, per B5 §5 and GDPR Art 25 (data protection by design).

**Fields:** key_id, tenant_id, key_purpose (AUDIT_TRAIL_PII|ANALYTICS_EXPORT|OTG_PII|DSAR_LINKAGE), key_material_ref (KMS pointer; never stored in application database), algorithm (HMAC_SHA256; ECDH-P384 for FIPS 140-3 tenants), created_at, rotated_at, retirement_at, next_rotation_due.

**Lifecycle:** ACTIVE → ROTATING (90-day scheduled rotation) → ACTIVE (new key effective; old key retained for de-pseudonymization during DSAR linkage for 30 days) → RETIRED (old key material securely deleted).

Key rotation: 90-day rotation cycle. ITAR tenants use FIPS 140-3 validated HSM-backed keys (security_tier=3). Key material never leaves KMS; application holds only a reference.

**RACI:** R=CISO, A=DPO (GDPR), C=Platform Lead (key rotation automation), I=Compliance Lead.

**KPIs:** Zero keys outstanding past next_rotation_due; KMS availability for pseudonymization operations ≥ 99.99% (SLO-adjacent); zero key material exposures.

---

### RF-C14-11 — Hold Record (Legal Hold per H5 §5)

A Hold Record suspends the normal retention class lifecycle for a specific set of records, preventing deletion or modification during litigation, investigation, or regulatory inquiry.

**Fields:** hold_id, tenant_id, hold_type (LEGAL_LITIGATION|REGULATORY_INQUIRY|INTERNAL_INVESTIGATION|DSAR_PENDING), scope_predicate (SQL WHERE clause or OTG path expression defining in-scope records), issued_by, issued_at, justification, expected_duration_days, lifted_by, lifted_at, lifting_justification.

**Lifecycle:**

| Source State | Event          | Guard                                               | Target State | Side-Effects                                     | Evidence Emit   |
|--------------|----------------|-----------------------------------------------------|--------------|--------------------------------------------------|-----------------|
| DRAFT        | issue_hold     | Compliance_Lead ∧ Legal_Counsel approval             | ACTIVE       | tag all in-scope records hold=true; block deletion | P-01 CREATED   |
| ACTIVE       | extend         | Compliance_Lead approval                            | ACTIVE       | update expected_duration_days                    | P-08 UPDATED    |
| ACTIVE       | lift_hold      | Compliance_Lead ∧ Legal_Counsel approval            | LIFTED       | remove hold tags; resume normal retention class  | P-20 RECONCILED |
| LIFTED       | archive        | none                                                | ARCHIVED     | WORM archive of hold record                      | P-26 ARCHIVED   |

While a Hold Record is ACTIVE, any retention class job that would delete or anonymize in-scope records is blocked. The hold takes precedence over GDPR Art 17 erasure requests (Art 17.3(b): erasure not required where processing necessary for legal claims).

**RACI:** R=Legal Counsel (initiation authority), A=Compliance Lead, C=Platform Lead (technical enforcement), I=DPO, CISO.

**KPIs:** Hold activation lag < 1 hour from issuance (records tagged and deletion blocked within 1 hour); zero records deleted while under active Hold Record.

---

### RF-C14-12 — Retention Class

A Retention Class defines the retention policy for a category of HESEM records: how long records must be kept, when they may be deleted or anonymized, and what WORM storage tier applies.

**Fields:** class_id, class_code (H5-aligned code: e.g., RC-QMS-7Y, RC-BATCH-30Y, RC-AI-DECISION-15Y), description, minimum_retention_years, maximum_retention_years (null = indefinite), regulatory_basis[] (21_CFR_11|EU_MDR_ART_10|FSMA|ITAR|GDPR_ART_5), anonymization_allowed_at_expiry (boolean), worm_tier (STANDARD|GOVERNANCE|COMPLIANCE), applies_to_root_kinds[].

**Lifecycle:** Retention Classes are configuration resources. They are ACTIVE from creation and may only be amended through a Compliance Lead change-control process. Amendments apply prospectively only; historical records retain the class under which they were originally stored.

**RACI:** R=Compliance Lead, A=DPO (GDPR classes), C=Platform Lead (SRE enforcement), I=all domain leads.

**KPIs:** 100% of HESEM root kinds mapped to at least one Retention Class; zero records past maximum_retention_years without deletion or anonymization (unless under Hold Record).

---

### RF-C14-13 — Banned-Decision Surface (per L1 §3)

A Banned-Decision Surface is a configuration record that registers which operations within a given root kind correspond to banned-decision types (BD-1..BD-36). This resource is the application-layer catalog that the L2 runtime middleware reads when evaluating authority decisions and that the CI linter checks against.

**Fields:** surface_id, root_kind, operation_name (e.g., `batch_disposition`, `recall_initiation`), bd_ids[] (BD-N codes this operation is guarded by), minimum_authority_tier (1..5), quorum_required (boolean), quorum_size (if required), pack_extension_bd_ids[] (pack-specific BD extensions per L1 §3), last_reviewed_at.

**Lifecycle:** DRAFT → ACTIVE (after AI Lead + Compliance Lead approval). Amendments require the same dual approval. Any change to bd_ids[] triggers a CI pipeline re-run against the banned-decision test suite.

**RACI:** R=AI Lead, A=Compliance Lead, C=Platform Lead (CI integration), I=CISO, Domain leads.

**KPIs:** 100% of regulated-domain operations have a registered Banned-Decision Surface record; CI banned-decision test suite executes on every commit to operations touching registered operations; `hesem_banned_decision_attempts_total` = 0 (SLO-22 per M5).

---

### RF-C14-14 — Cryptographic Module Record (FIPS 140-3)

For tenants with FIPS 140-3 requirements (Aerospace/ITAR J3, Government, CMMC Level 2+), a Cryptographic Module Record registers the validated cryptographic module used for key operations, with the FIPS 140-3 certificate reference and the operational boundary definition.

**Fields:** module_id, tenant_id, module_name, vendor, fips_certificate_number, validation_level (1..4; HESEM requires ≥ Level 2 for ITAR), approved_algorithms[] (AES-256-GCM, ECDSA-P384, SHA3-256, HMAC-SHA256; excluded: RSA-2048 for new operations per B6 C16 migration plan), operational_boundary_description, last_validated_at, certificate_expiry.

**Lifecycle:** REGISTERED → CERTIFIED (after FIPS certificate number confirmed) → ACTIVE → UNDER_RECERTIFICATION (if certificate expiry < 90 days) → CERTIFIED → ACTIVE. Certificate expiry alert: 90d / 30d / 7d.

**RACI:** R=CISO, A=Compliance Lead, C=Platform Lead (cryptographic agility per B6 C16), I=Regulatory Affairs Lead (ITAR).

**KPIs:** Zero ITAR/CMMC tenants operating without a CERTIFIED Cryptographic Module Record; certificate expiry coverage 100% (no expired certificates in production); algorithm migration plan (B6 C16) completion tracked per wave.

---

### RF-C14-15 — Sustainability + Cost Center (per I6)

Sustainability and Cost Center records support the environmental accountability and cost attribution functions required by enterprise customers and increasingly by regulatory frameworks (EU Corporate Sustainability Reporting Directive, SEC climate disclosure rules).

**Sustainability Record fields:** sustainability_id, tenant_id, period (MONTHLY), compute_kwh, storage_kwh, network_kwh, total_co2e_kg (kWh × regional grid emission factor), carbon_offset_applied_kg, net_co2e_kg, compute_by_region (breakdown for multi-region tenants), pack_id_allocation (per-pack carbon attribution), reported_at.

**Cost Center fields:** cost_center_id, tenant_id, period, compute_cost_usd, storage_cost_usd, network_cost_usd, support_cost_usd, total_cost_usd, allocation_by_domain (domain_code → fraction), allocation_by_pack, invoice_ref.

**Lifecycle:** Both resources are generated monthly by CronJob and are immutable once generated. Corrections are expressed as adjustment records with supersedes reference.

**RACI:** R=SRE Lead (I6 cost tooling), A=Platform Lead, C=Tenant Admin (reads cost allocation), I=Finance Lead.

**KPIs:** Monthly sustainability and cost reports generated within 5 business days of month-end; cost allocation accuracy ≥ 99% (verified against cloud billing API); net_co2e_kg reduction trend tracked quarterly.

---

### RF-C14-16 — Sub-Processor List

The Sub-Processor List is a per-tenant registry of all third-party organizations that process tenant personal data under a sub-processing relationship, as required by GDPR Art 28.2 and equivalent frameworks. This resource is distinct from the individual Sub-Processor Records in C12 (RF-C12-05): C12 records are operation-level integration contracts; the C14 Sub-Processor List is the tenant's consolidated Art 28.2 disclosure instrument — the list that must be made available to the tenant's data subjects and supervisory authority on request.

**Fields:** list_id, tenant_id, version (monotonically incrementing integer), effective_date, entries[] (each entry: sub_processor_name, country_of_establishment, countries_of_processing[], processing_purposes[], lawful_basis, linked_sub_processor_record_id (FK to RF-C12-05 where applicable), data_categories[], transfer_safeguard (SCCs|BCRs|ADEQUACY_DECISION|NONE), safeguard_reference), generated_at, generated_by (system or DPO principal_id), published_at, superseded_at.

**Lifecycle:** DRAFT → PUBLISHED → SUPERSEDED. A new version is generated automatically on any RF-C12-05 Sub-Processor Record activation or deactivation. The DPO must approve the new version (e-signature required) before it reaches PUBLISHED. The previous version transitions to SUPERSEDED with a superseded_at timestamp and is retained in WORM storage per H5 retention class RC-GDPR-ROPA (minimum 5 years past last effective date).

**RACI:** R=DPO (approval and publication), A=Compliance Lead (governance), C=Platform Lead (generation automation), I=Tenant Admin (access to read published version).

**KPIs:** Zero tenants with a published Sub-Processor List older than 30 days from last RF-C12-05 change; DPO approval cycle time ≤ 5 business days from automatic draft generation.

---

### RF-C14-17 — DPA + Sub-Processor List Bundle

The DPA + Sub-Processor List Bundle is the combined data processing agreement instrument that enterprise customers receive when entering a controller–processor relationship with HESEM. It packages the core DPA terms (governing lawful bases, technical-organizational measures, sub-processor governance rights, audit rights, breach notification timelines, and data return/deletion obligations) together with the current published Sub-Processor List (RF-C14-16) as Exhibit A.

**Fields:** bundle_id, tenant_id, dpa_template_version, sub_processor_list_version (FK to RF-C14-16 list_id), signed_by_customer_principal_id, signed_by_hesem_principal_id (Data Controller Representative), signed_at, effective_date, expiry_date (if fixed term; otherwise NULL for evergreen), governing_law (EU_GDPR|CCPA|PIPL|UK_GDPR|MULTI), renewal_alert_90d_sent, renewal_alert_30d_sent, renewal_alert_7d_sent, status (DRAFT|ACTIVE|PENDING_RENEWAL|EXPIRED|SUPERSEDED).

**Lifecycle:** DRAFT → ACTIVE (on dual e-signature: customer + HESEM DPA representative) → PENDING_RENEWAL (triggered at expiry_date - 90d for fixed-term) → SUPERSEDED (when new bundle replaces it). On Sub-Processor List update (RF-C14-16 new version published), the bundle is amended in place: the new list version is linked, customer is notified per GDPR Art 28.2 30-day objection window, and if no objection is raised, the bundle status remains ACTIVE with an updated sub_processor_list_version pointer. Any customer objection triggers a structured dispute workflow (DPO + Compliance Lead resolution).

**RACI:** R=DPO (execution authority), A=Compliance Lead (template governance), C=Legal (template drafting), I=Tenant Admin (receives signed copy).

**KPIs:** Zero active tenants without a signed DPA bundle in ACTIVE status; 30-day sub-processor objection window notification sent within 24 hours of Sub-Processor List new version publication; DPA renewal alert 90d/30d/7d delivery rate = 100%.

---

## 3. Per-Pack Overlays

### J1 Pharma

- **QP Role (Qualified Person):** A QP is a mandatory regulated role per EU GMP Directive 2003/94/EC Art 51. The QP user account in Identity (RF-C14-08) carries the `QP` role tag in the regulatory profile (RF-C14-02). Only a QP can approve SM-1 (Batch Production Record) transitions touching BD-01 (batch disposition/release). QP e-signature requires TIER_3 (biometric or HSM-backed) per EU Annex 11 §14.
- **Designated Person (DP):** Parallel to QP; required for DSCSA REMS (Risk Evaluation and Mitigation Strategy) programs. DP role tagged in identity; specific BD-02..BD-04 authority assignments mapped to DP.
- **Retention Class:** RC-BATCH-30Y applies to batch records per EU GMP Annex 15 §11; QP e-signature audit events retained 30 years.

### J2 Automotive

- **Per-OEM CSR Overlay Role:** Each OEM relationship (RF-C12-12) maps to a Customer-Specific Requirements (CSR) role overlay. The CSR overlay extends the tenant regulatory profile (RF-C14-02) with OEM-specific authority requirements (e.g., Toyota GQRS requires specific sign-off authority for PPAP submissions). The CSR overlay is stored in the regulatory profile as an `oem_csr_extension[]` array.
- **PPAP Authority:** PPAP submission approval is tagged to the `PPAP_APPROVER` role in Identity; Banned-Decision Surface (RF-C14-13) maps PPAP submission to BD-16 (PPAP approval authority; J2 pack extension).

### J3 Aerospace

- **ITAR Person-of-Record:** A designated individual registered in Identity (RF-C14-08) with the `ITAR_PERSON_OF_RECORD` role tag. This individual is accountable for ITAR compliance and is the notification recipient for region-pinning violations (FM-C12-05-C), GIDEP suspension notices, and ITAR access-outside-region metrics (B9 §per-pack J3).
- **CMMC Roles:** CMMC Level 2+ tenants require `SYSTEM_SECURITY_OFFICER` and `INCIDENT_HANDLER` role tags in Identity. These roles are referenced in the Banned-Decision Surface for CUI handling decisions and in the Cryptographic Module Record for FIPS 140-3 key custody.
- **Retention Class:** RC-ITAR-10Y for ITAR-CUI records; RC-AERO-SAFETY-LIFE for life-limited parts records (life of part + 10 years).

### J4 Medical Device

- **PRRC (Person Responsible for Regulatory Compliance):** EU MDR Art 15 requires a PRRC per legal manufacturer. PRRC user account in Identity carries `PRRC` role tag; specific authority over UDI registration (BD-J4-01), MDR post-market surveillance sign-off (BD-J4-02), and vigilance reporting (BD-J4-03) are all gated on PRRC authority.
- **AR (Authorised Representative):** For non-EU manufacturers placing devices on EU market, the AR is the legal contact in the EU. AR identity record created in Core Platform with `AUTHORISED_REPRESENTATIVE` role tag.
- **Importer / Distributor records:** EU MDR Art 13/14 obligations; Importer and Distributor user roles tagged in Identity; their actions in HESEM (e.g., labeling verification) emit audit events to the chain.
- **Retention Class:** RC-MD-15Y (EU MDR Art 10.8) for Class IIa/IIb/III device technical documentation.

### J5 Food

- **PCQI (Preventive Controls Qualified Individual):** FDA FSMA requires a PCQI to validate the food safety plan. PCQI user account in Identity carries `PCQI` role tag. PCQI authority gates SM-J5-1 (HACCP plan approval), FSMA §204 trading partner suspension (RF-C12-10), and CCP corrective action sign-off.
- **Retention Class:** RC-FSMA-2Y for FSMA records (§1.1410: 2 years from date of record); RC-HACCP-2Y for HACCP records per 21 CFR Part 120. Food safety plan records: RC-FSMA-PLAN-2Y.

---

## 4. Failure Modes

**FM-C14-01 — Tenant FROZEN while critical workflow is mid-flight:** A batch release workflow in SM-1 is in CONFIRMED state when tenant is FROZEN. Workflow pauses; existing inflight TCC saga has 300-second Try timeout; on timeout, saga enters Cancel phase and transaction rolls back to previous safe state. Human resumes after tenant unfrozen.

**FM-C14-02 — Pseudonymization key unavailable during high-volume audit write:** KMS latency spike causes key derivation timeout. Audit event write fails. Fail-safe: audit event is queued to local buffer (max 60 seconds); if KMS recovers, events are written from buffer. If buffer exceeds 60 seconds, SEV-2 alert; operational freeze on the affected domain until KMS restored.

**FM-C14-03 — ROPA out of date for new processing activity:** New pack activated without ROPA update. Compliance check (weekly CronJob) detects mismatch between active packs in RF-C14-02 and ROPA entries. SEV-3 alert to DPO; ROPA update required within 5 business days.

**FM-C14-04 — Legal hold not propagated before retention job runs:** Retention class CronJob attempts to delete records at maximum_retention_years while a Hold Record is DRAFT (not yet ACTIVE). Guard check: deletion job reads ACTIVE Hold Records before processing any batch. DRAFT hold does not block. Gap: hold must reach ACTIVE before deletion window closes. Mitigation: Hold issuance activates immediately on Compliance Lead e-signature (not queued).

**FM-C14-05 — Cryptographic module certificate expires for ITAR tenant:** FIPS 140-3 certificate expires. Alert at 90d / 30d / 7d. If certificate expires without renewal: ITAR tenant key operations fall back to software cryptography (non-FIPS path). This triggers SEV-1 for ITAR tenants; ITAR Person-of-Record notified; operations freeze on ITAR-CUI workloads until recertified.

---

## 5. Standards

- NIST SP 800-63-3 (Digital Identity Guidelines; E1 implementation basis)
- NIST SP 800-57 Part 1 Rev 5 (Key Management Recommendations)
- FIPS 140-3 (Cryptographic Module Validation Program; RF-C14-14)
- GDPR (EU) 2016/679 (Art 25 by design, Art 28 sub-processor, Art 30 ROPA, Art 35 DPIA, Art 17 erasure)
- 21 CFR Part 11 (electronic records and signatures)
- EU GMP Annex 11 (computerised systems in pharmaceutical manufacturing)
- EU AI Act Art 12 (logging) and Art 61 (post-market monitoring)
- ISO 27001:2022 (information security management; C14 provides the ISMS substrate)
- ISO/IEC 27701:2019 (privacy information management; ROPA, DSIA, DSAR)
- NIST Cybersecurity Framework 2.0 (GOVERN, IDENTIFY, PROTECT, DETECT, RESPOND, RECOVER)
- IEC 62443-3-3 (industrial cybersecurity; OT boundary enforcement per L9)
- ISA-95 / IEC 62264 (tenant and enterprise hierarchy modelling)

---

## 6. Cross-References

- **B6 (Cross-Cutting Concerns substrate)** — C14 implements C1 (Audit Chain), C3 (e-Signature), C4 (Identity+Auth), C5 (Tenant Boundary), C10 (Retention+WORM), C13 (PII/Privacy), C16 (Cryptographic Agility), C17 (Sustainability).
- **E1 (Authentication & Identity API)** — defines the API surface for RF-C14-08 Identity/Auth Events.
- **E2 (Authority API)** — decides() method reads RF-C14-13 Banned-Decision Surface and RF-C14-02 Regulatory Profile.
- **E14 (Admin API)** — tenant management, onboarding/offboarding project management, ROPA/DPIA admin.
- **H1 §5** — tenant profile requirements referenced from RF-C14-02 Tenant Regulatory Profile.
- **H5 (Retention)** — Retention Class catalog (RF-C14-12) implements H5 retention periods.
- **I7 §7, I8** — security controls and tenant operations governance that Core Platform implements.
- **L1 §3** — Banned-Decision Surface (RF-C14-13) catalog; pack extensions for BD-1..BD-36.
- **M3** — Tenant, ROPA, DPIA, Audit Event, Hold Record, Retention Class as M3 root catalog entries.
- **B3 §7** — Audit Anchor (RF-C14-09) is the daily Merkle anchor described in B3.

---

## Decision Phrase

```
S1-08_C14_CORE_PLATFORM_DEEP_UPGRADE_COMPLETE
S1-08_C12_C13_C14_PLATFORM_DOMAINS_DEEP_UPGRADE_COMPLETE
```

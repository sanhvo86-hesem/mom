# C12 — Integration Domain

```
domain_code:        D-12
domain_name:        Integration
owner_role:         Platform Lead (with API Lead)
v10_upgrade_date:   2026-04-27
cross_refs:         E15, B8, B7, B6 C5, I7 §7, L2 §8, M3
```

---

## 1. Purpose and Scope

The Integration domain owns every boundary between HESEM and external systems: inbound events and data feeds, outbound event delivery, EDI transactions, regulatory authority submissions, partner trading record maintenance, and sub-processor governance. Without this domain, HESEM is a closed system; with it, HESEM participates in the full supply chain, regulatory, and commercial ecosystem of its customers.

Architecturally, Integration implements the patterns specified in B8 (Integration Boundaries): the HMAC-authenticated webhook inbound pattern, the transactional outbox for reliable event delivery, CloudEvents 1.0 envelope, AS2/AS4/SFTP EDI transport, regulatory submission channels, and sub-processor boundary governance. All integration resources are bounded per B6 C5 (tenant boundary) and subject to C1 (audit chain), C6 (idempotency), and C13 (PII handling) cross-cutting concerns.

This chapter catalogs every resource family managed by the Integration domain, specifying per-resource lifecycle state machines, RACI, failure modes, and KPIs. Per-pack overlays are documented per resource where they differ.

---

## 2. Resource Families

The Integration domain manages thirteen resource families aligned to M3 root catalog entries where applicable.

### RF-C12-01 — Connector

A Connector represents a configured, credentialed link between HESEM and a named external system. The initial connector set covers: Salesforce CRM, SAP S/4 HANA, Oracle EBS, Microsoft Dynamics 365, PTC Windchill, Siemens NX/Teamcenter, Microsoft 365/SharePoint, Google Workspace, Slack/MS Teams, Avalara/Vertex (tax), IBM Maximo/IFS (maintenance migration).

**Connector fields:** connector_id (UUID), tenant_id, system_type, display_name, auth_type (OAuth2|API_KEY|HMAC|mTLS|SAML), credential_secret_ref (KMS pointer; never plaintext), polling_interval_seconds, sync_direction (INBOUND|OUTBOUND|BIDIRECTIONAL), pack_id (optional), region_pinning[] (enforced for ITAR connectors), security_tier (1=standard, 2=enhanced, 3=FedRAMP/FIPS).

**Lifecycle state machine:**

| Source State   | Event                        | Guard                                                  | Target State    | Side-Effects                             | Evidence Emit       |
|----------------|------------------------------|--------------------------------------------------------|-----------------|------------------------------------------|---------------------|
| DRAFT          | configure                    | required_fields_present ∧ credentials_encrypted_in_KMS | CONFIGURED      | store_credential_ref                     | P-01 CREATED        |
| CONFIGURED     | test_connection               | none                                                   | VALIDATING      | async_health_check_dispatched            | P-14 TASK_STARTED   |
| VALIDATING     | health_check_passed          | auth_successful ∧ schema_compatible                    | ACTIVE          | activate_polling_or_push                 | P-20 RECONCILED     |
| VALIDATING     | health_check_failed          | none                                                   | CONFIGURED      | store_error_reason; alert                | P-18 FLAGGED        |
| ACTIVE         | consecutive_errors(≥3)       | none                                                   | DEGRADED        | alert SRE; increment error counter       | P-18 FLAGGED        |
| DEGRADED       | health_check_passed          | none                                                   | ACTIVE          | clear_alert                              | P-20 RECONCILED     |
| ACTIVE         | admin_suspend                | role=PLATFORM_ADMIN OR TENANT_ADMIN                    | SUSPENDED       | stop_polling; cancel_scheduled_syncs     | P-25 SUSPENDED      |
| SUSPENDED      | admin_resume                 | role=PLATFORM_ADMIN OR TENANT_ADMIN                    | ACTIVE          | resume_polling                           | P-20 RECONCILED     |
| SUSPENDED      | admin_decommission           | role=PLATFORM_ADMIN ∧ no_active_subscriptions          | DECOMMISSIONED  | purge_credentials; archive_audit_trail   | P-26 ARCHIVED       |

**RACI:** R=Platform Lead, A=API Lead, C=Tenant Admin, I=Domain leads whose data flows through the connector.

**Failure modes:**
- FM-C12-01-A: Credential rotation not propagated → connector transitions to DEGRADED within 5 minutes (health check interval); SRE alert; human rotates credential via KMS.
- FM-C12-01-B: Partner API schema change breaks inbound deserialization → DEGRADED; DLQ accumulates; schema registry diff report raised; connector operator updates mapping.
- FM-C12-01-C: Region-pinning constraint violated for ITAR connector (e.g., traffic routed through non-ITAR-US zone) → immediate SUSPENDED; SEV-1 incident; Compliance Lead and Regulatory Affairs notified within 1 hour.

**KPIs:** Connector availability per partner ≥ 99.5% (7-day rolling window); health-check p95 latency < 500 ms; zero connectors with expired credentials outstanding for > 24 hours.

---

### RF-C12-02 — Subscription (Webhook Subscription)

A Subscription records an external system's enrollment to receive push events from HESEM when specific event types occur on specific resource roots. Subscriptions use the CloudEvents 1.0 envelope (B8 §2.2) and HMAC-SHA256 request signing.

**Subscription fields:** subscription_id, tenant_id, event_filter (CloudEvents type prefix pattern), target_url, hmac_secret_ref (KMS), retry_policy (max_attempts=10, backoff_base_seconds=2, backoff_cap_seconds=512), dlq_enabled (boolean), active_from, active_until (optional).

**Lifecycle state machine:**

| Source State | Event                           | Guard                               | Target State | Side-Effects                          | Evidence Emit   |
|--------------|---------------------------------|-------------------------------------|--------------|---------------------------------------|-----------------|
| PENDING      | subscriber_verify               | endpoint_reachable ∧ hmac_secret_set| ACTIVE       | send_verification_ping; record_ack    | P-01 CREATED    |
| ACTIVE       | delivery_failure(count≥5)       | none                                | PAUSED       | alert subscriber; stop delivery       | P-18 FLAGGED    |
| PAUSED       | admin_resume                    | role=TENANT_ADMIN                   | ACTIVE       | resume_delivery                       | P-20 RECONCILED |
| ACTIVE       | delivery_failure(count≥10)      | none                                | FAILED       | move_events_to_dlq; notify subscriber | P-18 FLAGGED    |
| ACTIVE       | subscriber_cancel               | none                                | CANCELLED    | stop_delivery; archive_subscription   | P-26 ARCHIVED   |
| FAILED       | admin_reactivate                | endpoint_healthy                    | ACTIVE       | drain_dlq; resume_delivery            | P-20 RECONCILED |

HMAC key rotation: 24-hour overlap window (B8 §auth). Both old and new keys accepted during overlap; old key invalidated after overlap.

**RACI:** R=API Lead, A=Platform Lead, C=Tenant Admin (manages their subscriptions), I=subscribing system operator.

**Failure modes:**
- FM-C12-02-A: Partner endpoint returns 5xx for > 10 retries → FAILED; DLQ retains events for 30 days (WORM per H5 retention class); subscriber alerted.
- FM-C12-02-B: HMAC secret expires without rotation → SEV-2 security incident; subscription paused immediately; forced re-verification.

**KPIs:** Webhook delivery success rate ≥ 99.0% (7-day window); DLQ depth = 0 for regulated-event subscriptions (regulatory channel SLO per B8 §5 KPI-5).

---

### RF-C12-03 — Event (CloudEvents Envelope)

Events are immutable value objects, not stored resources with lifecycle, but the canonical envelope constrains all outbound events:

```
specversion:        "1.0"
id:                 UUID v4 (immutable; idempotency key)
source:             "urn:hesem:{tenant_id}:{domain}:{root_kind}"
type:               "com.hesem.{domain}.{root_kind}.{event_name}"
datacontenttype:    "application/json"
time:               ISO 8601 UTC (immutable once emitted)
Extensions:
  tenantid:         UUID
  principalid:      UUID (actor who triggered; redacted if PII)
  correlationid:    UUID (traces across systems)
  pack_id:          string (optional; set for pack-specific events)
```

Events are written to `outbox_event` in the same database transaction as the mutation that causes them (B8 §2.1 outbox pattern). The outbox worker delivers to RabbitMQ; consumers receive and validate against the registered schema (RF-C12-04). Events are archived to cold storage per H5 retention class (minimum 7 years for regulated domains).

**RACI:** R=API Lead (CloudEvents schema ownership), A=Platform Lead, C=Domain leads (they emit events per their SM transitions), I=all consumers.

---

### RF-C12-04 — Schema (per E15 §3)

A Schema is a versioned specification of a CloudEvents data payload, registered in the Schema Registry. Schemas use Avro as primary format with a JSON Schema mirror for HTTP consumers.

**Schema fields:** schema_id, tenant_agnostic (boolean; most schemas are global), event_type (CloudEvents type string), version (monotonic integer), format (AVRO|JSON_SCHEMA), content (canonical text), deprecated_at, sunset_date, replacement_schema_id.

**Lifecycle state machine:**

| Source State | Event              | Guard                                                 | Target State | Evidence Emit |
|--------------|--------------------|-------------------------------------------------------|--------------|---------------|
| DRAFT        | register           | schema_valid ∧ version_monotonic ∧ additive_change_only | REGISTERED | P-01 CREATED  |
| REGISTERED   | deprecate          | replacement_schema_registered                         | DEPRECATED   | P-18 FLAGGED  |
| DEPRECATED   | retire             | sunset_date_elapsed ∧ no_active_consumers_detected    | RETIRED      | P-26 ARCHIVED |

Breaking changes (removing fields, changing types) are blocked at registration by the registry's compatibility checker (BACKWARD compatibility mode). A new major-version schema is treated as a new resource, and the old schema undergoes the REGISTERED → DEPRECATED → RETIRED cycle with RFC 8594 Sunset header set on API responses.

**RACI:** R=API Lead, A=Platform Lead, C=Domain leads (producers), I=all consumers.

**Failure modes:**
- FM-C12-04-A: Producer publishes event with unregistered schema → rejected at outbox worker; event quarantined; alert raised.
- FM-C12-04-B: Consumer receives event with unknown version → consumer must request schema from registry; if registry unavailable, consumer applies schema-not-found error path.

---

### RF-C12-05 — Sub-Processor Record + DPA

Every external system that receives or processes tenant data is registered as a sub-processor per GDPR Art 28 and applicable data transfer frameworks. This includes cloud infrastructure providers, SaaS connectors, and regulatory authority systems that receive submission data.

**Sub-processor fields:** sub_processor_id, tenant_id (or GLOBAL for platform-level processors), legal_entity_name, jurisdiction, dpa_url, dpa_effective_date, dpa_expiry_date, processing_purposes[] (GDPR Art 28.3 list), data_categories[] (H5 PII classes), region_pinning[] (allowed regions; ITAR-enforced), security_tier (1|2|3), last_security_assessment_date, next_review_date, incident_count.

**Lifecycle state machine:**

| Source State    | Event                     | Guard                                                       | Target State     | Side-Effects                                | Evidence Emit   |
|-----------------|---------------------------|-------------------------------------------------------------|------------------|---------------------------------------------|-----------------|
| PROVISIONAL     | onboard                   | dpa_signed ∧ security_assessment_passed ∧ region_pinning_consistent | ACTIVE    | create_sub_processor_listing in E14         | P-01 CREATED    |
| ACTIVE          | annual_review_due         | none                                                        | UNDER_REVIEW     | schedule_security_assessment                | P-18 FLAGGED    |
| ACTIVE          | incident_raised           | none                                                        | UNDER_REVIEW     | alert DPO + Compliance Lead within 24h      | P-18 FLAGGED    |
| UNDER_REVIEW    | review_passed             | security_assessment_passed ∧ dpa_current                   | ACTIVE           | update_next_review_date                     | P-20 RECONCILED |
| UNDER_REVIEW    | review_failed             | none                                                        | SUSPENDED        | halt_data_transfers; alert DPO              | P-25 SUSPENDED  |
| SUSPENDED       | remediation_confirmed     | Compliance_Lead_approval ∧ DPO_approval                    | ACTIVE           | resume_data_transfers                       | P-20 RECONCILED |
| SUSPENDED       | terminate                 | Compliance_Lead_approval ∧ DPO_approval                    | TERMINATED       | purge_shared_data_within_30d; final_audit   | P-26 ARCHIVED   |

DPA expiry alerts: 90d / 30d / 7d before expiry_date. Failure to renew triggers automatic UNDER_REVIEW.

**RACI:** R=Compliance Lead, A=DPO, C=Platform Lead (technical integration), I=Tenant Admin.

**Failure modes:**
- FM-C12-05-A: DPA expires without renewal → UNDER_REVIEW → data transfer suspended per GDPR Art 28; no data may flow to sub-processor until DPA renewed.
- FM-C12-05-B: Sub-processor security incident → SUSPENDED within 24 hours (per B8 §6 KPI: incident propagation ≤ 24h); regulatory notification where required (GDPR Art 33: controller notified within 72h of breach awareness).
- FM-C12-05-C: ITAR region constraint violated → SEV-1 immediate; Compliance Lead + Regulatory Affairs within 1 hour; transfer halted until root cause cleared.

**KPIs:** Zero sub-processors with expired DPA outstanding > 24 hours; zero data transfers to SUSPENDED sub-processors; security assessment current for 100% of ACTIVE sub-processors.

---

### RF-C12-06 — EDI Transaction (Auto Pack)

EDI Transactions are structured electronic business documents exchanged with OEM trading partners via ANSI X12 or EDIFACT protocols over AS2, SFTP, or AS4 transport.

**Supported ANSI X12 transaction sets:** 850 PO (inbound OEM), 856 ASN (outbound to OEM), 810 Invoice (outbound), 860 PO Change (inbound OEM), 862 Shipping Schedule (inbound OEM), 865 PO Acknowledgment (outbound), 997 Functional Acknowledgment (bidirectional). EDIFACT ORDERS/DESADV/INVOIC mirrors for EU OEM partners. VDA 4987 labels for German OEM.

**Transaction lifecycle (inbound):**

| Source State | Event             | Guard                                                                  | Target State | Side-Effects                             | Evidence Emit      |
|--------------|-------------------|------------------------------------------------------------------------|--------------|------------------------------------------|--------------------|
| RECEIVED     | validate          | X12_envelope_valid ∧ ISA_GS_headers_match_trading_partner_profile      | VALIDATED    | parse_to_internal_DTO                    | P-01 CREATED       |
| VALIDATED    | map               | transaction_set_known ∧ mapping_rule_exists                            | MAPPED       | transform_to_HESEM_domain_object         | —                  |
| MAPPED       | apply             | business_rules_pass (e.g., PO quantities valid, ship-to valid)         | APPLIED      | create_or_update_SO_PO_shipment          | P-08 UPDATED root  |
| APPLIED      | acknowledge       | none                                                                   | ACKNOWLEDGED | generate_997_FA; transmit_997            | P-20 RECONCILED    |
| ACKNOWLEDGED | archive           | none                                                                   | ARCHIVED     | WORM_archive per H5                      | P-26 ARCHIVED      |
| VALIDATED    | reject            | business_rules_fail                                                    | REJECTED     | generate_999_TA with AK5_AE; alert human | P-18 FLAGGED       |

**Transport priority:** AS2 (primary; EDIINT per RFC 4130); SFTP (fallback with PGP encryption); AS4 (EU regulatory EDI per Peppol PINT).

**RACI:** R=Integration Lead, A=Platform Lead, C=Auto Pack Lead (J2), I=OEM partner technical team.

**Failure modes:**
- FM-C12-06-A: OEM sends 860 PO Change after SO is in CONFIRMED state → guard rejects; 999 TA with AK5 AE sent; human queue for reconciliation.
- FM-C12-06-B: AS2 link unreachable > 15 minutes → SFTP failover activated; RB-INC-012 procedure; OEM notified.
- FM-C12-06-C: 997 Functional Acknowledgment not returned within agreed SLA (typically 1 hour) → alert OEM; escalation per J2 trading partner agreement.

**KPIs (J2):** EDI transaction success rate ≥ 99.5%; 997 acknowledgment within 1 hour of transmission; SFTP failover activation < 15 minutes.

---

### RF-C12-07 — DSCSA Trading Partner (Pharma Pack, J1)

A DSCSA Trading Partner represents a verified supply chain participant (manufacturer, wholesale distributor, dispenser, or repackager) in the Drug Supply Chain Security Act system of records.

**Fields:** partner_id, partner_type (MANUFACTURER|WDD|DISPENSER|REPACKAGER), DUNS_number, FDA_facility_registration_number, DEA_number (if applicable), license_number, license_expiry, license_state, EPCIS_2_endpoint, VRS_endpoint (Verification Router Service), last_VRS_check_timestamp, verification_status.

**Lifecycle state machine:**

| Source State         | Event                   | Guard                                                 | Target State         | Evidence Emit    |
|----------------------|-------------------------|-------------------------------------------------------|----------------------|------------------|
| REGISTERED           | verify                  | FDA_license_confirmed ∧ EPCIS_endpoint_reachable      | VERIFIED             | P-01 CREATED     |
| VERIFIED             | first_transaction       | transaction_VRS_check_passed                          | ACTIVE               | P-20 RECONCILED  |
| ACTIVE               | suspect_product_report  | QP_or_RA_approval                                     | UNDER_INVESTIGATION  | P-18 FLAGGED     |
| UNDER_INVESTIGATION  | investigation_cleared   | QP ∧ RA approval                                      | ACTIVE               | P-20 RECONCILED  |
| UNDER_INVESTIGATION  | confirmed_illegitimate  | QP ∧ RA ∧ Compliance_Lead approval                   | REVOKED              | P-25 SUSPENDED   |
| REVOKED              | regulatory_clearance    | FDA_clearance_documented                              | ACTIVE               | P-20 RECONCILED  |

VRS check: HESEM calls the partner's VRS endpoint for every serialised item at point of receipt, verifying product identifier (NDC, lot, serial) before HESEM accepts the unit into inventory.

**RACI:** R=Regulatory Affairs Lead, A=QP (Qualified Person/Designated Person), C=Integration Lead, I=Compliance Lead.

**KPIs (J1):** Suspect-product isolation elapsed time ≤ 24 hours (J1 pack SLO per B9 §per-pack); VRS check success rate ≥ 99.9%; zero unverified product units in HESEM inventory.

---

### RF-C12-08 — EUDAMED / GUDID Account (Medical Device Pack, J4)

EUDAMED (European Database on Medical Devices) and GUDID (FDA Global Unique Device Identification Database) accounts manage the connection to regulatory authority databases for device registration and post-market surveillance.

**Fields:** account_id, account_type (EUDAMED|GUDID), legal_manufacturer_id, SRN (Single Registration Number for EUDAMED), FDA_requester_company_id (GUDID), api_endpoint_version (GUDID v2; EUDAMED v1.7+), last_sync_timestamp, sync_status, submission_queue_depth.

**Lifecycle state machine:**

| Source State | Event                   | Guard                                        | Target State | Side-Effects                         | Evidence Emit   |
|--------------|-------------------------|----------------------------------------------|--------------|--------------------------------------|-----------------|
| CONFIGURED   | test_connection          | api_credentials_valid ∧ test_call_successful | CONNECTED    | record_connection_timestamp          | P-01 CREATED    |
| CONNECTED    | device_record_updated   | UDI_DI_valid ∧ GMDN_code_present             | SYNCING      | push_UDI_record_to_authority         | P-08 UPDATED    |
| SYNCING      | accepted_by_authority   | none                                         | CONNECTED    | record_acceptance; update_timestamp  | P-20 RECONCILED |
| SYNCING      | rejected_by_authority   | none                                         | SYNC_ERROR   | alert Regulatory Affairs; log reason | P-18 FLAGGED    |
| SYNC_ERROR   | admin_retry             | rejection_reason_resolved                    | CONNECTED    | retry_submission                     | P-20 RECONCILED |

GUDID requires UDI-DI and UDI-PI (production identifiers: lot/serial/manufacturing date/expiry) per FDA 21 CFR Part 830. EUDAMED requires the EU MDR/IVDR Basic UDI-DI, Device UDI-DI, and EMDN code.

**RACI:** R=Regulatory Affairs Lead, A=Platform Lead, C=MD Pack Lead (J4), I=Compliance Lead.

**KPIs (J4):** Regulatory submission acceptance rate ≥ 98.0% (B8 §5 KPI-4); UDI record sync lag ≤ 24 hours after device master record update; zero overdue vigilance report submissions.

---

### RF-C12-09 — GIDEP Account (Aerospace Pack, J3)

The Government-Industry Data Exchange Program (GIDEP) provides a shared repository of failure experience, engineering, and reliability reports between government and industry. HESEM participates as both consumer and contributor.

**Fields:** organization_id, CAGE_code, GIDEP_agreement_number, access_level (REPORTS|ALERTS|HAZARD_ALERTS|FULL), reporting_obligations (boolean; AS9120B sites must report certain failure modes), last_query_timestamp, last_submission_timestamp, ITAR_restricted (boolean).

**Lifecycle state machine:**

| Source State       | Event                     | Guard                                              | Target State       | Evidence Emit   |
|--------------------|---------------------------|----------------------------------------------------|--------------------|-----------------|
| ENROLLED           | activate                  | annual_agreement_signed ∧ CAGE_code_verified       | ACTIVE             | P-01 CREATED    |
| ACTIVE             | GIDEP_suspension_notice   | none                                               | SUSPENDED_BY_GIDEP | P-25 SUSPENDED  |
| SUSPENDED_BY_GIDEP | suspension_lifted         | GIDEP_clearance_received                           | ACTIVE             | P-20 RECONCILED |
| ACTIVE             | admin_withdraw            | Quality_Lead ∧ Platform_Lead approval              | WITHDRAWN          | P-26 ARCHIVED   |

GIDEP queries are integrated into the Incoming Inspection (IQC) workflow (D4 Procurement) and the Aero Corrective Action (PREC) workflow. GIDEP alerts matching purchased part numbers trigger automatic holds on affected lots.

ITAR note: GIDEP data referencing ITAR-controlled technical data must be processed exclusively in the ITAR-US region (B7 §4). ITAR-flagged GIDEP accounts have region_pinning = ["us-gov-east-1"].

**RACI:** R=Quality Lead, A=Regulatory Affairs Lead, C=Aero Pack Lead (J3), I=Platform Lead.

**KPIs (J3):** GIDEP alert response time < 8 business hours; 100% of received hazard alerts evaluated within 24 hours; zero overdue GIDEP failure-experience submissions.

---

### RF-C12-10 — FSMA §204 Trading Partner (Food Pack, J5)

FSMA §204 (Food Safety Modernization Act, Traceability Rule, 21 CFR Part 1, Subpart S) requires tracking Critical Tracking Events (CTEs) and Key Data Elements (KDEs) for foods on the Food Traceability List (FTL) throughout the supply chain.

**Fields:** partner_id, partner_type (GROWER|PACKER|SHIPPER|RECEIVER|DISTRIBUTOR|MANUFACTURER), FDA_facility_registration_number, TLC_algorithm (Traceability Lot Code algorithm, per §1.1310), CTE_types_supported[] (GROWING|RECEIVING|TRANSFORMATION|CREATION|SHIPPING), kde_endpoint, kde_format (FSMA_JSON|SFTP_CSV|EDI_856_FSMA_EXTENSION).

**Lifecycle state machine:**

| Source State    | Event                    | Guard                                                       | Target State    | Evidence Emit   |
|-----------------|--------------------------|-------------------------------------------------------------|-----------------|-----------------|
| REGISTERED      | validate_KDE_mapping     | all_required_KDEs_mappable ∧ CTE_format_compatible          | KDE_VALIDATED   | P-01 CREATED    |
| KDE_VALIDATED   | first_shipment_received  | CTE_RECEIVING_complete ∧ TLC_assigned                       | ACTIVE          | P-20 RECONCILED |
| ACTIVE          | missing_KDE_detected     | none                                                        | NON_COMPLIANT   | P-18 FLAGGED    |
| NON_COMPLIANT   | KDE_gap_resolved         | PCQI_verification                                           | ACTIVE          | P-20 RECONCILED |
| NON_COMPLIANT   | non_compliance_persists>7d | none                                                      | SUSPENDED       | P-25 SUSPENDED  |
| SUSPENDED       | PCQI_clearance           | PCQI ∧ Compliance_Lead approval                             | ACTIVE          | P-20 RECONCILED |

When a missing-KDE event is detected, the affected lot is placed on hold (SM-13 HOLD state) until the gap is resolved. FDA traceability-back requests must be fulfilled within 24 hours (J5 FSMA KPI).

**RACI:** R=PCQI (Preventive Controls Qualified Individual), A=Compliance Lead, C=Food Pack Lead (J5), I=Integration Lead.

**KPIs (J5):** FSMA traceability-back response ≤ 24 hours (J5 SLO per B9 §per-pack); HACCP CCP excursion count = 0; 100% of FTL-food lots have complete CTE chain.

---

### RF-C12-11 — Inbound Callback Endpoint

An Inbound Callback Endpoint is a secured HTTPS URL registered in HESEM that accepts push notifications from external authorities or partners (e.g., OAuth2 callback, regulatory status callback, payment gateway webhook).

**Fields:** endpoint_id, tenant_id, purpose (OAUTH2_CALLBACK|REGULATORY_STATUS|PAYMENT|PARTNER_EVENT), url_path (system-assigned), auth_method (HMAC_SHA256|BEARER_TOKEN|mTLS), challenge_token (for ownership verification), expiry_date.

**Lifecycle state machine:**

| Source State | Event                    | Guard                                         | Target State | Evidence Emit  |
|--------------|--------------------------|-----------------------------------------------|--------------|----------------|
| REGISTERED   | verify_ownership         | challenge_response_valid                      | VERIFIED     | P-01 CREATED   |
| VERIFIED     | first_valid_callback     | HMAC_valid ∧ timestamp_within_5min             | ACTIVE       | P-20 RECONCILED|
| ACTIVE       | certificate_expiry       | none                                          | EXPIRED      | P-18 FLAGGED   |
| ACTIVE       | token_expiry             | none                                          | EXPIRED      | P-18 FLAGGED   |
| EXPIRED      | admin_renew              | role=TENANT_ADMIN                             | ACTIVE       | P-20 RECONCILED|
| ACTIVE       | admin_disable            | role=PLATFORM_ADMIN                           | DISABLED     | P-26 ARCHIVED  |

Security: every inbound callback is validated with HMAC-SHA256 (signature in `X-HESEM-Signature-256` header); timestamp check ± 5 minutes prevents replay.

**RACI:** R=API Lead, A=Platform Lead, C=Tenant Admin, I=External partner technical contact.

---

### RF-C12-12 — Per-OEM Portal Connection (Auto Pack, J2)

OEM-specific supplier portals (Stellantis SupplierConnect, Toyota GQRS, Ford Covisint, GM Covisint, Volkswagen Group Supply) require dedicated adapter connections beyond standard EDI, managing portal-specific authentication, format adaptations, and self-service procurement workflows.

**Fields:** oem_id, portal_name, portal_url, auth_type (OAUTH2|BASIC|X509|EDI_VAN), supported_transactions[], api_version, last_health_check, connection_status, oem_contact_name, oem_contact_email.

**Lifecycle state machine:** Mirrors RF-C12-01 Connector (DRAFT → CONFIGURED → VALIDATING → ACTIVE → DEGRADED → SUSPENDED → DECOMMISSIONED) with OEM-specific guards:
- CONFIGURED → VALIDATING guard additionally requires: oem_supplier_code_registered ∧ VIN_format_compatible (J2 VIN validation per SM-J2-1 in B4).

**RACI:** R=Auto Pack Lead (J2), A=Integration Lead, C=Tenant Admin, I=OEM partner technical contact.

**KPIs (J2):** Portal connection availability ≥ 99.0%; EDI-over-portal transaction latency ≤ 2 seconds p95; zero missed PPAP submission deadlines attributable to portal outage.

---

### RF-C12-13 — Webhook Subscription (HTTP Delivery Variant)

While RF-C12-02 covers the abstract Subscription resource (event enrollment), the Webhook Subscription is the specific resource representing an external system's registration to receive HESEM events via HMAC-authenticated HTTPS POST delivery. This distinction matters operationally: the abstract Subscription may be delivered via multiple transports (HTTP webhook, AsyncAPI channel, S3 event file drop); the Webhook Subscription specifically represents the HTTP push delivery contract.

**Webhook Subscription fields (additional to RF-C12-02):** target_url (HTTPS; TLS 1.3 minimum), hmac_key_ref (KMS pointer to HMAC-SHA256 key), signature_header (default `X-HESEM-Signature-256`), content_type (default `application/cloudevents+json`), batch_enabled (boolean; if true, delivers up to 10 events per POST to reduce connection overhead), tls_verify (boolean; always true in production; test environments may disable).

**HMAC signature format:** `X-HESEM-Signature-256: sha256=<hex_signature>` where signature = `HMAC-SHA256(key, request_body_bytes)`. Subscriber validates this header on every received request. Replays are detected by `X-HESEM-Delivery-Timestamp` (Unix epoch); subscribers reject timestamps outside ±300 seconds.

**Lifecycle:** Inherits RF-C12-02 states (PENDING → ACTIVE → PAUSED → FAILED → CANCELLED). PENDING → ACTIVE requires an ownership verification ping: HESEM sends an empty POST with a `X-HESEM-Verification-Token` header; subscriber must respond 200 with the same token in the response body.

**RACI:** R=API Lead, A=Platform Lead, C=Tenant Admin, I=external partner technical contact.

**KPIs:** Webhook delivery success rate ≥ 99.0% (7-day rolling); HMAC key rotation completed within 24-hour overlap window; DLQ depth = 0 for regulated-event webhook subscriptions.

---

## 3. Per-Pack Overlays

**J1 Pharma:**
- RF-C12-07 DSCSA Trading Partner: mandatory for all supply chain participants.
- EPCIS 2.0 event schemas registered in RF-C12-04 Schema Registry (EPCIS ObjectEvent, AggregationEvent, TransactionEvent).
- Outbound EPCIS ASN dispatched via outbox → RF-C12-02 Subscription → VRS partner endpoint.
- Serial Number Range management linked to RF-C12-01 connector for serialisation authority system.

**J2 Automotive:**
- RF-C12-06 EDI Engine: mandatory for all OEM relationships.
- RF-C12-12 Per-OEM Portal Connection: one resource per OEM relationship.
- VDA 4987 label schema registered in RF-C12-04 Schema Registry.
- AS2 mandatory primary transport; AS4 for EU OEMs on Peppol network.

**J3 Aerospace:**
- RF-C12-09 GIDEP Account: mandatory for AS9120B-certified sites.
- ITAR-flagged connectors (region_pinning=["us-gov-east-1"]); FIPS 140-3 cryptography enforced in auth (security_tier=3 required for all connectors handling ITAR-CUI).
- AS9120B evidence schemas (first-article inspection, COC) in RF-C12-04 Schema Registry.
- CMMC Level 2+ controls mapped to sub-processor security tier requirements in RF-C12-05.

**J4 Medical Device:**
- RF-C12-08 EUDAMED/GUDID Account: mandatory for any device placed on EU or US market.
- HL7 FHIR R4 Device resource connector for EUDAMED FHIR API (2026 EUDAMED API roadmap).
- SOUP (Software of Unknown Provenance) dependency tracking in RF-C12-05 Sub-Processor records (IEC 62304 §8.1.2).
- Unique Device Identification (UDI) encoding validated via RF-C12-11 callback from FDA GUDID.

**J5 Food:**
- RF-C12-10 FSMA §204 Trading Partner: mandatory for all FTL-food supply chain participants.
- PTI (Produce Traceability Initiative) GS1-128 barcode ingest connector (RF-C12-01).
- FSMA CTE/KDE JSON schema registered in RF-C12-04 Schema Registry (CTEReceiving, CTEShipping, CTETransformation).
- FDA CTES (Compliant Trading Electronic System) integration via RF-C12-11 Inbound Callback.

---

## 4. Standards

- OpenAPI 3.1.1 (REST contract for all Integration management APIs)
- AsyncAPI 3.0 (event contract specification; CloudEvents 1.0 envelope)
- RFC 9457 (Problem Details for HTTP APIs)
- ANSI X12 (EDI; transaction sets 850/856/810/860/862/865/997)
- EDIFACT ORDERS/DESADV/INVOIC (European EDI)
- AS2 / EDIINT per RFC 4130 (EDI transport)
- AS4 / OASIS ebMS 3.0 (EU regulatory EDI transport)
- EPCIS 2.0 / CBV 2.0 (DSCSA supply chain events)
- GDPR Art 28 (sub-processor governance)
- 21 CFR Part 820.70, 830 (UDI; FDA device registration)
- EU MDR 2017/745, IVDR 2017/746 (EUDAMED)
- FSMA §204 / 21 CFR Part 1 Subpart S (food traceability)
- GAMP 5 (validation of computerised systems in integration context)
- IEC 62443 (OT integration security boundaries)

---

## 5. Cross-References

- **E15 Integration API** — per-resource management endpoints; schema registry API; sub-processor listing admin API.
- **B8 Integration Boundaries** — inbound/outbound patterns; outbox; CloudEvents envelope; failure modes; sub-processor boundary governance.
- **B7 Deployment Topology §8** — SLSA v1.0 supply chain for connector container images; SBOM for EDI engine.
- **B6 C5** — tenant boundary: all connectors, subscriptions, and partner records are tenant-scoped; no cross-tenant data flow permitted.
- **I7 §7** — Security review gates for new connector onboarding; penetration test requirement for security_tier ≥ 2 connectors.
- **L2 §8** — AI governance: AI advisory must not drive automated integration decisions (e.g., cannot autonomously reconfigure connector routing).
- **M3** — Connector, Subscription, Schema, Sub-Processor Record are M3 root catalog entries with canonical root_kind identifiers.

---

## Decision Phrase

```
S1-08_C12_INTEGRATION_DEEP_UPGRADE_COMPLETE
```

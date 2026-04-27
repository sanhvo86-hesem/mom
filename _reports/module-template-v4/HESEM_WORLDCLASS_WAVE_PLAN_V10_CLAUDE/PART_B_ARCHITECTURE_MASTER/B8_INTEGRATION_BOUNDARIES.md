# B8 — Integration Boundaries

**Version:** V10-Deep  
**Status:** Authoritative  
**Replaces:** V9 B8 (5 boundary types; no inbound/outbound patterns, schema evolution, auth, or failure modes)  
**Cross-references:** E15 (canonical integration API), I7 §7, L2 §8, W13, B6 C5, B7

---

## §1 Inbound Integration Patterns

### 1.1 Webhook Callback (Signed HMAC)

Partners and customer systems that need to push data into HESEM in real time
use the webhook callback pattern via the E15 integration API. Every inbound
webhook endpoint validates the request before processing:

1. **HMAC signature verification:** The partner signs the request body with
   a shared secret using HMAC-SHA256. HESEM recomputes the HMAC and compares.
   Mismatched signatures return HTTP 401; the event is logged to the security
   audit trail (H4 EC-22). The shared secret is per-tenant, per-partner, and
   stored in the platform secret vault (never in application config files).
2. **Replay prevention:** The request must carry an `X-Timestamp` header
   within ±5 minutes of the server clock. Requests with timestamps outside
   this window return HTTP 400 `WEBHOOK_TIMESTAMP_OUT_OF_RANGE`. This prevents
   replay attacks where a legitimate signed request is captured and re-submitted.
3. **Idempotency:** Every inbound webhook request must carry an `Idempotency-Key`
   header (per B6 C6). The integration service checks this key against the
   idempotency store before processing; duplicate delivery returns the original
   response without re-processing.
4. **Schema validation:** The request body is validated against the AsyncAPI 3.0
   channel schema registered in E15 §3 (schema registry). Schema violations
   return HTTP 422 with a Problem Details body (B6 C8) listing each invalid field.

Endpoint: `POST /api/v1/integrations/inbound/{channel_id}` (per E15.19).

### 1.2 Pull-Based Partner Sync

Some partner systems cannot push data; HESEM polls them on a configured interval
(minimum 1 minute; maximum 24 hours). The pull job runs as a Kubernetes CronJob
in the `hesem-jobs` namespace. The job authenticates to the partner system using
a service-account OAuth2 token or API key stored in the platform secret vault.

On each pull, the job fetches only records modified since the last successful
poll (using the partner's `updated_since` parameter or equivalent). The fetched
records are converted to HESEM's canonical data format, validated against the
schema registry, and enqueued as L3 commands via the command bus. The L3 command
handler processes them idempotently; duplicate records (same partner record ID,
same revision) are detected and skipped via A-17.

### 1.3 File-Based Exchange (CSV / NDJSON / EDIFACT / X12 / EDIFACT)

For partners that cannot support API-based integration (legacy ERP systems,
some government submission systems), HESEM supports file-based exchange:

- **CSV/NDJSON:** Uploaded via the E15 file upload endpoint or dropped in an
  SFTP-monitored directory. The file processor validates the header row against
  the schema registry; rows with validation errors are reported in a per-row
  error report emailed to the integration owner.
- **EDIFACT / X12 EDI:** Processed by the EDI parser service, which translates
  each EDI transaction set to HESEM's canonical JSON and submits as an L3 command.
  Supported transaction sets: X12 850 (Purchase Order), 855 (PO Acknowledgment),
  856 (ASN), 810 (Invoice), 830 (Planning Schedule), 861 (Receipt Advice);
  EDIFACT ORDERS, ORDRSP, DESADV, INVOIC, RECADV.
- **EDI VAN (Value-Added Network):** HESEM connects to the customer's EDI VAN
  via AS2 or AS4 protocol. AS2 MDN (Message Disposition Notification) is used
  for reliable delivery confirmation. AS2 certificates are rotated annually and
  stored in the platform secret vault.

### 1.4 Regulatory Submission Inbound

Some regulators push data back to HESEM (e.g. DSCSA acknowledgments from trading
partners, EU FMD EMVS verification responses). These arrive via regulator-specific
protocols:

- **DSCSA EPCIS (J1 Pharma):** Inbound EPCIS 1.2 / 2.0 events from DSCSA
  trading partners; validated against the GS1 EPCIS XSD; mapped to OTG
  DSCSA_EXCHANGED_WITH predicate assertion.
- **EU FMD EMVS (J1 Pharma):** FMD alert notifications from the national
  medicines verification systems; processed by the FMD integration service;
  triggers NC creation (SM-6) if an alert matches a HESEM-released pack.
- **GUDID / EUDAMED response (J4 Medical Device):** UDI submission status
  returned by FDA GUDID API or EUDAMED API; updates the UDI_RECORD node
  status in OTG.
- **ICH E2B(R3) individual case safety reports (J1 Pharma):** Inbound
  pharmacovigilance cases from regional competent authorities or MAH partners;
  processed by the PV integration service.

---

## §2 Outbound Integration Patterns

### 2.1 Outbox Pattern (Every Domain Emit)

Every L4 domain mutation that must trigger an outbound integration writes a row
to the `outbox_event` table within the same Postgres transaction as the domain
mutation. This guarantees that either both the domain mutation and the outbound
notification succeed, or neither does — there is no window in which the domain
record is updated but the notification is lost.

The L8 outbox relay reads `outbox_event` rows via Postgres logical decoding
(CDC; per B3 §6.2) and publishes them to the appropriate outbound channel.
The relay marks `relayed_at` and `relay_attempts` on each row; failed deliveries
are retried with exponential backoff (1s, 2s, 4s, 8s, ..., 256s maximum). After
10 failed attempts, the row is moved to the dead-letter queue and an L8 alert
fires.

### 2.2 CloudEvents 1.0 Envelope

All outbound events are wrapped in a CloudEvents 1.0 envelope. Mandatory
attributes: `specversion: "1.0"`, `id` (UUID matching the `outbox_event.outbox_id`),
`source` (the HESEM tenant API URL + resource path), `type` (namespaced event type,
e.g. `io.hesem.lot.released.v1`), `datacontenttype: "application/json"`,
`time` (ISO 8601 UTC). Extension attributes: `tenantid`, `principalid`,
`correlationid` (matches the L3 `command_id`). This envelope is consumed by
webhook subscribers (§2.3), the analytics lakehouse (§2.4), and partner-specific
adapters.

### 2.3 Webhook Delivery (per E15.1)

Partners may subscribe to HESEM events via the webhook subscription API (E15.1).
Each subscription specifies: the event type pattern (glob; e.g. `io.hesem.lot.*`),
the delivery endpoint URL (HTTPS only; must return 2xx within 30s), the signing
secret for HMAC-SHA256 request signing, and the tenant scope.

Delivery: the L8 outbox relay constructs the CloudEvents envelope, signs the body
with HMAC-SHA256 using the subscription's signing secret (header `X-Hesem-Signature`),
and POSTs to the delivery endpoint. Retry: up to 10 attempts with exponential
backoff. Dead-letter: after 10 failures, the event is enqueued in the dead-letter
queue; the subscription owner is notified; the event can be replayed via E15.20.

### 2.4 CDC Outbound to Lakehouse (per W8)

For analytics consumers, OTG events are streamed to the customer's analytics
lakehouse (Snowflake, BigQuery, or Databricks) via a dedicated CDC export job.
The job reads from the `otg_event` publication (B3 §6.1), converts events to
the lakehouse schema (Parquet/Delta format), and loads via the lakehouse's
streaming ingest API. PII fields are pseudonymised before export (B6 C13).
The CDC export job is per-tenant; it operates in the `hesem-data` namespace
with a dedicated service principal that has read-only access to `otg_event`
for the specific tenant.

### 2.5 AsyncAPI 3.0 Channel Definitions

Every integration channel (inbound and outbound) is described in an AsyncAPI 3.0
document published at `GET /api/v1/integrations/async-api.yaml` (E15 §3). Channel
definitions specify: protocol bindings (HTTPS/webhook, AMQP, SFTP, AS2), message
schemas (JSON Schema; referenced from the schema registry), security schemes
(HMAC, OAuth2, mTLS), and per-channel SLOs (delivery latency, availability).

Integration partners are expected to generate client stubs from the AsyncAPI
document; HESEM publishes the AsyncAPI document as part of its public API contract.

---

## §3 Sub-Processor Boundary Discipline

Sub-processors are third-party services that process HESEM customer data on behalf
of HESEM as the data controller. Per L2 §8 and I7 §7, sub-processor usage is
governed by:

1. **DPA requirement:** Every sub-processor must have a signed Data Processing
   Agreement (DPA) with HESEM. The DPA specifies: what data is processed, for
   what purpose, in which regions, for how long, and with what security controls.
2. **Per-tenant DPA listing:** Each tenant can view the list of sub-processors
   that process their data via the E14 admin API (`GET /api/v1/admin/sub-processors`).
   This fulfils GDPR Article 28(3)(d) transparency obligations.
3. **Per-region constraint:** Sub-processors are bound by the per-region data
   residency rules (B5 §5). A sub-processor approved for EU-region processing may
   not process EU-sovereign tenant data in a US sub-processor instance.
4. **Per-incident propagation:** If a sub-processor reports a security incident that
   may affect HESEM customer data, the incident is classified under the HESEM
   incident response runbook (I7 §8) within 24 hours. HESEM notifies affected
   tenants within the GDPR 72-hour window if personal data may have been compromised.
5. **Sub-processor service principal:** Service-to-service authentication with
   sub-processors uses short-lived OAuth2 tokens (1h expiry) scoped to the
   specific sub-processor's API. Tokens are minted by the L1 service credential
   manager; they carry `tenant_id` and `sub_processor_scope` claims. No long-lived
   API keys are used for sub-processor integrations.

Current approved sub-processors (representative list, not exhaustive): cloud
infrastructure provider (compute, storage, networking), managed Postgres provider
(where applicable), TSA service (RFC 3161 timestamping), SMS/email notification
service (for MFA and alerts), regulatory submission gateway (DSCSA, FMD, GUDID).

---

## §4 Per-Partner SLA per Pack

### J1 Pharma — DSCSA + EU FMD

**DSCSA EPCIS partner network:**
- Availability SLA: 99.9% for receiving EPCIS events from trading partners.
- Delivery latency: T3 (dispense) events must be processable within 1 business day of receipt (FDA §582 requirement).
- Error handling: EPCIS events with invalid GTINs or lot numbers are quarantined; the trading partner is notified within 4 hours; the event is not committed to OTG until the discrepancy is resolved.

**EU FMD EMVS:**
- Availability SLA: 99.5% (FMD EMVS uptime is beyond HESEM's control; the integration has a 24h buffer for EMVS outages).
- FMD verification responses: must be returned to the pharmacist within 500ms (EU FMD Commission Delegated Regulation 2016/161 §31).

### J2 Auto — OEM EDI

- Each OEM has a distinct EDI channel with its own VAN connection and AS2 MDN.
- OEM-specific delivery SLA: defined in the OEM EDI trading partner agreement (typically 4h acknowledgment window for 850 PO receipt).
- OEM EDI acknowledgment (855) must be dispatched by HESEM within 30 minutes of receiving a valid 850; otherwise the OEM's ERP escalates to an exception.

### J3 Aero — FAA + EASA + GIDEP

- FAA Aviation Safety Hotline (GIDEP alerts): inbound GIDEP alert notifications are ingested daily via file download from the GIDEP portal; matched against HESEM part numbers and supplier records; if a match is found, an NC is automatically created (SM-6).
- EASA continued airworthiness notifications: processed as inbound regulatory submissions; correlated to affected aircraft serial numbers via J3 GENEALOGY chain.

### J4 Medical Device — GUDID + EUDAMED

- GUDID submission: HESEM submits new UDI records to GUDID via the FDA GUDID API (REST) within 5 business days of first commercial distribution (FDA 21 CFR §830.300). GUDID API responses are recorded in OTG (PRODUCED_UDI predicate update).
- EUDAMED submission: EU MDR Article 26 requires EUDAMED UDI registration before placing a device on the EU market. HESEM submits to EUDAMED via the EUDAMED API; submission status is tracked in OTG.

### J5 Food — FSMA §204 Trading Partner

- HESEM generates and transmits FSMA §204 KDE/CTE records to downstream trading partners within 24 hours of a Critical Tracking Event (CTE) occurring. The transmission format is FDA FSMA Electronic Sortable Spreadsheet (ESS) or partner-preferred API format.
- FDA trace-back request response: the E15 integration API can generate a complete FSMA §204 trace-back response package (all KDEs and CTEs for a specified lot) within 24 hours of an FDA request (21 CFR §1.1455).

---

## §5 Schema Evolution Discipline

Integration schemas are treated as contracts with external partners. Breaking
changes require a 6-month deprecation window and explicit partner migration
planning.

**Additive-only changes (no partner notification required):**
- Adding a new optional field to an existing message type.
- Adding a new message type to an existing channel.
- Adding a new channel to the AsyncAPI document.

**Non-breaking changes requiring notification (1-month notice):**
- Changing the type of an optional field to a broader type (e.g. string → anyOf[string, number]).
- Adding a new required field with a default value that is backward-compatible.

**Breaking changes (6-month deprecation window; H7 Class A):**
- Removing or renaming an existing field.
- Changing the type of a field to an incompatible type.
- Changing the cardinality of a field (1 → N).
- Removing a message type or channel.

**Sunset header (RFC 8594):** When an endpoint or message type enters the
deprecation window, the API response and AsyncAPI document carry the
`Sunset: <HTTP-date>` header/field indicating the removal date. Partners
must migrate before this date; HESEM provides a migration guide and a
compatibility shim for the deprecation window.

**Schema registry (per E15.3):** All schemas (JSON Schema for message bodies;
AsyncAPI for channel contracts) are registered in the E15 schema registry with
a monotonic version number (`v1`, `v2`, ...). Old schema versions are retained
in the registry for the full deprecation window after removal from production.

---

## §6 Authentication and Authorisation

### 6.1 Service-Account Tokens (per E1.4)

Service principals (integration partners, sub-processors, Edge Gateways) use
short-lived OAuth2 bearer tokens issued by the L1 identity service. Token lifetime:
1 hour. Scopes are bound to the specific integration channel(s) the service
principal is authorised for. Service principal credentials (client_id + client_secret)
are stored in the platform secret vault; they are never embedded in code or config files.

### 6.2 HMAC Signing for Webhooks

Outbound webhook delivery is signed with HMAC-SHA256 using a per-subscription
secret. Inbound webhooks must present a valid HMAC-SHA256 signature. The shared
secret is generated cryptographically (32 random bytes; base64url-encoded) and
delivered to the partner via a secure channel (not email). Secret rotation is
supported via E15.21 (secret rotation endpoint); during rotation, both the old
and new secret are valid for a 24-hour overlap window.

### 6.3 mTLS for Partner Direct

Partners with a direct (non-webhook) integration channel connect via mTLS. The
partner presents an X.509 client certificate issued by the partner's CA; HESEM
presents its server certificate. The allowed client CA list is configured per
integration channel in the Istio gateway. Certificate expiry is monitored by L8;
a 30-day expiry warning fires to both HESEM and the partner.

### 6.4 Per-Tenant Credential Isolation

Integration credentials (OAuth2 client secrets, HMAC secrets, partner API keys)
are scoped to a single tenant. A credential for tenant A cannot be used to access
tenant B's integration channels. This is enforced by the L1 token issuer: all
tokens carry `tenant_id` as a mandatory claim; the integration service validates
`tenant_id` against the requested channel's tenant scope before processing.

---

## §7 Cross-Region Integration Constraints

**Per-region pinning honoured:** Outbound integration events for a tenant pinned
to a specific region are dispatched from a relay in that region. The relay in
region A does not forward events to a relay in region B for dispatch; doing so
would create a cross-region data transfer that may violate residency rules (B5 §5).

**Cross-border egress rejection:** The L8 egress gateway enforces the per-tenant
residency rules before any outbound API call to a partner. If the partner endpoint
is in a jurisdiction that the tenant's data may not egress to, the call is rejected;
an alert fires; the event is held in the dead-letter queue until the integration
owner resolves the configuration.

**ITAR / EAR special handling (J3):** ITAR-controlled integration data (e.g.
technical data submitted to a non-ITAR-cleared partner) is blocked at the egress
gateway. The ITAR flag on `outbox_event.pack_tags` triggers a special ITAR export
authorisation check before dispatch. Only partners with a valid ITAR export
authorisation reference on file in the E15 partner registry may receive ITAR-flagged
events.

---

## §8 Failure Modes

**FM-B8-01 Partner Unreachable (per RB-INC-012)**
- Trigger: Outbox relay receives 5xx or connection timeout from partner endpoint
  for 3 consecutive attempts.
- Severity: SEV-2; escalates to SEV-1 if regulated submission is blocked (e.g.
  DSCSA T3 event not deliverable within FDA reporting window).
- Recovery: Events held in retry queue with exponential backoff. After 10 attempts,
  moved to dead-letter queue; integration owner alerted. Manual replay via E15.20
  once partner recovers. If FDA reporting window is breached, compliance officer
  notified for regulatory escalation.

**FM-B8-02 Schema Mismatch**
- Trigger: Inbound webhook body fails validation against the schema registry version
  declared in the `Content-Type` or `X-Schema-Version` header.
- Severity: SEV-3 (individual event rejected; no data loss for HESEM); SEV-2 if
  systematic (partner deployed a breaking change without coordinating).
- Recovery: The event is returned to the partner with HTTP 422 + Problem Details
  listing each validation failure. If systematic, trigger a partner communication
  and coordinate schema migration per §5.

**FM-B8-03 HMAC Signature Invalid**
- Trigger: Inbound webhook HMAC-SHA256 does not match the recomputed value.
- Severity: SEV-2 (potential security incident — spoofed or tampered request).
- Recovery: Event rejected with HTTP 401; security audit event emitted. If
  repeated, the integration channel is suspended; integration owner alerted;
  incident investigated per I7 §8.

**FM-B8-04 Integration Quota Exceeded**
- Trigger: A partner integration channel exceeds its configured per-minute or
  per-day event rate limit.
- Severity: SEV-3; events above the quota are rejected with HTTP 429 with
  `Retry-After` header.
- Recovery: The partner backs off and retries after the `Retry-After` interval.
  If the quota is consistently reached, the integration owner reviews and may
  request a quota increase via E14.

**FM-B8-05 Region Pinning Violated**
- Trigger: An outbound integration dispatch is attempted to a partner endpoint
  in a jurisdiction outside the tenant's permitted egress regions.
- Severity: SEV-1 for ITAR-controlled data; SEV-2 for GDPR-restricted transfers.
- Recovery: Dispatch blocked; event held in dead-letter queue; integration owner
  alerted; legal review of whether an adequate transfer mechanism (SCC, adequacy
  decision) exists before enabling dispatch.

**FM-B8-06 Sub-Processor Security Incident**
- Trigger: Sub-processor reports a security incident via their DPA notification
  obligation.
- Severity: SEV-1 if personal data affected; SEV-2 otherwise.
- Recovery: HESEM incident commander activates per I7 §8 runbook; assesses
  scope of affected HESEM customer data; prepares GDPR Article 33 notification
  if required; notifies affected tenants within 72 hours; works with sub-processor
  on containment.

---

## §9 KPIs

| KPI | Metric | Target | Window | Source | Alert |
|---|---|---|---|---|---|
| Per-partner availability | Fraction of partner endpoint calls that complete successfully (2xx) | >= 99.5% per partner | 30-day rolling | L8 outbox relay delivery log | < 99.0% for 1h |
| Webhook delivery success rate | Fraction of outbound webhook deliveries that succeed on first attempt | >= 99.0% | 7-day rolling | Outbox relay delivery metric `webhook.delivery.success_rate` | < 98.0% |
| Per-regulator submission acceptance rate | Fraction of regulatory submissions (GUDID, EUDAMED, DSCSA, FMD) accepted by the regulator's API on first submission | >= 98.0% per regulator | Monthly | Integration audit log per regulatory channel | < 95% triggers schema review |
| CDC lag (SLO-13) | Replication lag from `otg_event` table to outbox relay publish | < 60s p95 | Continuous | `pg_replication_slots.confirmed_flush_lsn` lag | > 45s |
| Dead-letter queue depth | Count of events in dead-letter queue awaiting manual replay | 0 for regulatory channels; < 10 for non-regulatory | Continuous | Outbox relay DLQ depth metric | > 0 for regulatory channels |

---

## §10 Per-Pack Overlay

### J1 Pharma

HESEM integrates with the following pharma-specific systems via B8:
- **DSCSA EPCIS repository:** Subscribes to partner T1/T2 events; emits T3 events on dispense (SM-1 ship transition). EPCIS 2.0 preferred; 1.2 fallback for legacy partners.
- **EU FMD EMVS national systems:** One integration per EU member state where the tenant operates. Alert handling creates NC records automatically.
- **ERP integration (SAP/Oracle):** Pull-based sync for master data (material numbers, BOMs, supplier records) via AS2 IDOC or REST batch API.
- **LIMS integration:** Laboratory results pushed from the customer's LIMS to HESEM via signed webhook; mapped to INSP result records (SM-4).
- **ICH E2B(R3) pharmacovigilance:** Inbound ICSRs processed and linked to batch/lot records via CONSUMED_LOT genealogy.

### J2 Auto

- **OEM EDI (X12 850/856/810/830):** Full EDI transaction set lifecycle per OEM.
- **IMDS (International Material Data System):** Outbound material declaration submissions; HESEM generates IMDS module data from LOT material composition records.
- **PPAP eSub portals:** Outbound PPAP level 1–5 submission packages via OEM-specific portal APIs (Toyota GPSC, Ford WERS, GM Covisint equivalents).

### J3 Aero

- **GIDEP alerts:** Daily inbound file-based integration; matched against part numbers.
- **AS9100 Corrective Action submissions:** Outbound SCAR transmissions to prime contractors via AS2.
- **ITAR Export Authorisation records:** Inbound from DDTC via DECCS API (when applicable); linked to ITAR-flagged lot records.

### J4 Medical Device

- **FDA GUDID API:** Outbound UDI submissions; inbound status updates.
- **EUDAMED API:** Outbound UDI and device registration; inbound EUDAMED notification subscriptions.
- **Vigilance reporting (MDR Article 87):** Outbound serious incident reports via EUDAMED API or national competent authority submission endpoint; HESEM generates the E2B(R3)-equivalent XML.
- **Post-Market Surveillance data feeds:** Inbound complaint data from patient registries or post-market surveillance studies; linked to SERIALISED_UNIT records.

### J5 Food

- **FSMA §204 trading partner data exchange:** Inbound KDE/CTE records from suppliers; outbound KDE/CTE records to customers. Format: FDA Electronic Sortable Spreadsheet (ESS) or partner REST API.
- **HACCP CCP monitoring data:** Inbound from Edge Gateway appliance; streamed as `otg_event` rows directly from the Edge Gateway CDC relay.
- **FDA FSMA trace-back response:** Outbound response package generated on-demand by E15 integration API from MV-07 `mv_recall_scope` + CTE_COMPLETED events.

---

## §11 Cross-References

- **E15:** E15 is the canonical integration API specification; B8 is the architecture reference. E15 §3 (schema registry), E15.1 (webhook subscription), E15.19 (inbound channel), E15.20 (replay), E15.21 (secret rotation) are cited throughout.
- **I7 §7:** Sub-processor security controls, mTLS certificate management, and HMAC secret handling implement I7 §7 integration security requirements.
- **L2 §8:** Sub-processor authority boundary and service principal scoping are defined in L2 §8 and implemented in §3 and §6.1 of this chapter.
- **W13:** Cross-region integration constraints (§7) and per-region relay deployment are governed by W13 multi-region architecture.
- **B6 C5:** Per-tenant credential isolation (§6.4) and cross-border egress rejection (§7) implement the B6 C5 tenant boundary for integration channels.
- **B7:** Integration relay pods and Edge Gateway appliances are deployed per B7 topology; per-pack Edge Gateway overlays (B7 §9) complement the integration patterns in §1 and §10.

---

```
S1-06_B7_B8_DEPLOYMENT_INTEGRATION_DEEP_UPGRADE_COMPLETE
```

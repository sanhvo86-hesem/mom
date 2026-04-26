# E15 — Integration API

```
api_family:     Integration (webhook, CDC, partner connector, EDI,
                regulator submission, GraphQL gateway, AsyncAPI
                streams, sub-processor routing)
owner_role:     Integration Lead with Compliance Lead (regulated
                partners)
scope:          External-system integration; per-pack regulator
                submission; per-tenant partner contract; sub-
                processor lifecycle; outbound + inbound event
                streams
sources:        AsyncAPI 3.0; OpenAPI 3.1.1; CloudEvents 1.0;
                ANSI X12 + EDIFACT; GS1 EPCIS 2.0; HL7 FHIR R5
                (where IVD); ICH E2B(R3); FDA / EMA / EUDAMED /
                GUDID submission protocols; OASIS AS2 + AS4
```

The Integration API is the seam between HESEM and the rest of the
world. It carries customer EDI exchanges (Auto), DSCSA TI/TH/TS
exchanges (Pharma), GUDID/EUDAMED submissions (MD), GIDEP
submissions (Aero), §204 traceability exchange (Food), webhook
subscriptions, sub-processor routing, partner connectors. Many
exchanges have hard regulator-driven SLAs (per H1 §3).

---

## 1. Purpose and scope

```
IN SCOPE                              OUT OF SCOPE / HANDED OFF
Webhook subscription mgmt              authoritative record (E4)
Webhook delivery audit                  workflow command (E3)
Event schema registry                   workspace projection (E5)
CDC consumer probe                       audit chain (E6)
Partner connector status + config        evidence (E8)
EDI engine (ANSI X12 + EDIFACT)
DSCSA / EU FMD / EPCIS exchange
 (Pharma)
GUDID / EUDAMED submission (MD)
GIDEP submission (Aero)
FSMA §204 KDE/CTE exchange (Food)
ICH E2B(R3) submission (Pharma PV)
USDA-FSIS HACCP integration (Food)
GraphQL gateway (convenience)
Sub-processor routing visibility
Outbound / inbound CloudEvents
AsyncAPI channels
Per-region routing (data residency)
Per-tenant DPA control
```

---

## 2. Endpoint inventory

### 2.1 Webhook subscription management

```
PATH                              POST /v1/integration/webhook
                                  GET  /v1/integration/webhook
                                  PATCH /v1/integration/webhook/{id}
                                  DELETE /v1/integration/webhook/
                                  {id}
PURPOSE                            external systems subscribe to
                                  HESEM events
INPUT                              callback URL (validated against
                                  allow-list per security);
                                  event filter (per scope: tenant
                                  + resource family + state-machine
                                  + event types);
                                  HMAC signing secret (rotated);
                                  retry policy (exponential
                                  backoff + dead-letter);
                                  delivery format (CloudEvents 1.0)
EVIDENCE EMIT                       subscription_record (EC-4) +
                                  per delivery delivery_event
                                  (EC-22)
ERRORS                              401; 403; 422 invalid_filter;
                                  422 url_disallowed
RATE LIMIT                          per tenant + per identity
SLO                                 per delivery: at-least-once
                                  with retry; dead-letter after
                                  N failed attempts
```

### 2.2 Webhook delivery audit

```
PATH                              GET /v1/integration/webhook/
                                  {id}/deliveries
PURPOSE                            delivery history per subscription
RESPONSE                            per delivery: status (delivered
                                  / failed / retrying / dead-letter),
                                  HTTP code, retry count, latency
EVIDENCE EMIT                       access_audit
```

### 2.3 Schema registry (read)

```
PATH                              GET /v1/integration/schema/
                                  {schema_id}
PURPOSE                            retrieve event schema (Avro +
                                  JSON Schema mirror)
AUDIENCE                            external integrations
RATE LIMIT                          high (cached)
```

### 2.4 Schema registry (governance)

```
PATH                              POST /v1/integration/schema
PURPOSE                            author / publish event schema
                                  (governance via H7 + ECO);
                                  schema versioning + deprecation
AUDIENCE                            Integration Lead;
                                  Engineering Lead
PRECONDITIONS                       H7 Class B+ change;
                                  schema-evolution rules per
                                  H7 §5
EVIDENCE EMIT                       schema_change (EC-16)
DEPRECATION                          per E0 deprecation policy
```

### 2.5 CDC consumer probe

```
PATH                              GET /v1/integration/cdc/probe
PURPOSE                            CDC consumer state, lag, slot
                                  status
AUDIENCE                            internal CDC pipeline + admin
                                  (per I3 RB-INC-001)
RESPONSE                            per consumer: lag, status,
                                  slot, last-event timestamp,
                                  retry queue depth
EVIDENCE EMIT                       sampled access
SLO                                 SLO-13 CDC lag < 60s
```

### 2.6 Partner connector status

```
PATH                              GET /v1/integration/partner/
                                  {partner_id}/status
PURPOSE                            connector health per partner
                                  (e.g., Salesforce, SAP, Oracle,
                                  Windchill, Teamcenter, OEM
                                  portals, regulator portals)
RESPONSE                            health status; last successful
                                  exchange; outstanding queue;
                                  per-tenant per-partner config
EVIDENCE EMIT                       sampled access
SLO                                 per partner SLA
```

### 2.7 Partner connector configuration

```
PATH                              POST /v1/integration/partner/
                                  {partner_id}/config
                                  GET  /v1/integration/partner/
                                  {partner_id}/config
PURPOSE                            per-tenant connector config
                                  (credentials, sync schedule,
                                  field mapping)
AUDIENCE                            tenant admin + Integration Lead
PRECONDITIONS                       sub-processor onboarding per
                                  L2 §8 + I8 + DPA addendum;
                                  H7 Class A change
EVIDENCE EMIT                       config_change (EC-16)
SPECIAL                              credentials stored per
                                  Vault / KMS per I7 §4
```

### 2.8 EDI engine

```
PATH                              POST /v1/integration/edi/
                                  {partner}/{set}
                                  GET  /v1/integration/edi/
                                  {partner}/{set}
PURPOSE                            EDI submit + retrieve per
                                  customer agreement
EXAMPLES                            850 PO; 855 PO Ack; 856 ASN;
                                  810 Invoice; 820 Payment;
                                  860 PO Change; 865 PO Change
                                  Ack; 862 Schedule;
                                  997 Functional Ack;
                                  EDIFACT equivalents (ORDERS,
                                  ORDRSP, DESADV, INVOIC, etc.)
EVIDENCE EMIT                       edi_transaction (EC-22 +
                                  cross-link to D2 / D11
                                  workflows)
SLO                                 per partner agreement
RATE LIMIT                          per partner
```

### 2.9 DSCSA / EU FMD / EPCIS (Pharma)

```
PATH                              POST /v1/integration/dscsa/
                                  transaction
                                  GET  /v1/integration/dscsa/
                                  partner/{id}
                                  POST /v1/integration/fmd/
                                  decommission
PURPOSE                            DSCSA TI/TH/TS exchange per
                                  trading partner via VRS / EPCIS
                                  / direct;
                                  EU FMD pack-level decommissioning
                                  via EMVS
RESPONSE                            transaction record id;
                                  partner ack
EVIDENCE EMIT                       dscsa_event (EC-37 / FMD
                                  variant);
                                  per H1 §3 suspect-product 3-day
                                  window enforcement
SLO                                 per H1 §3 windows
SPECIAL                              cross-tenant impossible;
                                  per-tenant trading partner
                                  onboarding required
```

### 2.10 GUDID / EUDAMED (MD)

```
PATH                              POST /v1/integration/udi/
                                  {register}
                                  GET  /v1/integration/udi/
                                  {register}/{submission_id}
PURPOSE                            UDI submission to FDA GUDID
                                  + EU EUDAMED at first market
                                  placement;
                                  resubmission on revision
RESPONSE                            submission id; regulator
                                  acceptance status
EVIDENCE EMIT                       udi_submission (per H4)
SLO                                 per H1 §3 windows
SPECIAL                              MD pack only; per-tenant
                                  account onboarded
```

### 2.11 GIDEP submission (Aero)

```
PATH                              POST /v1/integration/gidep
PURPOSE                            counterfeit-suspect submission
                                  to GIDEP (US gov)
RESPONSE                            submission id; ack
EVIDENCE EMIT                       gidep_event (EC-22 + restricted
                                  per ITAR per J3 §5)
SLO                                 60-day window per H1 §3 +
                                  J3 §10 FM
SPECIAL                              ITAR-cleared; cross-tenant
                                  impossible; person-of-record
                                  verification at submission
```

### 2.12 FSMA §204 KDE/CTE exchange (Food)

```
PATH                              POST /v1/integration/fsma204/
                                  cte
                                  GET  /v1/integration/fsma204/
                                  trace
PURPOSE                            KDE per CTE exchanged with
                                  trading partner per FSMA Part
                                  1.1300; 24h regulator-readable
                                  upon request
RESPONSE                            CTE record id; partner ack
EVIDENCE EMIT                       fsma204_event (EC-38)
SLO                                 24h regulator-readable;
                                  partner SLA per agreement
SPECIAL                              Food high-risk pack only;
                                  full effect Jan 2026
```

### 2.13 ICH E2B(R3) submission (Pharma PV)

```
PATH                              POST /v1/integration/icsr
PURPOSE                            adverse-event ICSR submission
                                  per ICH E2B(R3) format to
                                  regulator (FDA / EMA / PMDA /
                                  per jurisdiction)
RESPONSE                            submission ack; case id
EVIDENCE EMIT                       icsr_submission (per H4 EC-21
                                  reportable_event)
SLO                                 per H1 §3:
                                  serious-expedited 7d / 15d;
                                  death immediate
SPECIAL                              Pharma pack only;
                                  per-tenant regulator account
                                  onboarded
```

### 2.14 USDA-FSIS HACCP (Food where applicable)

```
PATH                              POST /v1/integration/usda-fsis/
                                  haccp
PURPOSE                            HACCP integration for meat /
                                  poultry / egg products
                                  (USDA jurisdiction)
SPECIAL                              per pack overlay; coordination
                                  with FDA jurisdiction (Food)
```

### 2.15 GraphQL gateway

```
PATH                              POST /v1/integration/graphql
PURPOSE                            convenience GraphQL surface
                                  mirroring REST;
                                  same auth + audit + contracts;
                                  PERSISTED queries only in
                                  production (anti-DoS;
                                  per OWASP API4 + LLM04 patterns)
AUDIENCE                            external integrations
                                  preferring GraphQL
RATE LIMIT                          per persisted query + per
                                  tenant
EVIDENCE EMIT                       sampled access_audit
DEPRECATION                          per E0; persisted-query
                                  retirement is H7 Class B+
```

### 2.16 Outbound CloudEvents stream

```
PATH                              AsyncAPI channel definitions
                                  per scope
PURPOSE                            outbound event stream for
                                  external consumers
                                  (CloudEvents 1.0 envelope;
                                  CDC-driven)
DELIVERY                            HTTP webhook (per 2.1) or
                                  partner-pull
EVIDENCE EMIT                       outbound_delivery (EC-22)
```

### 2.17 Sub-processor routing visibility

```
PATH                              GET /v1/integration/sub-processor
PURPOSE                            per-tenant sub-processor list
                                  with status + region pinning
                                  + DPA-listed
AUDIENCE                            tenant DPO + Compliance
                                  + auditor
RESPONSE                            sub-processor list per H1 §4
                                  + per L2 §8 + I8 §3
EVIDENCE EMIT                       access_audit
```

### 2.18 Per-region routing

```
PATH                              GET /v1/integration/region
PURPOSE                            return current routing per
                                  region (data residency)
AUDIENCE                            tenant + auditor
RESPONSE                            per-tenant region pinning
                                  status (per B6 C5 + I4 §5)
```

### 2.19 Inbound webhook (callback)

```
PATH                              POST /v1/integration/inbound/
                                  {provider}
PURPOSE                            providers / partners post events
                                  to HESEM (e.g., regulator
                                  acceptance, partner CDC)
SECURITY                           HMAC signing; signature verified;
                                  IP allow-list; replay prevention
EVIDENCE EMIT                       inbound_delivery (EC-22)
ERRORS                              401 signature_invalid;
                                  422 schema-violation
```

---

## 3. Authentication + authorization

```
EVERY ENDPOINT                  authenticated session per E1 OR
                                signed callback (HMAC) for
                                inbound
TENANT SCOPE                    per-tenant for outbound + inbound
                                callbacks; cross-tenant impossible
PARTNER CREDENTIAL              per-connector secrets stored in
                                Vault (per I7 §4); rotation cycle
WEBHOOK SIGNING                 HMAC-SHA256 secret per subscription;
                                rotated per cycle;
                                signature verified at receipt
SUB-PROCESSOR DPA                per L2 §8 + I8;
                                per-tenant onboarding required;
                                tenant notification per DPA window
PII REDACTION                    per role; outbound events
                                redacted per agreement
ITAR / EAR                        per-region pinning enforced;
                                cross-border export rejected
                                (per J3 §5)
```

---

## 4. Cross-cutting concerns

```
PROBLEM DETAILS (RFC 9457)        per error class with partner +
                                 schema detail
ASYNCAPI 3.0                       outbound channels per scope
OPENAPI 3.1.1                       sync REST endpoints
CLOUDEVENTS 1.0                     envelope for events
SCHEMA EVOLUTION                     additive only; breaking change
                                 is H7 Class A + 6-mo deprecation
                                 (per E0 §5)
DEAD-LETTER                          delivery dead-lettered after
                                 N retries; subscriber alert
RETRY POLICY                          exponential backoff per
                                 partner agreement
OBSERVABILITY                          per delivery: trace + tenant
                                 + partner + outcome
AUDIT CHAIN                            outbound delivery + inbound
                                 callback anchored daily
TENANT BOUNDARY                         per B6 C5
DATA RESIDENCY                          per region pinning;
                                 per-region partner endpoint
                                 selected automatically
RATE LIMITING                            per OWASP API4; per partner
                                 + per tenant
DEPRECATION                                per E0
SUSTAINABILITY                              minimize data egress
                                 (per I6 cost + per ESG)
```

---

## 5. Failure modes (RFC 9457)

```
TYPE                                  STATUS  MEANING
integration/partner-unreachable        503     partner system down
integration/schema-violation             422     event schema mismatch
integration/version-deprecated           410     schema version sunset
integration/signature-invalid             401     HMAC signature fail
integration/replay-detected               401     nonce reused
integration/quota-exceeded                429     per partner quota
integration/region-pinning-violated        403     cross-border egress
                                              attempt blocked
integration/sub-processor-not-                403     not in tenant DPA
   onboarded
integration/dscsa-suspect-window           451     3-business-day window
   missed
integration/icsr-window-missed              451     per H1 §3 ICSR SLA
integration/udi-submission-late              451     UDI window missed
integration/gidep-window-missed               451     60d GIDEP window
integration/fsma204-incomplete                422     KDE incomplete
                                              for high-risk food
integration/itar-export-attempt                403     ITAR boundary
                                              breach attempt
integration/credentials-expired                401     partner creds need
                                              rotation
deprecation/sunset                              410     endpoint sunset
auth/cross-tenant-attempt                       403     SEV-1
                                              BD-equivalent
```

---

## 6. SLO + budget

```
2.1 webhook delivery               at-least-once with retry
2.5 CDC probe p95                    < 100ms
2.6 partner status p95                < 250ms
2.8 EDI submit                          per partner SLA
2.9 DSCSA exchange                       per H1 §3 (3 business days)
2.10 UDI submission                       per H1 §3
2.11 GIDEP                                  per H1 §3 (60d)
2.12 FSMA §204                              24h regulator-readable
2.13 ICSR                                    per H1 §3 (24h / 7d / 15d)
2.15 GraphQL p95                              < 500ms (persisted)
2.19 inbound                                  per partner SLA
ERROR RATE                                     per SLO-9 (< 0.1%)
```

---

## 7. Wave target

```
W4        L4 webhook + schema registry + CDC probe
W7        L5 webhook + partner connectors first wave
          (Salesforce + SAP)
W8        EDI engine GA per first OEM partner
W9        L4 GraphQL gateway; sub-processor routing
W10       per-pack regulator submissions:
          DSCSA (Pharma), UDI GUDID + EUDAMED (MD),
          GIDEP (Aero defense), FSMA §204 (Food
          high-risk), ICSR (Pharma PV)
W11       per-pack GA: customer-specific connectors
          (per CSR; OEM portals; clinical-trial CRO
          for MD)
W12       USDA-FSIS HACCP integration (Food where
          applic);
          sovereign region variants
```

---

## 8. Per-pack overlays

```
PHARMA (J1)                      DSCSA TI/TH/TS exchange
                                 (3-business-day suspect window);
                                 EU FMD EMVS pack-level
                                 decommissioning;
                                 EPCIS 2.0 trading partner
                                 onboarding;
                                 ICH E2B(R3) ICSR submission
                                 (FDA / EMA / PMDA / per
                                 jurisdiction)
AUTO (J2)                        per-OEM EDI sets (Ford / GM /
                                 Stellantis / Toyota / VW / BMW /
                                 Hyundai / Tesla / Rivian);
                                 OEM portals (Covisint / supplier
                                 portal); per-CSR API + EDI
AERO (J3)                        GIDEP submission (US gov);
                                 ITAR-controlled exchanges
                                 (segregated infrastructure;
                                 person-of-record checks);
                                 OEM portal (Boeing / Lockheed /
                                 Raytheon / Airbus); FAA Form
                                 8130-3 RTS exchange where
                                 applic
MD (J4)                          GUDID submission (US FDA);
                                 EUDAMED submission (EU);
                                 vigilance reporting (US MDR /
                                 EU MIR) per H1 §3 24h death;
                                 PMS / PMCF data feeds;
                                 clinical-trial CRO data
                                 exchange
FOOD (J5)                        FSMA §204 KDE/CTE exchange;
                                 USDA-FSIS HACCP (where applic);
                                 supplier portals (FSVP);
                                 RFR submission per FDA
```

---

## 9. Failure modes (operational)

```
FM1   Partner system outage
      Behavior: 503 integration/partner-unreachable
      Recovery: per L2 §2 on_failure_behavior;
              retry per policy; if regulator-relevant
              window: H1 §3 escalation

FM2   DSCSA suspect-product window missed
      Behavior: 451 integration/dscsa-suspect-window-missed
      Recovery: regulator awareness;
              H8 systemic CAPA on intake → submission
              flow

FM3   ICSR submission late
      Behavior: 451 integration/icsr-window-missed
      Recovery: per H1 §3; regulator notification;
              H8 systemic

FM4   UDI submission rejected by regulator
      Behavior: 422 integration/schema-violation
      Recovery: per partner protocol; regulator
              feedback resolved; resubmit

FM5   GIDEP 60-day window missed
      Behavior: 451 integration/gidep-window-missed
      Recovery: per H1 §3; US gov contractual exposure;
              H8 systemic

FM6   FSMA §204 KDE incomplete
      Behavior: 422 integration/fsma204-incomplete
      Recovery: lot held until complete; H8 systemic

FM7   Cross-border egress attempt (ITAR / data residency)
      Behavior: 403 integration/region-pinning-violated
      Recovery: per B6 C5; SEV-1; H8 systemic

FM8   HMAC signature invalid (replay attempt or compromise)
      Behavior: 401 integration/signature-invalid
      Recovery: per I7; key rotation; investigate;
              SEV per impact

FM9   Partner credentials expired
      Behavior: 401 integration/credentials-expired
      Recovery: per I7 §4; rotation cycle; tenant
              notification

FM10  Sub-processor onboarding gap
      Behavior: 403 integration/sub-processor-not-onboarded
      Recovery: per L2 §8 + I8; DPA amendment;
              tenant ack

FM11  Schema-evolution breaking change accidentally
      Behavior: 410 integration/version-deprecated +
              partner sees breaks
      Recovery: per H7 §5; rollback;
              forced 6-mo deprecation
              window;
              H8 systemic on schema governance

FM12  Webhook delivery dead-letter
      Behavior: subscriber alert (per 2.2);
              subscription paused
      Recovery: subscriber owner contacted;
              per partner relationship
```

---

## 10. Roles and authority (RACI)

```
ENDPOINT             INT  PART  SEC  COMP  TENANT  AUDITOR
2.1 webhook          A    -     C    -     R       -
2.5 CDC probe        A    -     -    -     -       -
2.6 partner status   A    R     -    -     R       -
2.7 partner config   A    A     C    C     A       -
2.8 EDI              A    R     -    -     R       -
2.9 DSCSA            A    R     -    A     R       R
2.10 UDI             A    R     -    A     R       R
2.11 GIDEP           A    R     A    A     R       R
                                              (J3)
2.12 FSMA §204       A    R     -    A     R       R
2.13 ICSR            A    R     -    A     R       R
2.15 GraphQL         A    -     C    -     R       -
2.17 sub-processor   A    -     C    A     R       R
                                              (DPA)
2.18 region          A    -     A    A     R       R
2.19 inbound         A    R     A    -     R       -
```

---

## 11. Cross-references

- B8 — integration substrate
- E0 — API conventions
- E1 — identity
- E3 — workflow event source
- E5 — workspace projection
- E10 — notification (where applic)
- F8 + F9 — UI integration with frontend
- H1 §3 — regulator notification windows
- H4 — EC-37 dscsa_event; EC-38 fsma204; udi/icsr/gidep
  reportable_event sub
- H5 — perpetual retention regulated
- H7 — schema evolution + sub-processor onboarding
- H8 — CAPA on submission / window failures
- I3 — incidents from integration outage
- I7 — secrets + signature
- I8 — sub-processor lifecycle
- L2 §8 — sub-processor governance
- M3 — root catalog (Connector, Subscription, EDI Transaction,
  DSCSA Trading Partner, etc.)
- M5 — SLO-13 + SLO-9
- M9 — cross-reference

---

## 12. Decision phrase

```
E15_INTEGRATION_API_BASELINE_LOCKED
PART_E_DEEP_UPGRADE_ONGOING (E0/E1/E4/E6/E10-E14 next)
NEXT: PART_F_FRONTEND_CATALOG/F0_PART_F_OVERVIEW.md
```

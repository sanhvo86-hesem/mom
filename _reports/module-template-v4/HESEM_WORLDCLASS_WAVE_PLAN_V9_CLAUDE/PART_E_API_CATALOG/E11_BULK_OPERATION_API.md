# E11 — Bulk Operation API

```
api_family:     Bulk Operations
owner_role:     API Lead with Implementation Lead (onboarding)
scope:          Bulk import / export / command; per-record idempotency;
                multi-status responses; per-tenant quota; sub-processor
                routing; per-pack overlay
sources:        OpenAPI 3.1.1; RFC 7233 partial content; HTTP 207
                Multi-Status (RFC 4918); JSON-Streaming / NDJSON
                conventions; CSV-on-the-wire; idempotency-key draft
```

The Bulk Operation API handles the highest-risk shape of API call:
many records at once. The most common use case is master-data
migration during P4 of tenant onboarding (per I8 §1) where 100K+
records are imported. The second is audit-pack export (per H3 §4)
where 10M+ rows are emitted. Both must be idempotent per record,
restartable, and observable.

---

## 1. Purpose and scope

```
IN SCOPE                              OUT OF SCOPE / HANDED OFF
Bulk import (NDJSON / CSV /             single-record CRUD (E4)
 partitioned)                            workflow command (E3)
Bulk export                              file upload (E12)
Bulk command (multi-status)              long-running orchestration
Per-record idempotency                    (E13)
Multi-status responses (HTTP 207)        cost classification (I6)
Per-tenant quota
Restart / resume (chunked)
Per-pack overlay (Pharma master
 data; Auto PPAP; Aero S/N; etc.)
Sub-processor routing (where
 applic)
PII redaction on export per role
Cross-tenant impossible
```

---

## 2. Endpoint inventory

### 2.1 Bulk import

```
PATH                              POST /v1/bulk/import
PURPOSE                            submit batch for import
                                  (master data migration P4
                                  default use case)
INPUT                              NDJSON stream or CSV per
                                  schema; per-record idempotency-
                                  key in payload (mandatory);
                                  batch idempotency-key in header;
                                  per-record schema declared
                                  (resource family + version)
RESPONSE                            batch_id; LRO handle (per E13)
SUCCESS PAYLOAD                     per-record status: succeeded |
                                  failed (with per-record reason);
                                  HTTP 207 Multi-Status when
                                  partial success
ERRORS                              400 idempotency_required;
                                  401 unauth; 403 forbidden;
                                  413 payload-too-large;
                                  422 schema-violation;
                                  429 quota-exceeded
EVIDENCE EMIT                       import_record (EC-22 + EC-4 per
                                  record); per migration: signed
                                  manifest of imported set (per
                                  H4 + per H7 governance)
SLO                                 per-record processing per
                                  per-tenant rate limit
RATE LIMIT                          per tenant + per scope
```

### 2.2 Bulk export

```
PATH                              POST /v1/bulk/export
PURPOSE                            export records for analytic /
                                  migration / audit
INPUT                              filter (per resource family +
                                  per H4 evidence class +
                                  per time window);
                                  output format (CSV / NDJSON /
                                  Parquet);
                                  per-tenant + per-region routing
RESPONSE                            LRO handle (per E13)
                                  → signed archive on completion;
                                  per H3 §4 audit pack contributor
EVIDENCE EMIT                       export_record (EC-22)
SLO                                 per SLO-15 audit pack p95 < 24h
                                  (where applicable)
RATE LIMIT                          per tenant quota
```

### 2.3 Bulk command submission

```
PATH                              POST /v1/bulk/command
PURPOSE                            submit batch of similar commands
                                  (e.g., reassign 1000 NCs;
                                  bulk-set-status for a range)
INPUT                              command_template + per-record
                                  payload list; per-record
                                  idempotency-key
RESPONSE                            HTTP 207 Multi-Status:
                                  per command result (per E3
                                  envelope shape;
                                  problem-detail on fail)
EVIDENCE EMIT                       per-command transaction (EC-4)
SPECIAL                              for regulated-batch commands:
                                  per L1 banned-decision still
                                  enforced per-record;
                                  cannot bulk-bypass L1
RATE LIMIT                          per tenant + per command-type
```

### 2.4 Bulk import status

```
PATH                              GET /v1/bulk/import/{batch_id}
PURPOSE                            check status of long-running
                                  import
RESPONSE                            progress (rows processed;
                                  rows failed; latest error
                                  sample;
                                  ETA; resume_token if paused)
SLO                                 < 250ms
```

### 2.5 Bulk export status

```
PATH                              GET /v1/bulk/export/{batch_id}
PURPOSE                            check status of export
RESPONSE                            progress + signed download URL
                                  when ready
SLO                                 < 250ms
```

### 2.6 Restart / resume

```
PATH                              POST /v1/bulk/import/{batch_id}/
                                  resume
                                  POST /v1/bulk/export/{batch_id}/
                                  resume
PURPOSE                            resume after interruption
                                  (network outage; client crash);
                                  per-record idempotency-key
                                  preserves no-duplicate
RESPONSE                            new LRO handle resuming from
                                  checkpoint
EVIDENCE EMIT                       resume_event (EC-22)
```

### 2.7 Per-pack bulk operation

```
PATH                              POST /v1/bulk/{pack}/...
                                  (e.g., /pharma/dscsa-bulk;
                                  /aero/aS9120b-traceability-bulk)
PURPOSE                            pack-specific bulk operations
                                  (DSCSA bulk exchange;
                                  PPAP per-part submission batch;
                                  FAI batch; etc.)
SCOPE                              pack-toggled per tenant
EVIDENCE EMIT                       per H3 §4 + per pack
```

---

## 3. Authentication + authorization

```
EVERY ENDPOINT                  authenticated session
ELEVATED ROLE                    bulk operations typically require
                                Migration role / Admin role /
                                pack-specific lead
TENANT BOUNDARY                  per B6 C5; cross-tenant impossible
PII REDACTION                    export honors role + per-pack
                                redaction policy
SUB-PROCESSOR                    per L2 §8 + I8
PRIVILEGED OUTPUT                ITAR / CMMC: hardware-token
                                + person-of-record (per J3)
```

---

## 4. Cross-cutting concerns

```
PROBLEM DETAILS (RFC 9457)        per error class
HTTP 207 MULTI-STATUS              per-record outcome
NDJSON / CSV / PARQUET              streaming-friendly formats
PER-RECORD IDEMPOTENCY              mandatory; replay returns
                                 same result
CHUNKED PROCESSING                   batch processed in chunks;
                                 progress + checkpoint per chunk
RESTART CAPABILITY                    resume from last checkpoint;
                                 no duplicate side-effects
RATE LIMITING                          per OWASP API4 + per tenant
                                 quota
EVIDENCE COMPOSITION                   per-record evidence per H4 §3;
                                 cannot bypass via bulk
DEPRECATION                            per E0
DATA RESIDENCY                          export region-pinned;
                                 cross-region export rejected
                                 (per ITAR / GDPR)
TENANT BOUNDARY                          cross-tenant rejected
SIGNED MANIFEST                            output archive signed
                                 per E7 / signed-archive
                                 conventions
COST                                       per I6 cost classification;
                                 bulk export typically tenant
                                 uplift territory
```

---

## 5. Failure modes (RFC 9457)

```
TYPE                                  STATUS  MEANING
bulk/idempotency-required              400     per-record key missing
bulk/payload-too-large                  413     batch exceeds limit
bulk/schema-violation                    422     per-record schema fail
bulk/quota-exceeded                       429     per-tenant quota
bulk/restart-token-invalid                422     resume_token bad
bulk/cross-tenant-attempt                 403     SEV-1 BD-equivalent
bulk/sub-processor-fail                    503     downstream provider
                                              outage
bulk/region-pinning-violated                403     cross-border export
bulk/banned-decision-attempted               403     L1 BD-N per-record
                                              (rare; bulk command
                                              path)
deprecation/sunset                            410     batch shape sunset
auth/unauthorized                              401
auth/forbidden                                 403
```

---

## 6. SLO + budget

```
2.1 import per record                ~50ms typical; chunked
2.2 export per record                ~10-50ms typical; depends on
                                  format
2.3 bulk command per record           per-command SLO (per E3)
2.4/2.5 status                          < 250ms
RESTART OVERHEAD                          minimal (checkpoint-based)
ERROR RATE                                 per SLO-9 (< 0.1% on
                                          per-record basis)
```

---

## 7. Wave target

```
W4        L4 read bulk export (audit pack contribution
          starting)
W5        L5 write bulk command; bulk import P4 master
          data migration
W7        per-pack overlay (J1..J5);
          DSCSA bulk exchange (Pharma);
          PPAP per-part batch (Auto)
W8        signed manifests + SOC 2 path
W10       per-pack GA + sovereign region variants
W12       PCCP-aware bulk update (MD AI)
```

---

## 8. Per-pack overlays

```
PHARMA (J1)                      DSCSA bulk exchange;
                                 Stability protocol bulk;
                                 APR data bulk export
AUTO (J2)                        PPAP per-part submission batch;
                                 LPA cycle bulk records;
                                 PFMEA evidence bulk
AERO (J3)                        AS9120B traceability bulk;
                                 AS9102 FAI bulk submission;
                                 service-life-limited bulk
                                 update
MD (J4)                          DHR bulk import / export;
                                 UDI bulk submission;
                                 SOUP register bulk update
FOOD (J5)                        FSMA §204 KDE/CTE bulk;
                                 supplier-registry bulk
```

---

## 9. Failure modes (operational)

```
FM1   Idempotency violated (per-record key missing)
      Behavior: 400 bulk/idempotency-required
      Recovery: client retry with proper keys

FM2   Restart token invalid (corruption)
      Behavior: 422 bulk/restart-token-invalid
      Recovery: restart from beginning;
              client warned; H8 if pattern

FM3   Quota exceeded
      Behavior: 429 bulk/quota-exceeded
      Recovery: per I6 § contract;
              CSM intervention if regulated

FM4   Schema violation per-record
      Behavior: HTTP 207 with per-record problem
      Recovery: client fixes failed records;
              re-submit only those

FM5   Cross-tenant attempt
      Behavior: 403 SEV-1
      Recovery: per B6 C5; H8 systemic

FM6   Sub-processor outage during export
      Behavior: 503 bulk/sub-processor-fail
      Recovery: retry per L2 §2; degraded path

FM7   Banned-decision per-record (rare)
      Behavior: HTTP 207 with per-record 403
      Recovery: per L1 §4; review pattern

FM8   Region pinning violated
      Behavior: 403 bulk/region-pinning-violated
      Recovery: per B6 C5; H8 systemic
```

---

## 10. Roles and authority (RACI)

```
ENDPOINT             API   IMPL  COMP  TENANT  AUDITOR
2.1 import           A     A     C     A       -
2.2 export           A     C     R     A       R
2.3 command          A     C     C     A       -
2.4 status           A     R     -     R       -
2.5 status           A     R     -     R       R
2.6 restart          A     R     -     R       -
2.7 per-pack         A     C     A     R       R
```

---

## 11. Cross-references

- E0 — API conventions (idempotency; pagination is N/A here)
- E3 — bulk command shape consumes E3 envelope
- E4 — single-record alternatives
- E5 — workspace bulk projection (per E5 §2.6)
- E8 — evidence bulk export (audit pack)
- E12 — file upload of input batches
- E13 — long-running operation orchestration
- E14 — admin (quota config)
- F4 — UI bulk export wizard
- H3 §4 — audit pack assembly
- H4 — per-record evidence + signed manifest
- H5 — retention of import / export evidence
- H7 — change control on bulk shape
- I6 — cost classification
- I8 — onboarding migration (P4)
- L2 §8 — sub-processor routing
- M5 — SLO-9 + SLO-15
- M9 — cross-reference

---

## 12. Decision phrase

```
E11_BULK_OPERATION_API_BASELINE_LOCKED
NEXT: E12_FILE_UPLOAD_API.md
```

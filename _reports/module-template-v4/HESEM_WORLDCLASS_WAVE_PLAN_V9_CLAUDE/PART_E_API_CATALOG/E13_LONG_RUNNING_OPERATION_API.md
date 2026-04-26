# E13 — Long-Running Operation API

```
api_family:     Long-Running Operations (LRO)
owner_role:     API Lead with Platform Lead
scope:          Async initiate / poll / cancel / retrieve;
                operation type registry; per-tenant queue;
                worker pool routing; checkpoint + restart;
                signed-result download
sources:        Google AIP-151 LRO pattern; OpenAPI 3.1.1; RFC
                7234 caching; HTTP 202 + Location pattern;
                AsyncAPI 3.0 (status streams)
```

LRO is the discipline for operations that exceed a single HTTP
request: bulk export, audit pack generation, DSAR (Data Subject
Access Request) extraction, OTG event-log replay (DR drill /
validation rebuild), multi-tenant migration, connector bulk sync,
PSUR drafting (AI-21 LRO mode), recall trace (D12).

---

## 1. Purpose and scope

```
IN SCOPE                              OUT OF SCOPE / HANDED OFF
Async operation initiate               sync mutation (E3)
Status polling + status stream          file upload (E12)
Cancel (where supported)                event subscription (E15.1)
Result retrieval (signed URL)            workflow command (E3)
Operation history per user / per
 tenant
Operation type registry
Per-tenant + per-region queue
Worker pool routing
Checkpoint + restart from
 last-checkpoint
Per-pack overlay (audit pack;
 PSUR; mock recall; DSAR)
Cost classification (per I6)
```

---

## 2. Endpoint inventory

### 2.1 Initiate LRO

```
PATH                              POST /v1/lro/initiate
PURPOSE                            start async operation; return
                                  operation id for polling
INPUT                              operation_type (per registry);
                                  per-type payload (e.g., audit
                                  pack scope; DSAR subject id;
                                  bulk export filter);
                                  idempotency-key (mandatory);
                                  per-tenant region pinning
RESPONSE                            HTTP 202 Accepted with
                                  Location header → status URI;
                                  operation_id;
                                  ETA estimate;
                                  cancel_token (where applic)
EVIDENCE EMIT                       lro_initiate (EC-22)
SLO                                 ack p95 < 500ms (per SLO-11)
RATE LIMIT                          per tenant + per type
```

### 2.2 Operation status

```
PATH                              GET /v1/lro/{operation_id}/status
PURPOSE                            poll status
STATUS VALUES                       queued, in-progress, paused,
                                  completed, failed, cancelled
RESPONSE                            status; progress %;
                                  ETA; result_uri (when completed);
                                  error details (when failed);
                                  checkpoint reference (when
                                  paused or restartable)
ALTERNATIVE                          GET with Server-Sent Events
                                  for live progress stream
RATE LIMIT                            high (frequent polling);
                                  client should respect
                                  exponential backoff
SLO                                    < 250ms
```

### 2.3 Cancel operation

```
PATH                              POST /v1/lro/{operation_id}/cancel
PURPOSE                            cancel in-flight operation
                                  where feasible
NON-CANCELLABLE                     audit pack assembly past
                                  partial output stage;
                                  regulator submission past
                                  send;
                                  per-type policy
RESPONSE                            new status (cancelling /
                                  cancelled / not-cancellable
                                  with reason)
EVIDENCE EMIT                       cancel_event (EC-22 + EC-2
                                  for regulated)
```

### 2.4 Result retrieval

```
PATH                              GET /v1/lro/{operation_id}/result
PURPOSE                            retrieve completed result
                                  (typically signed download URL
                                  per E12 pattern)
RESPONSE                            signed download URL +
                                  expiration;
                                  per-pack additional metadata
EVIDENCE EMIT                       retrieval_event (EC-22)
ERRORS                              503 not-yet-completed;
                                  410 result-expired (per
                                  retention)
```

### 2.5 Operation history

```
PATH                              GET /v1/lro/history
PURPOSE                            list LROs initiated by user
                                  (or by tenant for admins)
RESPONSE                            paginated list with status
                                  + scope summary
PAGINATION                          cursor-based
```

### 2.6 Restart from checkpoint

```
PATH                              POST /v1/lro/{operation_id}/
                                  restart
PURPOSE                            resume paused / failed
                                  operation from last checkpoint
                                  (per per-type checkpointing)
RESPONSE                            new operation handle
                                  (or same handle continued)
EVIDENCE EMIT                       restart_event (EC-22)
```

### 2.7 Operation type registry

```
PATH                              GET /v1/lro/types
PURPOSE                            list operation types tenant
                                  may invoke
RESPONSE                            per type: cost-tier (per I6),
                                  estimated duration,
                                  cancellable, restartable,
                                  retention class for result,
                                  per-tenant quota
```

---

## 3. Operation type registry (canonical)

```
TYPE                              SOURCE
bulk-export-records                E11.2
bulk-export-evidence                E8.8 + audit pack
audit-pack-export                    H3 §4 + E8 + per pack
DSAR-extraction                      GDPR Art 15 / per H5 §6
OTG-event-replay                      DR drill per I4 + validation
                                     rebuild per H2
mock-recall-trace                    D12 + per pack §10
multi-tenant-migration                I8 onboarding P4
connector-bulk-sync                    E15 partner connector
PSUR-draft                              AI-21 + Pharma / MD
APR-draft                                AI-21 + Pharma
audit-finding-pack-prep                H3 §4
schema-evolution-rebuild               per H7 §5 (rare)
backup-verify                            per I4 §4
calibration-OOT-impact-trace           D9 §6 (when scope wide)
cross-region-failover-rehearsal        per I4 §3 RB-DR-002
EU-FMD-bulk-decommission                Pharma (per pack)
DSCSA-trading-partner-onboarding-       Pharma (per pack)
   sync
GUDID-EUDAMED-batch-submission         MD (per pack)
GIDEP-batch-submission                  Aero (per pack)
FSMA-204-export                          Food (per pack high-risk)
ICSR-bulk-resubmission                   Pharma PV
SOUP-CVE-cross-reference                MD cyber
PCCP-envelope-rebuild                    MD AI per L3 §6
... per pack
```

---

## 4. Authentication + authorization

```
EVERY ENDPOINT                  authenticated session
PER-TYPE AUTHORIZATION            role per type;
                                some types restricted (DSAR;
                                audit pack; ITAR-bound)
TENANT BOUNDARY                  per B6 C5
PER-PACK TOGGLE                   pack-scoped types require pack
                                enabled
SUB-PROCESSOR ROUTING              per L2 §8 + I8
DATA RESIDENCY                     result region-pinned
PRIVILEGED OUTPUT                   ITAR / CMMC: hardware-token
                                + person-of-record (per J3)
```

---

## 5. Cross-cutting concerns

```
PROBLEM DETAILS (RFC 9457)        per error class
HTTP 202 + LOCATION                Google AIP-151 pattern
RATE LIMITING                       per tenant + per type;
                                 polling backoff guidance
                                 returned in headers
COST                                 per I6 cost classification;
                                 per-type cost band
DATA RESIDENCY                       per region pinning
EVIDENCE EMIT                          all phases anchored daily
TENANT BOUNDARY                          cross-tenant impossible
SIGNED RESULT                              per E7 / E12 signed
                                       download archive
WORM LOCK                                  result archive WORM-locked
                                       per H5 retention class
DEPRECATION                                per E0;
                                 type retirement is H7 Class A
                                 (audit packs depend)
```

---

## 6. Failure modes (RFC 9457)

```
TYPE                                  STATUS  MEANING
lro/operation-not-found                 404
lro/cancel-not-permitted                 409     past cancel point
lro/result-expired                        410     per retention
lro/quota-exceeded                         429     per tenant
lro/sub-processor-fail                     503     downstream provider
lro/cross-tenant-attempt                   403     SEV-1
lro/restart-checkpoint-invalid             422     checkpoint corrupt
lro/region-pinning-violated                403     cross-border
lro/timeout                                  504     operation past
                                              max duration
lro/banned-operation                          403     per L1 BD-N
                                              (rare; bulk-banned)
auth/unauthorized                              401
auth/forbidden                                403
deprecation/sunset                              410
```

---

## 7. SLO + budget

```
2.1 initiate ack p95              SLO-11 < 500ms
2.2 status poll p95                  < 250ms
2.3 cancel                              < 500ms
2.4 result retrieval                  < 250ms (URL gen)
2.5 history                              < 300ms
2.6 restart                                < 500ms
PER TYPE COMPLETION                       per registry;
                                     audit pack p95 < 24h
                                     (SLO-15);
                                     bulk export typically
                                     hours;
                                     DR-drill replay days
                                     allowed
```

---

## 8. Wave target

```
W4        L4 substrate (initiate + status + result)
W5        L5 cancel + restart
W7        audit pack generator GA (per H3 §4)
          + DSAR extraction
W8        SOC 2 + DORA Elite
W10       per-pack types (J1..J5)
W12       sovereign region variants;
          PCCP-envelope-rebuild (MD AI)
```

---

## 9. Per-pack overlays

```
PHARMA (J1)                      APR draft (AI-21 LRO);
                                 PSUR draft;
                                 DSCSA trading-partner sync;
                                 EU FMD bulk decommission;
                                 stability data export;
                                 ICSR bulk resubmission
AUTO (J2)                        PPAP per-program batch;
                                 customer EDI bulk reconciliation;
                                 LPA cycle export
AERO (J3)                        AS9120B traceability bulk;
                                 GIDEP batch submission;
                                 NADCAP cycle audit pack;
                                 ITAR-aware export (segregated
                                 region; person-of-record)
MD (J4)                          DHF / DHR bulk export;
                                 PSUR draft;
                                 GUDID + EUDAMED batch submission;
                                 SOUP CVE cross-reference;
                                 PCCP envelope rebuild
FOOD (J5)                        FSMA §204 export;
                                 mock-recall trace;
                                 RFR submission batch
```

---

## 10. Failure modes (operational)

```
FM1   Initiate timeout (queue saturated)
      Behavior: 504 lro/timeout (rare; usually queued)
      Recovery: per-tenant quota review;
              CSM intervention

FM2   Cancel attempted past cancel point
      Behavior: 409 lro/cancel-not-permitted
      Recovery: wait for completion;
              per-type policy

FM3   Sub-processor outage during run
      Behavior: paused status; checkpoint preserved
      Recovery: auto-restart on provider recovery;
              per L2 §2 on_failure_behavior

FM4   Result expired before download
      Behavior: 410 lro/result-expired
      Recovery: re-initiate;
              per retention class

FM5   Cross-tenant LRO attempt
      Behavior: 403 SEV-1
      Recovery: per B6 C5; H8 systemic

FM6   Quota exceeded
      Behavior: 429 lro/quota-exceeded
      Recovery: per I6 + I8;
              tenant tier upgrade

FM7   Audit pack assembly missed SLA
      Behavior: SLO-15 burn alert
      Recovery: per H3 §4 + I3;
              pre-staged template + delta build
              (mitigation per H3 FM1)

FM8   Restart checkpoint invalid
      Behavior: 422 restart-checkpoint-invalid
      Recovery: re-initiate from beginning;
              H8 systemic if pattern

FM9   ITAR boundary violation in result
      Behavior: 403 region-pinning-violated
      Recovery: per J3 §5; SEV-1; H8 systemic

FM10  Banned-decision LRO type (e.g., bulk-disposition
      attempting to bypass D5)
      Behavior: 403 lro/banned-operation
      Recovery: per L1; SEV-1
```

---

## 11. Roles and authority (RACI)

```
ENDPOINT             API   PLAT  COMP  TENANT  CALLER
2.1 initiate         A     A     C     R       R
2.2 status           A     A     -     R       R
2.3 cancel           A     A     C     R       R
2.4 result           A     A     C     R       R
2.5 history          A     -     -     R       R
2.6 restart          A     A     -     R       R
2.7 type registry    A     -     -     R       -
```

---

## 12. Cross-references

- E0 — API conventions
- E3 — workflow command may emit LRO handle
- E5 §2.6 — bulk projection
- E8 §2.8 — audit pack export entry
- E11 §2.2 — bulk export
- E12 — file download (signed URL pattern)
- E14 — admin (type registry governance)
- F4 + F6 — UI status console
- H3 §4 — audit pack assembly
- H5 — retention floor for result
- H7 — type retirement governance
- I4 — DR-drill replay
- I6 — cost classification
- I8 — onboarding migration
- L2 §8 — sub-processor routing
- M5 — SLO-11 + SLO-15
- M9 — cross-reference

---

## 13. Decision phrase

```
E13_LONG_RUNNING_OPERATION_API_BASELINE_LOCKED
NEXT: E14_ADMIN_API.md
```

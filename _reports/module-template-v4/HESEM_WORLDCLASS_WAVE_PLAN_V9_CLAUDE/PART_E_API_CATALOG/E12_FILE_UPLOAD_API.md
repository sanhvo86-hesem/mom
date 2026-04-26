# E12 — File Upload / Download API

```
api_family:     File Upload / Download
owner_role:     Platform Lead with Security Lead
scope:          Document upload (CDOC), evidence files, operator
                photos, complaint photos, CAD drawing reference,
                drawing bubbled output (Aero), label artifacts,
                thermal-cycle data files; download with virus scan,
                content inspection, signed URL pattern
sources:        OpenAPI 3.1.1, RFC 7234 caching, RFC 9457,
                S3 pre-signed URL pattern, ClamAV / commercial AV,
                content-type sniffing security per OWASP, watermarking
                per pack, FIPS 140-3 envelope encryption
```

The File API is the channel for all binary content. For regulated
tenants every file becomes audit evidence. Counterfeit-suspect
photos (Aero), batch-record scans (Pharma), drawing-bubbled FAI
output (Aero), CCP photos (Food), wound dressings biocompatibility
report (MD) — all flow here.

---

## 1. Purpose and scope

```
IN SCOPE                              OUT OF SCOPE / HANDED OFF
Document upload (CDOC content)          large dataset bulk import (E11)
Evidence file upload                     workflow command (E3)
Operator-capture photo                    record persistence (E4)
Complaint photo                            audit chain (E6)
CAD drawing reference                      e-signature (E7)
Drawing-bubbled output (Aero)
Label artifacts (per regulator)
Thermal-cycle data files (Food)
File download with virus scan
Content inspection (per pack:
 ITAR, biocompatibility report)
Watermarking (per pack: ITAR /
 confidential)
Signed URL pattern (S3 pre-signed
 + equivalent)
WORM-locked output for retention
Per-tenant + per-region storage
Sub-processor routing (where applic)
```

---

## 2. Endpoint inventory

### 2.1 Initiate upload

```
PATH                              POST /v1/file/upload/initiate
PURPOSE                            initiate file upload; return
                                  pre-signed URL for direct
                                  client → storage upload
INPUT                              filename, content_type, byte_size,
                                  target_record_ref (if attachment),
                                  purpose (cdoc / evidence / photo /
                                  drawing / label / thermal-data /
                                  other), per-pack overlay tags
                                  (ITAR-controlled; biocompatibility;
                                  CCP-evidence)
RESPONSE                            attachment_id, pre-signed URL
                                  (storage backend; per-region
                                  pinned), upload method, headers
                                  (incl. mandatory checksum),
                                  expiration (typ 5 min);
                                  mandatory pre-flight rejection
                                  for: too-large, banned-mime,
                                  cross-tenant target,
                                  storage region not allowed
                                  per data residency
ERRORS                              413 too-large; 415 unsupported-
                                  mime; 403 forbidden; 422
                                  invalid-target
EVIDENCE EMIT                       upload_initiate (EC-22)
SLO                                 < 500ms
```

### 2.2 Confirm upload

```
PATH                              POST /v1/file/upload/confirm
PURPOSE                            after client PUT to pre-signed
                                  URL, confirm to HESEM with
                                  actual checksum + byte size
INPUT                              attachment_id, observed_checksum,
                                  observed_byte_size
RESPONSE                            attachment registered;
                                  virus scan + content inspection
                                  begins (async per E13);
                                  preliminary attachment metadata
ERRORS                              422 checksum-mismatch;
                                  413 size-mismatch
EVIDENCE EMIT                       upload_confirm (EC-22)
SPECIAL                              checksum-mismatch indicates
                                  network corruption or tamper;
                                  per H8 if pattern
```

### 2.3 Download

```
PATH                              GET /v1/file/download/
                                  {attachment_id}
PURPOSE                            retrieve file by attachment id
RESPONSE                            pre-signed download URL OR
                                  direct streaming response;
                                  per-region pinning honored;
                                  watermarked (ITAR /
                                  confidential) where applic
ERRORS                              404 not-found;
                                  403 forbidden / cross-tenant;
                                  503 not-yet-scanned
EVIDENCE EMIT                       download_event (EC-22 +
                                  for regulated: full audit
                                  including viewer identity)
RATE LIMIT                          per identity + per tenant
```

### 2.4 Virus scan / content inspection status

```
PATH                              GET /v1/file/{attachment_id}/scan
PURPOSE                            check virus scan + content
                                  inspection status
STATUS VALUES                       pending; clean; virus-detected
                                  (with signature); content-
                                  flagged (e.g., ITAR / PII /
                                  malware indicator);
                                  scan-error (downstream provider
                                  outage)
RESPONSE                            per check: status, last-checked,
                                  signature (where positive)
EVIDENCE EMIT                       scan_event (EC-22)
SPECIAL                              virus-detected → SEV-2;
                                  attachment quarantined; tenant
                                  + Security Lead notified
                                  (per I7)
```

### 2.5 Attachment metadata lookup

```
PATH                              GET /v1/file/{attachment_id}/
                                  metadata
PURPOSE                            retrieve metadata without
                                  download
RESPONSE                            filename, content_type, size,
                                  upload_at, scan_status, retention
                                  class (per H4 / H5), WORM lock
                                  state, watermarking applied,
                                  per-pack overlay flags
EVIDENCE EMIT                       sampled access_audit
```

### 2.6 Attachment lifecycle (admin)

```
PATH                              POST /v1/file/{attachment_id}/
                                  retain
                                  POST /v1/file/{attachment_id}/
                                  hold (legal hold per H5 §5)
                                  POST /v1/file/{attachment_id}/
                                  delete (per retention expiry)
PURPOSE                            retention class change;
                                  legal hold;
                                  retention-expired deletion
PRECONDITIONS                       per H7 + per H5;
                                  Compliance Lead signoff
EVIDENCE EMIT                       retention_event (EC-29 deletion;
                                  EC-28 hold)
```

### 2.7 Per-pack content inspection

```
PATH                              POST /v1/file/{attachment_id}/
                                  inspect/{type}
PURPOSE                            additional pack-specific
                                  inspection: ITAR content,
                                  biocompatibility report parse,
                                  thermal-cycle data integrity,
                                  drawing bubble extraction (per
                                  AI-08 + Aero AI-FAI)
AUDIENCE                            per pack workflow + AI feature
RESPONSE                            inspection result + structured
                                  data (where parsed)
EVIDENCE EMIT                       inspection_record (per H4)
```

---

## 3. Authentication + authorization

```
EVERY ENDPOINT                  authenticated session
PER-ATTACHMENT AUTH              per-record + per-tenant + per-
                                role + per-pack
                                (some restricted: ITAR; red-team;
                                cyber)
PRE-SIGNED URL EXPIRATION        short (5 min upload; 15 min
                                download); per-tenant region
                                pinning embedded in URL
WATERMARKING                       ITAR + confidential always;
                                attempt-to-strip detected via
                                content fingerprint
SUB-PROCESSOR                       per L2 §8 (e.g., AV provider;
                                content-inspection provider);
                                per I8 DPA
```

---

## 4. Cross-cutting concerns

```
PROBLEM DETAILS (RFC 9457)        per error class
S3 PRE-SIGNED URL                  client → storage direct
                                 (avoids HESEM as proxy);
                                 per-region storage backend;
                                 per-tenant bucket / namespace
VIRUS SCAN                          mandatory before download;
                                 ClamAV + commercial AV chain;
                                 daily signature update
CONTENT INSPECTION                  per pack: ITAR keyword scan;
                                 PII auto-redact (per I7 §9);
                                 malware-pattern scan
WATERMARKING                          ITAR + confidential
                                 (irremovable;
                                 fingerprinted)
WORM LOCKED                            for retention class per H5;
                                 storage backend (S3 Object Lock
                                 Compliance mode)
ENCRYPTION                              at-rest AES-256 GCM;
                                 in-transit TLS 1.3;
                                 customer-managed key per tenant
                                 where contracted
DATA RESIDENCY                          per region pinning;
                                 cross-region transfer rejected
                                 (ITAR / GDPR)
RETENTION                                per H4 EC class +
                                 per H5 floor
WAVE-MIGRATION                            archive tier movement per
                                 cycle (per H5)
DEPRECATION                              per E0
RATE LIMITING                              per identity + per tenant
```

---

## 5. Failure modes (RFC 9457)

```
TYPE                                  STATUS  MEANING
upload/file-too-large                  413     per-tenant + per-pack
                                              limit
upload/checksum-mismatch                422     network corruption
                                              or tamper indicator
upload/byte-size-mismatch                422     declared vs actual
                                              mismatch
upload/virus-detected                     422     SEV-2; quarantined
upload/content-flagged                    422     PII / ITAR keyword /
                                              banned content;
                                              quarantined for review
upload/unsupported-mime                   415
upload/cross-tenant-target                 403     SEV-1
upload/region-pinning-violated             403     cross-region attempt
upload/sub-processor-fail                  503     AV / inspection
                                              provider outage
download/not-yet-scanned                    503     scan still pending
download/quarantined                         403     virus-detected or
                                              content-flagged
download/cross-tenant                         403     SEV-1
download/expired                              410     pre-signed URL
                                              past expiration
retention/legal-hold                           409     cannot delete during
                                              hold (per H5 §5)
retention/before-floor                          409     deletion attempted
                                              before retention floor
                                              (per H5)
auth/unauthorized                                401
auth/forbidden                                  403
deprecation/sunset                              410
```

---

## 6. SLO + budget

```
2.1 initiate p95                  < 500ms
2.2 confirm p95                     < 250ms
2.3 download p95 (URL gen)            < 250ms
2.4 scan status p95                    < 200ms
2.5 metadata p95                        < 200ms
2.6 retention                            admin path
2.7 per-pack inspect                      LRO per E13
SCAN COMPLETION                            target < 60s for typical
                                          file; LRO for large
ERROR RATE                                  per SLO-9
```

---

## 7. Wave target

```
W3        L4 substrate (initiate, confirm, download,
          virus scan, metadata)
W4        L5 active enforcement; CDC for upload events
W5        per-pack content inspection (ITAR keyword;
          biocompatibility parse; thermal-cycle
          integrity)
W7        AI-08 document text extraction integration;
          drawing bubble extraction (Aero)
W8        SOC 2 + DORA Elite path
W10       per-pack overlays GA
W12       sovereign region variants;
          PQC envelope encryption migration
```

---

## 8. Per-pack overlays

```
PHARMA (J1)                      EBR scan attachment;
                                 stability data file;
                                 EM excursion photo;
                                 deviation supporting evidence
AUTO (J2)                        PFMEA evidence;
                                 IMDS material declaration;
                                 layered audit photos
AERO (J3)                        AS9102 FAI bubbled drawing;
                                 NADCAP-cycle records;
                                 counterfeit photos;
                                 ITAR-watermarked drawings
                                 (segregated storage region)
MD (J4)                          DHF + DHR evidence;
                                 IFU master files;
                                 biocompatibility report;
                                 clinical-trial documentation
FOOD (J5)                        HACCP CCP photos;
                                 sanitation visual evidence;
                                 thermal-cycle data files
```

---

## 9. Failure modes (operational)

```
FM1   Virus detected
      Behavior: 422 upload/virus-detected; SEV-2
      Recovery: per I7 incident; quarantine;
              tenant notification; H8 systemic if pattern

FM2   Cross-tenant attachment access attempt
      Behavior: 403 SEV-1
      Recovery: per B6 C5; H8 systemic

FM3   Cross-region transfer attempt (ITAR / GDPR)
      Behavior: 403 region-pinning-violated
      Recovery: per data residency; per J3 §5

FM4   Sub-processor (AV) outage
      Behavior: 503 sub-processor-fail
      Recovery: per L2 §2; secondary AV provider;
              per I3 incident

FM5   Pre-signed URL expired
      Behavior: 410 download/expired
      Recovery: client re-initiate;
              per H8 if deadline pressure causing
              repeated failures

FM6   Retention deletion before floor
      Behavior: 409 retention/before-floor
      Recovery: per H5 enforcement; investigation;
              SEV per attempt

FM7   Watermarking removed
      Behavior: detected via fingerprint;
              SEV-2 per ITAR per J3;
              forensic preservation
      Recovery: per I7 + L4 if AI-related;
              tenant + regulator notification

FM8   File too large for tenant tier
      Behavior: 413 too-large
      Recovery: per I6 + I8; tenant tier upgrade

FM9   Content-flagged (PII / banned)
      Behavior: 422 content-flagged; quarantine
      Recovery: tenant DPO review;
              redact + re-upload OR delete
```

---

## 10. Roles and authority (RACI)

```
ENDPOINT             PLAT  SEC  COMP  TENANT  USER  AUDITOR
2.1 initiate         A     C    -     R       R     -
2.2 confirm          A     -    -     R       R     -
2.3 download         A     C    -     R       R     R
2.4 scan status      A     A    -     R       R     -
2.5 metadata         A     -    -     R       R     R
2.6 retention        A     -    A     A       -     -
2.7 per-pack         A     -    A     R       -     R
```

---

## 11. Cross-references

- E0 — API conventions
- E3 — workflow command may emit attachment evidence
- E4 — record link
- E6 — audit chain
- E7 — signed download URL
- E8 — evidence catalog
- E11 — bulk file pattern
- E13 — LRO orchestration
- E14 — admin retention
- F4 + F5 + F6 — UI uploaders + viewers
- H1 §3 — regulator notification on virus / breach
- H4 — file_attachment evidence
- H5 — retention floors
- H7 — retention class change
- I7 — security operations integration
- L2 §8 — sub-processor (AV / inspection)
- M5 — SLO-9
- M9 — cross-reference

---

## 12. Decision phrase

```
E12_FILE_UPLOAD_API_BASELINE_LOCKED
NEXT: E13_LONG_RUNNING_OPERATION_API.md
```

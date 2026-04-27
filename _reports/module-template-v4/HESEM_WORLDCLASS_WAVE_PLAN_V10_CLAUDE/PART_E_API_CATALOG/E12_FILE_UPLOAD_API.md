# E12 — File Upload API  ·  V10 Deep-Upgrade

```
api_family:      File Upload & Storage
owner_role:      Data Platform Lead with Compliance Lead
scope:           Three-step pre-signed upload flow; virus + content inspection
                 pipeline; WORM lock on confirmation; per-pack overlay endpoints
                 for J1/J3/J4/J5 industry packs; multipart chunked upload for
                 large files; metadata + retention lifecycle visibility;
                 quarantine management; AI-08 FAI bubble extraction integration
sources:         21 CFR 11.10(c) record protection throughout retention period;
                 21 CFR 11.10(b) accurate and complete copies;
                 EU GMP Annex 11 §8 electronic records backup + recovery;
                 ISO 13485 §4.2.5 control of documented information;
                 AS9100D §8.1 operation planning evidence;
                 ITAR 22 CFR §120-130 controlled technical data handling;
                 HACCP 21 CFR Part 120 §8 CCP monitoring records;
                 ICH Q7 §6 materials management documentation;
                 NIST SP 800-190 container security (ClamAV scanning);
                 AWS S3 Object Lock — COMPLIANCE mode retention;
                 in-toto 1.0 provenance attestation;
                 OpenAPI 3.1.1; RFC 9457; RFC 7232; RFC 8946 (multipart);
                 H4 evidence class definitions; H5 retention schedule;
                 I7 content inspection policy; AI-08 FAI extraction spec
```

The File Upload API is the sole authorised ingress path for binary artifacts
attached to HESEM authoritative records. Photos, scan PDFs, CAD packages,
test-result CSV/Parquet files, batch records, and compliance documents all
enter the platform through a three-step pre-signed flow: **Initiate** obtains
a time-bounded upload URL, **Upload** writes bytes directly to S3, and
**Confirm** triggers server-side virus scanning, content inspection, hash
verification, and WORM lock commitment. A file not yet confirmed is invisible
to all record-shell surfaces; a quarantined file is inaccessible outside the
quarantine management interface. Industry-pack overlay endpoints expose
specialised extraction and classification logic for ITAR-controlled drawings
(J3), pharmaceutical biocompatibility documents (J1), First Article Inspection
drawings with AI-08 bubble extraction (J3 Aero), HACCP CCP photos (J5), and
thermal validation run data (J1/J4). Every file is linked to at least one H4
evidence class record upon confirmation; that link is immutable.

---

## 1. Purpose and scope

### 1.1 In scope

- Pre-signed upload URL issuance (single-part and multipart)
- Server-side confirmation: SHA-256 hash verification, ClamAV primary scan,
  secondary AV scan, I7 content inspection (file-type allow-list, ITAR keyword
  scan, biocomp content validation, size enforcement)
- WORM lock commitment in S3 Object Lock COMPLIANCE mode per H5 evidence
  class retention schedule
- Virus scan status polling; quarantine notification and management
- File metadata retrieval: name, size, MIME, scan state, WORM state, evidence
  class links, provenance chain
- Retention lifecycle view: Object Lock retain-until date, legal-hold state,
  remaining retention days
- Per-pack overlay endpoints:
  - J3 ITAR — ITAR keyword scan result; watermark injection for CAD downloads
  - J1 Pharma — biocompatibility document structural parse (EC-17 extraction)
  - J3 Aero — FAI bubble extraction via AI-08 integration
  - J5 Food — CCP photo classification (HACCP critical control point)
  - J1/J4 — thermal cycle data parse from CSV or Parquet validation runs
- Download endpoint with pre-signed URL issuance; ITAR-watermarked download
  for J3 controlled files
- Chunked multipart upload coordination for files above the single-part
  threshold (100 MB)
- Provenance attestation record (in-toto link) created on confirmation

### 1.2 Out of scope

- Evidence record creation (E8 — Evidence API handles the evidence row;
  E12 delivers the binary and returns a `file_id` that E8 attaches)
- WORM policy declaration (H5 defines retention floors; E12 reads H5 and
  applies the correct Object Lock duration)
- Long-running export operations (E13 — Export/Archive API)
- Notification dispatch on scan failure (E10 — Notification API)
- Audit event chain management (E6)
- AI-08 model training or re-scoring (AI-08 service owns the model; E12
  calls its extraction endpoint)

### 1.3 Regulatory obligations

| Regulation | Obligation | Mapped requirement |
|---|---|---|
| 21 CFR 11.10(c) | Protect records throughout retention period | §6 WORM lock; §7 retention endpoint |
| 21 CFR 11.10(b) | Accurate and complete copies | §5 download with hash verification |
| EU GMP Annex 11 §8 | Backup, integrity, and availability | §4 confirm with hash; §6 WORM |
| ISO 13485 §4.2.5 | Documented information control | §4 confirm; §3 metadata |
| ITAR 22 CFR §127.1 | Export control of technical data | §8.1 ITAR overlay |
| HACCP 21 CFR Part 120 §8 | CCP monitoring records | §8.4 J5 CCP photo overlay |
| ICH Q7 §6 | Materials management documentation | §8.2 J1 biocomp overlay |
| NIST SP 800-190 | Container and image scanning | §4.2 ClamAV pipeline |
| AS9100D §8.1 | Operation planning evidence (FAI) | §8.3 J3 Aero FAI overlay |

### 1.4 File size policy

| Category | Single-part limit | Multipart threshold | Absolute ceiling |
|---|---|---|---|
| Photos (JPEG, PNG, HEIF) | 50 MB | — | 100 MB |
| Scan PDFs | 100 MB | — | 200 MB |
| CAD packages (STEP, IGES, DXF, ZIP) | 100 MB | 100 MB | 2 GB |
| Test data (CSV, Parquet) | 50 MB | 50 MB | 500 MB |
| Batch records (PDF) | 100 MB | — | 200 MB |
| Video evidence | 500 MB | 100 MB | 5 GB |

Files exceeding the absolute ceiling are rejected at Initiate with HTTP 413.

---

## 2. Authentication and authorisation

All endpoints require a valid session token (`Authorization: Bearer <jwt>`)
or a scoped API key. Role-level authorisation:

| Role | Initiate | Confirm | Download | Scan status | Metadata | Retention | Pack overlays |
|---|---|---|---|---|---|---|---|
| `OPERATOR` | own records only | own records only | own uploads | own | own | — | — |
| `QA_ENGINEER` | record-scoped | record-scoped | yes | yes | yes | read | J1, J5 |
| `COMPLIANCE_LEAD` | yes | yes | yes | yes | yes | read+write | all |
| `ITAR_CLEARED` | ITAR assets | ITAR assets | ITAR (watermarked) | yes | yes | read | J3 ITAR |
| `DATA_PLATFORM` | yes | yes | yes | yes | yes | read+write | all |
| `AUDITOR` (token) | — | — | read-only | read | read | read | — |

ITAR-classified files are accessible only to roles holding `ITAR_CLEARED`
clearance. Attempts by non-cleared principals return HTTP 451 (Unavailable For
Legal Reasons) with a `reason: "ITAR_ACCESS_RESTRICTED"` body.

---

## 3. Common conventions

### 3.1 Base path

```
/api/v1/files
```

### 3.2 Standard error envelope (RFC 9457)

```jsonc
{
  "type": "https://hesem.io/problems/file-upload/<slug>",
  "title": "Human-readable summary",
  "status": 422,
  "detail": "Machine-useful detail",
  "instance": "/api/v1/files/upload/initiate",
  "trace_id": "01JQK9..."
}
```

### 3.3 File states

```
PENDING_UPLOAD   — Initiate called; pre-signed URL issued; bytes not yet received
UPLOADED         — S3 received bytes; Confirm not yet called
SCANNING         — Confirm received; virus + content scan in progress
CLEAN            — All scans passed; WORM lock applied; file accessible
QUARANTINED      — Virus or policy violation detected; file locked inaccessible
REJECTED         — Content inspection hard-fail (wrong type, ITAR block); no WORM
EXPIRED          — Pre-signed URL expired before upload; record purged
```

### 3.4 WORM lock modes

S3 Object Lock COMPLIANCE mode is used for all confirmed files. GOVERNANCE
mode is never used for evidence-linked files. Retain-until dates are computed
per H5 evidence class retention schedule at Confirm time. Legal hold is
managed separately via the Retention endpoint (§7).

---

## 4. Upload flow — three steps

### Step 1 — Initiate

**POST /api/v1/files/upload/initiate**

Validates the upload request, enforces file size and type policy, issues a
pre-signed S3 PUT URL (single-part) or a pre-signed multipart initiation URL
(large files). Returns a `upload_id` that must be supplied in the Confirm
call.

#### Request

```jsonc
{
  // Required — target record context
  "record_kind": "NQCASE",            // root kind per ADR-0002 14-domain vocabulary
  "record_id": "nqc-2026-00441",

  // Required — file metadata declared by caller
  "filename": "inspection-photo-01.jpg",
  "content_type": "image/jpeg",
  "size_bytes": 4204800,              // declared size; verified at Confirm

  // Required — evidence class to link on confirmation
  "evidence_class": "EC-01",          // H4 evidence class code

  // Optional — industry pack classification hint (validated, not trusted blindly)
  "pack_hint": "J5",                  // J1 | J3 | J4 | J5 — enables pack validation path

  // Optional — ITAR assertion; required when pack_hint = "J3"
  "itar_asserted": false,

  // Optional — multipart; set true when size_bytes > single-part threshold
  "multipart": false,

  // Optional — part count for multipart upload (required when multipart = true)
  "part_count": null,

  // Optional — caller-supplied SHA-256 of the file (hex); verified at Confirm
  "sha256_declared": "e3b0c44298fc1c..."
}
```

#### Validation rules (applied at Initiate)

1. `record_kind` must be one of the 18 Wave 1 roots or an approved LEGACY root.
2. `evidence_class` must exist in H4 and must be linkable to `record_kind`.
3. `content_type` must appear in the allow-list for the declared `evidence_class`
   (enforced again at Confirm via magic-byte inspection).
4. `size_bytes` must not exceed the absolute ceiling for the content_type category.
5. When `pack_hint = "J3"` and `itar_asserted = true`, the caller must hold
   `ITAR_CLEARED` role; otherwise Initiate returns HTTP 403.
6. When `multipart = true`, `part_count` must be 1–10,000 (S3 limit).

#### Response — single-part (HTTP 201)

```jsonc
{
  "upload_id": "upl-01JQK9XRTV8Z3M5PNHQ4BDEW7",

  "upload_mode": "single_part",

  // Pre-signed S3 PUT URL — valid for 15 minutes
  "presigned_url": "https://hesem-evidence-bucket.s3.amazonaws.com/raw/upl-01JQK9.../object?X-Amz-...",
  "presigned_expires_at": "2026-04-27T10:30:00Z",

  // Required headers the caller MUST include in the S3 PUT request
  "required_headers": {
    "Content-Type": "image/jpeg",
    "x-amz-checksum-sha256": "e3b0c44298fc1c..."   // only present if sha256_declared supplied
  },

  // Confirm endpoint to call after S3 PUT
  "confirm_url": "POST /api/v1/files/upload/confirm",
  "confirm_deadline": "2026-04-27T10:45:00Z",      // 15 min after presigned_expires_at

  // File state
  "state": "PENDING_UPLOAD",

  // Where the file will live after confirmation
  "evidence_class": "EC-01",
  "record_kind": "NQCASE",
  "record_id": "nqc-2026-00441"
}
```

#### Response — multipart (HTTP 201)

```jsonc
{
  "upload_id": "upl-01JQK9XRTV8Z3M5PNHQ4BDEW7",
  "upload_mode": "multipart",

  // S3 multipart upload ID
  "s3_upload_id": "VXBsb2FkIElEIGZvci42...",

  // Per-part pre-signed URLs (one per part)
  "parts": [
    {
      "part_number": 1,
      "presigned_url": "https://hesem-evidence-bucket.s3.amazonaws.com/...?partNumber=1&...",
      "presigned_expires_at": "2026-04-27T10:30:00Z"
    }
    // ... repeated for all part_count parts
  ],

  // After all parts are uploaded, caller completes multipart upload via S3 SDK,
  // then calls Confirm with the ETags returned by S3 for each part.
  "complete_instructions": "Upload each part; collect ETag from each response; call POST /api/v1/files/upload/confirm with multipart_etags array.",

  "confirm_deadline": "2026-04-27T12:00:00Z",      // 90 min window for large files
  "state": "PENDING_UPLOAD",
  "evidence_class": "EC-07",
  "record_kind": "NQCASE",
  "record_id": "nqc-2026-00441"
}
```

#### Error responses

| HTTP | Problem slug | Condition |
|---|---|---|
| 400 | `invalid-evidence-class` | `evidence_class` not in H4 or not linkable to `record_kind` |
| 400 | `content-type-not-allowed` | MIME type not on allow-list for evidence class |
| 403 | `itar-clearance-required` | `itar_asserted=true` but caller lacks `ITAR_CLEARED` |
| 409 | `pending-upload-exists` | A non-expired `upload_id` already exists for this (record, evidence_class) pair and evidence class allows only one file |
| 413 | `file-too-large` | `size_bytes` exceeds absolute ceiling for content_type category |
| 422 | `part-count-invalid` | `multipart=true` but `part_count` outside 1–10000 |

---

### Step 2 — Upload to S3

The caller performs the S3 PUT (single-part) or the individual part PUTs
(multipart) directly, using the pre-signed URLs returned by Initiate. HESEM
servers are not in the data path during this step. The caller must:

- Single-part: issue one HTTP PUT with the file body to `presigned_url`.
  Include `Content-Type` and, if present, `x-amz-checksum-sha256` headers.
- Multipart: PUT each part with the matching pre-signed URL; collect the
  `ETag` response header for each part (required for S3 CompleteMultipartUpload
  and the Confirm call).

S3 enforces the pre-signed URL expiry; an expired URL returns HTTP 403 from
S3. The caller should call Initiate again to obtain fresh URLs.

---

### Step 3 — Confirm

**POST /api/v1/files/upload/confirm**

Tells the server the upload is complete. The server verifies the object exists
in S3, recomputes the SHA-256, triggers the virus and content inspection
pipeline, and — upon a clean result — commits the WORM lock and creates the
evidence link. Returns immediately with `state: "SCANNING"` and a polling URL;
the final CLEAN/QUARANTINED/REJECTED state is available via the scan status
endpoint (§4.1).

#### Request — single-part

```jsonc
{
  "upload_id": "upl-01JQK9XRTV8Z3M5PNHQ4BDEW7",

  // S3 ETag returned in the PUT response header (used for object verification)
  "s3_etag": "\"d41d8cd98f00b204e9800998ecf8427e\"",

  // Optional — caller re-asserts declared hash for belt-and-suspenders check
  "sha256_declared": "e3b0c44298fc1c..."
}
```

#### Request — multipart

```jsonc
{
  "upload_id": "upl-01JQK9XRTV8Z3M5PNHQ4BDEW7",

  // S3 multipart upload ID returned at Initiate
  "s3_upload_id": "VXBsb2FkIElEIGZvci42...",

  // ETags for each part, in order
  "multipart_etags": [
    { "part_number": 1, "etag": "\"abc123\"" },
    { "part_number": 2, "etag": "\"def456\"" }
  ],

  "sha256_declared": "e3b0c44298fc1c..."
}
```

#### Server-side Confirm pipeline (synchronous pre-checks, then async scan)

**Synchronous pre-checks (blocking, < 500 ms target):**
1. Verify `upload_id` exists and is in `PENDING_UPLOAD` or `UPLOADED` state.
2. Call S3 HeadObject to confirm the object exists and its `Content-Length`
   matches `size_bytes` declared at Initiate (±0 bytes; mismatch = REJECTED).
3. For multipart: call S3 CompleteMultipartUpload with the provided ETags;
   verify S3 returns 200.
4. Compute SHA-256 of the S3 object via S3 GetObject streaming; compare to
   `sha256_declared` if provided. Mismatch = REJECTED immediately.
5. Validate magic bytes against declared `content_type` (e.g., JPEG must start
   with `FF D8 FF`; PDF must start with `%PDF`). Mismatch = REJECTED.
6. Set state to `SCANNING`; enqueue scan job to internal RabbitMQ topic
   `file.scan.pending`.

**Asynchronous scan pipeline (see §4.2 for status polling):**
7. ClamAV primary scan (freshclam signatures ≤ 24 h old).
8. Secondary AV scan (configurable; default: secondary ClamAV instance with
   separate signature set; optional commercial AV via plugin hook).
9. I7 content inspection (see §4.3).
10. On CLEAN: apply S3 Object Lock COMPLIANCE retain-until date (computed from
    H5 retention schedule for `evidence_class`); transition state to CLEAN;
    create evidence link row; emit `file.confirmed` event; create in-toto
    provenance attestation.
11. On virus detected: move object to quarantine prefix; set state QUARANTINED;
    emit `file.quarantined` event; trigger E10 notification to Data Platform Lead
    and Compliance Lead.
12. On I7 hard-fail: state = REJECTED; object deleted from S3; emit
    `file.rejected` event.

#### Response (HTTP 202 — accepted, scan pending)

```jsonc
{
  "upload_id": "upl-01JQK9XRTV8Z3M5PNHQ4BDEW7",
  "file_id": null,                    // null until CLEAN; populated by scan status endpoint
  "state": "SCANNING",
  "scan_status_url": "GET /api/v1/files/upload/upl-01JQK9XRTV8Z3M5PNHQ4BDEW7/scan-status",
  "poll_interval_seconds": 5,
  "estimated_completion_seconds": 30,
  "sha256_server": "e3b0c44298fc1c...",  // server-computed hash
  "hash_match": true                  // false if sha256_declared was supplied and mismatched (but scan still queued for logging)
}
```

#### Error responses (synchronous pre-checks only)

| HTTP | Problem slug | Condition |
|---|---|---|
| 400 | `upload-id-not-found` | `upload_id` unknown or expired |
| 400 | `size-mismatch` | S3 Content-Length ≠ declared size_bytes |
| 400 | `hash-mismatch` | SHA-256 recomputed ≠ sha256_declared |
| 400 | `magic-byte-mismatch` | File bytes inconsistent with declared content_type |
| 409 | `already-confirmed` | `upload_id` already in CLEAN or QUARANTINED state |
| 422 | `multipart-complete-failed` | S3 CompleteMultipartUpload returned error |
| 503 | `scan-queue-unavailable` | RabbitMQ enqueue failed; retry-after header set |

---

## 4.1 Scan status endpoint

**GET /api/v1/files/upload/{upload_id}/scan-status**

Polls the current scan state. Returns immediately with the latest state.
Callers should honour the `poll_interval_seconds` returned by Confirm. Long
polling is supported: append `?wait=30` to block up to 30 seconds for a state
transition (releases when state changes or timeout expires).

#### Path parameters

| Parameter | Type | Description |
|---|---|---|
| `upload_id` | string | Upload ID from Initiate |

#### Query parameters

| Parameter | Type | Default | Description |
|---|---|---|---|
| `wait` | integer | 0 | Long-poll seconds (0 = return immediately; max 60) |

#### Response (HTTP 200)

```jsonc
{
  "upload_id": "upl-01JQK9XRTV8Z3M5PNHQ4BDEW7",
  "state": "CLEAN",                   // SCANNING | CLEAN | QUARANTINED | REJECTED

  // Populated once CLEAN
  "file_id": "fil-01JQK9Z8TVNPM2WXQ3RDES4KA1",

  // Scan pipeline results
  "scan_results": {
    "primary_av": {
      "engine": "ClamAV 1.4.1",
      "signature_date": "2026-04-27",
      "result": "CLEAN",              // CLEAN | VIRUS_DETECTED
      "virus_name": null,
      "scanned_at": "2026-04-27T10:16:42Z",
      "duration_ms": 312
    },
    "secondary_av": {
      "engine": "ClamAV 1.4.1 (secondary)",
      "signature_date": "2026-04-27",
      "result": "CLEAN",
      "virus_name": null,
      "scanned_at": "2026-04-27T10:16:43Z",
      "duration_ms": 298
    },
    "content_inspection": {
      "result": "PASS",               // PASS | FAIL | WARN
      "checks": [
        {
          "check": "file_type_allowlist",
          "result": "PASS",
          "detail": "image/jpeg is permitted for EC-01"
        },
        {
          "check": "itar_keyword_scan",
          "result": "PASS",
          "detail": "0 controlled keyword matches",
          "matches": []
        },
        {
          "check": "size_within_policy",
          "result": "PASS",
          "detail": "4204800 bytes ≤ 104857600 ceiling"
        }
      ]
    }
  },

  // Populated once CLEAN
  "worm": {
    "lock_mode": "COMPLIANCE",
    "retain_until": "2036-04-27T00:00:00Z",
    "legal_hold": false,
    "applied_at": "2026-04-27T10:16:44Z"
  },

  // Evidence link — populated once CLEAN
  "evidence_link": {
    "evidence_class": "EC-01",
    "evidence_id": "evd-01JQK9ZFXVTP3MRQ8NDEW5L2K",
    "record_kind": "NQCASE",
    "record_id": "nqc-2026-00441"
  },

  // Provenance attestation
  "provenance": {
    "intoto_link_id": "lnk-01JQK9ZMVQ7P4NK3R8XDES2W5",
    "sha256": "e3b0c44298fc1c..."
  },

  "updated_at": "2026-04-27T10:16:44Z"
}
```

#### QUARANTINED state response (HTTP 200)

```jsonc
{
  "upload_id": "upl-01JQK9XRTV8Z3M5PNHQ4BDEW7",
  "state": "QUARANTINED",
  "file_id": null,
  "scan_results": {
    "primary_av": {
      "engine": "ClamAV 1.4.1",
      "result": "VIRUS_DETECTED",
      "virus_name": "Win.Malware.Generic-123456",
      "scanned_at": "2026-04-27T10:16:42Z"
    },
    "secondary_av": {
      "engine": "ClamAV 1.4.1 (secondary)",
      "result": "VIRUS_DETECTED",
      "virus_name": "Win.Malware.Generic-123456",
      "scanned_at": "2026-04-27T10:16:43Z"
    },
    "content_inspection": null        // not reached when virus detected
  },
  "quarantine": {
    "quarantined_at": "2026-04-27T10:16:44Z",
    "quarantine_ref": "qrn-01JQK9ZMVQ7P4NK3R8XDES2W5",
    "auto_delete_at": "2026-05-27T00:00:00Z"  // 30-day quarantine hold
  },
  "worm": null,
  "evidence_link": null
}
```

---

## 4.2 Virus scan pipeline — detailed specification

The virus scan pipeline runs inside an isolated scan worker service
(`hesem-av-worker`) deployed as a separate container with no network egress
other than ClamAV signature mirror and the internal HESEM message bus.

### 4.2.1 ClamAV primary scan

- Engine: ClamAV 1.4.x with daily freshclam updates (max 24 h age enforced;
  if signatures are stale the scan job fails with `SCAN_ENGINE_STALE` and
  retries after an automated freshclam run).
- Stream scanning: object is streamed from S3 in 8 MB chunks; no full copy to
  worker disk. MaxScanSize: 2 GB; MaxFileSize: 2 GB; MaxFiles: 10000 (for
  archive content).
- Archive inspection: zip, tar, 7z, rar, gzip, bzip2 are recursively scanned.
  Encrypted archives are flagged as `ENCRYPTED_ARCHIVE` (treated as WARN;
  routed to human review queue).
- Signature database: both `daily.cvd` and `main.cvd`; `bytecode.cvd` enabled.
- Timeout per scan: 120 seconds; timeout = SCAN_TIMEOUT error; retry once then
  quarantine conservatively.

### 4.2.2 Secondary AV scan

- A second ClamAV instance with independent signature synchronisation, running
  on a separate worker replica, scans the same stream.
- Disagreement policy: if primary = CLEAN but secondary = VIRUS_DETECTED, the
  file is quarantined and a human-review ticket is opened automatically in the
  QA ticket queue. If primary = VIRUS_DETECTED and secondary = CLEAN, the file
  is still quarantined (conservative policy).
- Plugin hook: `ContentInspectionPlugin::secondaryScan()` allows a commercial
  AV engine to be substituted via the plugin architecture without modifying E12
  core code.

### 4.2.3 Quarantine management

Quarantined files are moved to the `hesem-evidence-quarantine` S3 bucket
prefix with Object Lock GOVERNANCE mode (30-day default) to prevent accidental
deletion during investigation. Only `COMPLIANCE_LEAD` and `DATA_PLATFORM` roles
may access quarantine metadata. Automatic deletion occurs after the quarantine
hold if no human review action is taken. Quarantine events are emitted to E6
audit chain with full file hash and virus signature name.

---

## 4.3 Content inspection per I7

Content inspection runs after both AV scans pass and is enforced by the
`ContentInspectionService` against I7 policy. All checks are logged
individually; any FAIL causes the file state to transition to REJECTED (not
QUARANTINED — the object is not malicious but policy-blocked).

### 4.3.1 File type allow-list enforcement

Each H4 evidence class declares a set of permitted MIME types and file
extensions. Magic-byte verification (libmagic) is re-run on the confirmed
object regardless of the `content_type` declared at Initiate. Extension
spoofing (e.g., a PE executable renamed `.jpg`) is detected and rejected.

```
EC-01 (Photo):      image/jpeg, image/png, image/heif, image/tiff
EC-02 (Scan PDF):   application/pdf
EC-07 (Test result): text/csv, application/x-parquet, application/pdf
EC-17 (Biocomp):    application/pdf
EC-18 (FAI drawing): application/pdf, application/step, application/iges,
                     image/vnd.dxf, application/zip
EC-22 (Thermal):    text/csv, application/x-parquet
EC-31 (Video):      video/mp4, video/quicktime
```

### 4.3.2 ITAR keyword scan

Applied to all text-extractable files when `itar_asserted = true` or when the
file is linked to a J3 (Aero) or J3-ITAR-classified record. The keyword filter
is driven by the `itar_keyword_catalog` table (managed separately, not
hardcoded). Keyword matches are scored by a trie-based scanner:

- WARN-level matches: common dual-use terms; result recorded but not blocking.
- FAIL-level matches: USML Category I–XXI controlled terminology or EAR CCL
  identifiers; file is rejected and an ITAR incident record is opened.

Results are stored in the `file_itar_scan_result` table and referenced from
the J3 ITAR overlay endpoint (§8.1).

### 4.3.3 Biocompatibility content validation

Applied when `evidence_class = EC-17` or `pack_hint = "J1"`. The
`BiocompContentValidator` checks:
- PDF must be text-selectable (not a scanned image without OCR); if image-only,
  a WARN is recorded and the file is still accepted but flagged for OCR
  processing.
- Minimum page count ≥ 1.
- Presence of at least one of the ISO 10993 series reference patterns in
  extracted text (heuristic; WARN only, not blocking).

### 4.3.4 Thermal data schema validation

Applied when `evidence_class = EC-22` or `pack_hint` includes J1 or J4.
CSV/Parquet files are parsed for required columns per the thermal validation
run schema (column names: `timestamp_utc`, `temp_celsius`, `cycle_id`,
`setpoint_celsius`, `deviation_celsius`). Missing required columns = FAIL.
Extra columns are accepted. Row count must be ≥ 10 (trivially empty files
rejected).

---

## 5. Download endpoint

**GET /api/v1/files/{file_id}/download**

Issues a time-bounded pre-signed S3 GET URL. For ITAR-classified files,
the download URL points to a server-side watermarking proxy that injects
an ITAR watermark before streaming bytes to the client (see §8.1).

#### Path parameters

| Parameter | Type | Description |
|---|---|---|
| `file_id` | string | File ID from Confirm/scan-status response |

#### Query parameters

| Parameter | Type | Default | Description |
|---|---|---|---|
| `disposition` | string | `attachment` | `attachment` or `inline` |
| `version` | string | latest | Specific version hash (for versioned files) |

#### Response (HTTP 200 — non-ITAR)

```jsonc
{
  "file_id": "fil-01JQK9Z8TVNPM2WXQ3RDES4KA1",
  "filename": "inspection-photo-01.jpg",
  "content_type": "image/jpeg",
  "size_bytes": 4204800,
  "sha256": "e3b0c44298fc1c...",

  // Pre-signed download URL — valid for 10 minutes
  "download_url": "https://hesem-evidence-bucket.s3.amazonaws.com/confirmed/fil-01JQK9.../object?X-Amz-...",
  "download_expires_at": "2026-04-27T10:40:00Z",

  "itar_watermarked": false,
  "worm_state": "LOCKED"
}
```

#### Response (HTTP 200 — ITAR file, ITAR_CLEARED caller)

```jsonc
{
  "file_id": "fil-01JQK9Z8TVNPM2WXQ3RDES4KA1",
  "filename": "engine-bracket-rev-b.dxf",
  "content_type": "image/vnd.dxf",
  "size_bytes": 2097152,
  "sha256": "a1b2c3d4...",

  // Download URL routes through ITAR watermark proxy — not a direct S3 URL
  "download_url": "https://hesem.internal/api/v1/files/fil-01JQK9Z8TVNPM2WXQ3RDES4KA1/itar-stream?token=eyJ...",
  "download_expires_at": "2026-04-27T10:40:00Z",

  "itar_watermarked": true,
  "watermark_policy": {
    "injected_text": "ITAR CONTROLLED — NOT FOR EXPORT WITHOUT LICENSE — USER: jsmith@hesem.io — 2026-04-27T10:30:00Z",
    "overlay_mode": "PDF_STAMP"       // PDF_STAMP | DXF_LAYER | PNG_OVERLAY
  },
  "worm_state": "LOCKED"
}
```

#### ITAR access denied (HTTP 451)

```jsonc
{
  "type": "https://hesem.io/problems/file-upload/itar-access-restricted",
  "title": "ITAR Controlled File — Access Restricted",
  "status": 451,
  "detail": "This file is classified as ITAR controlled technical data. Access requires ITAR_CLEARED role.",
  "reason": "ITAR_ACCESS_RESTRICTED",
  "instance": "/api/v1/files/fil-01JQK9.../download"
}
```

#### Hash verification on download

Every download response includes `sha256` of the stored object. Clients
should verify the downloaded bytes match this hash before use. The server
independently recomputes the hash on each Confirm and stores it as the
canonical hash; it does not change after WORM lock.

---

## 6. Metadata endpoint

**GET /api/v1/files/{file_id}**

Returns full file metadata including scan state, WORM lock state, evidence
class links, provenance, and version history.

#### Response (HTTP 200)

```jsonc
{
  "file_id": "fil-01JQK9Z8TVNPM2WXQ3RDES4KA1",
  "upload_id": "upl-01JQK9XRTV8Z3M5PNHQ4BDEW7",

  // File identity
  "filename": "inspection-photo-01.jpg",
  "content_type": "image/jpeg",
  "size_bytes": 4204800,
  "sha256": "e3b0c44298fc1c...",

  // State
  "state": "CLEAN",

  // Timestamps
  "initiated_at": "2026-04-27T10:15:00Z",
  "confirmed_at": "2026-04-27T10:16:44Z",
  "scanned_at": "2026-04-27T10:16:44Z",

  // Upload context
  "uploaded_by": {
    "user_id": "usr-00112",
    "display_name": "Nguyen Thi Lan",
    "role": "QA_ENGINEER"
  },
  "record_context": {
    "record_kind": "NQCASE",
    "record_id": "nqc-2026-00441",
    "record_display": "NQC-2026-00441 — Surface Finish Defect"
  },

  // Evidence class link
  "evidence_links": [
    {
      "evidence_class": "EC-01",
      "evidence_class_label": "Photographic Evidence",
      "evidence_id": "evd-01JQK9ZFXVTP3MRQ8NDEW5L2K",
      "linked_at": "2026-04-27T10:16:44Z",
      "linked_by": "SYSTEM"
    }
  ],

  // Scan summary
  "scan_summary": {
    "primary_av": "CLEAN",
    "secondary_av": "CLEAN",
    "content_inspection": "PASS",
    "itar_scan": "NOT_APPLICABLE",    // NOT_APPLICABLE | CLEAN | WARN | FAIL
    "biocomp_validation": "NOT_APPLICABLE",
    "thermal_validation": "NOT_APPLICABLE"
  },

  // WORM
  "worm": {
    "lock_mode": "COMPLIANCE",
    "retain_until": "2036-04-27T00:00:00Z",
    "retention_basis": "H5 EC-01 minimum 10y",
    "legal_hold": false,
    "legal_hold_set_by": null,
    "legal_hold_set_at": null
  },

  // Provenance
  "provenance": {
    "intoto_link_id": "lnk-01JQK9ZMVQ7P4NK3R8XDES2W5",
    "sha256": "e3b0c44298fc1c...",
    "chain_verified": true,
    "verified_at": "2026-04-27T10:16:44Z"
  },

  // Version history (if file was superseded)
  "versions": [
    {
      "version": 1,
      "file_id": "fil-01JQK9Z8TVNPM2WXQ3RDES4KA1",
      "sha256": "e3b0c44298fc1c...",
      "created_at": "2026-04-27T10:16:44Z",
      "superseded_by": null
    }
  ],

  // Industry pack flags
  "pack_classifications": {
    "j1_pharma": false,
    "j3_itar": false,
    "j3_aero": false,
    "j4_thermal": false,
    "j5_food": false
  }
}
```

---

## 7. Retention endpoint

**GET /api/v1/files/{file_id}/retention**

Returns WORM lock details, retain-until date, legal hold status, remaining
retention days, and the H5 policy basis.

**PUT /api/v1/files/{file_id}/retention/legal-hold**

Sets or clears a legal hold on the file. Requires `COMPLIANCE_LEAD` role.
Legal hold prevents any deletion attempt (even after retain-until date passes)
until explicitly cleared. The operation is proxied to S3 PutObjectLegalHold
and also recorded in the `file_legal_hold_log` table.

#### GET response (HTTP 200)

```jsonc
{
  "file_id": "fil-01JQK9Z8TVNPM2WXQ3RDES4KA1",
  "worm": {
    "s3_object_lock_mode": "COMPLIANCE",
    "retain_until_date": "2036-04-27T00:00:00Z",
    "remaining_retention_days": 3650,
    "retention_basis": {
      "h5_rule_id": "H5-EC-01-001",
      "evidence_class": "EC-01",
      "minimum_retention_years": 10,
      "regulation_citation": "21 CFR 820.180(b); ISO 13485 §4.2.5",
      "declared_at": "2026-04-27T10:16:44Z"
    },
    "lock_applied_at": "2026-04-27T10:16:44Z",
    "lock_applied_by": "SYSTEM"
  },
  "legal_hold": {
    "active": false,
    "set_by": null,
    "set_at": null,
    "cleared_by": null,
    "cleared_at": null,
    "reason": null
  },
  "deletion_eligible_at": "2036-04-27T00:00:01Z",
  "deletion_requires_compliance_countersign": true
}
```

#### PUT legal-hold request

```jsonc
{
  "action": "SET",                    // SET | CLEAR
  "reason": "Active litigation hold — Case 2026-CV-0041",
  "authorized_by": "usr-00089"        // Compliance Lead user ID
}
```

#### PUT legal-hold response (HTTP 200)

```jsonc
{
  "file_id": "fil-01JQK9Z8TVNPM2WXQ3RDES4KA1",
  "legal_hold": {
    "active": true,
    "set_by": "usr-00089",
    "set_at": "2026-04-27T11:00:00Z",
    "reason": "Active litigation hold — Case 2026-CV-0041"
  },
  "s3_legal_hold_confirmed": true,
  "audit_event_id": "aud-01JQK9ZMVQ7P4NK3R8XDES2W5"
}
```

---

## 8. Per-pack content inspect endpoints

Per-pack overlay endpoints expose industry-specific extraction and
classification results for files that have passed the base scan pipeline.
These endpoints are read-only; they return results computed during or after
Confirm. For some overlays (J3 ITAR watermark, J3 Aero FAI extraction) a
secondary async job is triggered on first access if results are not yet cached.

---

### 8.1 J3 ITAR — ITAR content overlay

**GET /api/v1/files/{file_id}/inspect/itar**

Returns ITAR keyword scan results and, for CAD files, triggers watermark
injection. Access is restricted to `ITAR_CLEARED` role; all access is logged
to E6 audit chain with the accessor identity and timestamp.

#### Response (HTTP 200)

```jsonc
{
  "file_id": "fil-01JQK9Z8TVNPM2WXQ3RDES4KA1",
  "itar_classification": {
    "classified": true,
    "usml_categories": ["CAT_X_PROPULSION"],
    "classification_basis": "Keyword match: 'solid propellant grain geometry' — USML Cat X §121.11(a)",
    "classified_at": "2026-04-27T10:16:45Z"
  },
  "keyword_scan": {
    "total_matches": 3,
    "warn_matches": 1,
    "fail_matches": 2,
    "matches": [
      {
        "keyword": "solid propellant grain geometry",
        "usml_category": "CAT_X",
        "severity": "FAIL",
        "page": 4,
        "excerpt": "...optimized solid propellant grain geometry for...",
        "keyword_id": "itar-kw-04451"
      },
      {
        "keyword": "thrust vector control",
        "usml_category": "CAT_X",
        "severity": "FAIL",
        "page": 7,
        "excerpt": "...thrust vector control actuator integration...",
        "keyword_id": "itar-kw-04452"
      },
      {
        "keyword": "nozzle expansion ratio",
        "usml_category": "CAT_X",
        "severity": "WARN",
        "page": 9,
        "excerpt": "...nozzle expansion ratio analysis...",
        "keyword_id": "itar-kw-03881"
      }
    ]
  },
  "watermark": {
    "available": true,
    "watermark_text": "ITAR CONTROLLED — NOT FOR EXPORT WITHOUT LICENSE",
    "watermark_mode": "PDF_STAMP",
    "watermarked_download_url": "https://hesem.internal/api/v1/files/fil-.../itar-stream?token=eyJ...",
    "watermarked_url_expires_at": "2026-04-27T10:40:00Z"
  },
  "access_log": {
    "access_id": "acc-01JQK9ZMVQ7P4NK3R8XDES2W5",
    "accessed_by": "usr-00312",
    "accessed_at": "2026-04-27T10:30:00Z",
    "audit_event_id": "aud-01JQK9ZMVQ7P4NK3R8XDES2W5"
  }
}
```

#### ITAR watermark injection detail

CAD files (DXF, STEP, IGES) and PDFs receive different watermark treatments:
- **PDF**: a stamp layer is injected server-side using the HESEM PDF watermark
  service. The stamp appears on every page as a diagonal red-text overlay:
  `ITAR CONTROLLED — EXPORT CONTROLLED — USER: {username} — {datetime}`.
- **DXF**: a non-printing ITAR annotation layer (`ITAR_CONTROL_NOTICE`) is
  inserted with the clearance notice as a TEXT entity on a dedicated layer.
- **STEP/IGES**: a header comment block is prepended with the notice.
- The watermarked file is never stored; it is generated on-the-fly per
  download request and streamed directly to the client.

---

### 8.2 J1 Pharma — Biocompatibility document parse

**GET /api/v1/files/{file_id}/inspect/biocomp**

Parses a biocompatibility document (EC-17) and extracts structured content per
ISO 10993 series. Requires `QA_ENGINEER` or higher role. Applicable only to
PDF files linked to EC-17 evidence class.

#### Response (HTTP 200)

```jsonc
{
  "file_id": "fil-02JQK9Z8TVNPM2WXQ3RDES4KA1",
  "evidence_class": "EC-17",
  "parse_status": "COMPLETE",         // PENDING | COMPLETE | FAILED | NOT_APPLICABLE

  "extracted_content": {
    "document_title": "Biocompatibility Evaluation Report — Silicone Gasket Ref SG-220",
    "iso_10993_references": [
      "ISO 10993-1:2018",
      "ISO 10993-5:2009",
      "ISO 10993-10:2021"
    ],
    "material_identifiers": [
      { "material_code": "SIL-220", "description": "Medical-grade silicone 50A Shore" }
    ],
    "test_results": [
      {
        "test_type": "Cytotoxicity",
        "standard": "ISO 10993-5",
        "result": "PASS",
        "test_lab": "Eurofins BioPharma",
        "test_date": "2026-03-15",
        "page_reference": 12
      },
      {
        "test_type": "Sensitisation",
        "standard": "ISO 10993-10",
        "result": "PASS",
        "test_lab": "Eurofins BioPharma",
        "test_date": "2026-03-18",
        "page_reference": 18
      }
    ],
    "conclusion": "The evaluated silicone gasket material meets biocompatibility requirements for limited contact (< 24 h) per ISO 10993-1.",
    "effective_date": "2026-04-01",
    "total_pages": 34,
    "text_selectable": true,
    "ocr_required": false
  },

  "extraction_warnings": [],
  "parsed_at": "2026-04-27T10:17:00Z",
  "parser_version": "biocomp-parser-v2.3.1"
}
```

---

### 8.3 J3 Aero — FAI bubble extraction (AI-08 integration)

**GET /api/v1/files/{file_id}/inspect/fai-bubbles**

Triggers or returns results of FAI measurement bubble extraction from First
Article Inspection drawings. Delegates to the AI-08 extraction service which
runs a computer-vision model trained on engineering drawing annotation bubbles.
Applicable to PDF and CAD files linked to EC-18 (FAI drawing) evidence class.

This endpoint follows an async pattern identical to Confirm: it returns
immediately with `extraction_state: "PENDING"` on first call if the AI-08 job
has not yet run, and the caller polls until `extraction_state: "COMPLETE"` or
`"FAILED"`.

#### Response — extraction pending (HTTP 200)

```jsonc
{
  "file_id": "fil-03JQK9Z8TVNPM2WXQ3RDES4KA1",
  "evidence_class": "EC-18",
  "extraction_state": "PENDING",
  "ai08_job_id": "ai08-job-01JQK9ZXQ7P4NK3R8XDES2W5",
  "poll_interval_seconds": 10,
  "estimated_completion_seconds": 90
}
```

#### Response — extraction complete (HTTP 200)

```jsonc
{
  "file_id": "fil-03JQK9Z8TVNPM2WXQ3RDES4KA1",
  "evidence_class": "EC-18",
  "extraction_state": "COMPLETE",
  "ai08_job_id": "ai08-job-01JQK9ZXQ7P4NK3R8XDES2W5",

  "fai_bubbles": {
    "total_bubbles_detected": 47,
    "drawing_title": "Engine Bracket Assembly — Rev B",
    "drawing_number": "HES-MBR-2026-0041",
    "part_number": "HES-EBA-220B",
    "revision": "B",

    "measurements": [
      {
        "bubble_id": 1,
        "characteristic_type": "LINEAR_DIMENSION",
        "nominal_value": 125.00,
        "tolerance_plus": 0.05,
        "tolerance_minus": 0.05,
        "unit": "mm",
        "gdt_symbol": null,
        "datum_references": [],
        "page": 1,
        "bounding_box": { "x": 342, "y": 218, "w": 48, "h": 24 },
        "confidence": 0.97
      },
      {
        "bubble_id": 2,
        "characteristic_type": "GD_T_POSITION",
        "nominal_value": null,
        "tolerance_plus": 0.1,
        "tolerance_minus": null,
        "unit": "mm",
        "gdt_symbol": "⊕",
        "datum_references": ["A", "B", "C"],
        "page": 1,
        "bounding_box": { "x": 512, "y": 344, "w": 96, "h": 24 },
        "confidence": 0.94
      }
      // ... 45 more bubbles
    ],

    "low_confidence_bubbles": [
      {
        "bubble_id": 38,
        "confidence": 0.61,
        "review_required": true,
        "review_reason": "Partially obscured by drawing revision cloud"
      }
    ],

    "summary": {
      "critical_characteristics": 12,
      "key_characteristics": 18,
      "standard_characteristics": 17,
      "low_confidence_count": 1,
      "model_version": "ai08-fai-extractor-v3.1.0",
      "extracted_at": "2026-04-27T10:18:30Z"
    }
  },

  // Link back to FAI record for measurement actuals comparison
  "fai_record_link": {
    "available": true,
    "fai_record_id": "fai-2026-00118",
    "match_status": "47_BUBBLES_LINKED",
    "unmatched_bubbles": 0
  }
}
```

#### AI-08 integration detail

AI-08 is an internal computer-vision microservice exposing a gRPC + REST API.
E12 calls `POST /ai08/v1/fai-extract` with the S3 object URL and a signed
access token. AI-08 downloads the file (via a temporary pre-signed URL issued
by E12), runs the bubble extraction model, and posts results back to
`POST /api/v1/internal/fai-extraction-callback` with the `ai08_job_id`.
The callback handler stores results in `file_fai_extraction_result` and
updates `extraction_state`. E12 never exposes AI-08's internal URL to callers.
Access to the FAI bubble data is additionally restricted to `ITAR_CLEARED` for
J3-classified drawings.

---

### 8.4 J5 Food — CCP photo classification

**GET /api/v1/files/{file_id}/inspect/ccp-photo**

Classifies a photographic evidence file as a HACCP Critical Control Point
photo and extracts structured CCP metadata. Applicable to image files
(EC-01) linked to records under J5-classified processes. Requires
`QA_ENGINEER` or higher role.

#### Response (HTTP 200)

```jsonc
{
  "file_id": "fil-04JQK9Z8TVNPM2WXQ3RDES4KA1",
  "evidence_class": "EC-01",
  "ccp_classification": {
    "is_ccp_photo": true,
    "ccp_code": "CCP-003",
    "ccp_name": "Metal Detection — Final Product Line 2",
    "haccp_plan_ref": "HACCP-PLAN-2026-FPL2-001",
    "critical_limit": "No metal fragments ≥ 2.0 mm Fe / 2.5 mm SS / 3.0 mm Non-Fe",
    "monitoring_frequency": "Every 30 minutes or per production lot",
    "classification_confidence": 0.93,
    "classification_basis": "Photo metadata EXIF station ID CCP-003; QR code OCR confirmed"
  },

  "photo_metadata": {
    "capture_device": "Cognex In-Sight 9000",
    "station_id": "CCP-003-LINE-2",
    "captured_at": "2026-04-27T08:47:12Z",
    "production_lot": "LOT-2026-04-27-0023",
    "operator_id": "usr-00412",
    "shift": "MORNING",
    "result_shown": "PASS",
    "qr_code_verified": true
  },

  "fsma_traceability": {
    "ktd_linked": true,                // Key Traceability Data linked per FSMA §204
    "lot_id": "LOT-2026-04-27-0023",
    "traceability_record_id": "tr-2026-04-27-0023"
  },

  "classified_at": "2026-04-27T10:17:30Z",
  "classifier_version": "ccp-photo-classifier-v1.4.0"
}
```

---

### 8.5 J1/J4 — Thermal cycle data parse

**GET /api/v1/files/{file_id}/inspect/thermal-cycle**

Parses a CSV or Parquet thermal validation run file (EC-22) and extracts
structured cycle data, statistical summaries, and pass/fail evaluation per
the declared thermal protocol. Applicable to J1 (pharma validation) and
J4 (plastics process validation) packs. Requires `QA_ENGINEER` or higher role.

#### Response (HTTP 200)

```jsonc
{
  "file_id": "fil-05JQK9Z8TVNPM2WXQ3RDES4KA1",
  "evidence_class": "EC-22",
  "pack": ["J1", "J4"],
  "parse_status": "COMPLETE",

  "thermal_run": {
    "run_id": "THR-2026-04-27-0041",
    "protocol_ref": "PROC-THERM-2026-001",
    "equipment_id": "AUTOCLAVE-03",
    "operator_id": "usr-00512",
    "run_start": "2026-04-27T06:00:00Z",
    "run_end": "2026-04-27T08:30:00Z",
    "total_rows": 18000,
    "sample_interval_seconds": 0.5,
    "cycles_detected": 3,

    "cycles": [
      {
        "cycle_number": 1,
        "cycle_id": "CYCLE-001",
        "phase": "HEAT_UP",
        "start_time": "2026-04-27T06:00:00Z",
        "end_time": "2026-04-27T06:45:00Z",
        "setpoint_celsius": 121.1,
        "min_temp_celsius": 18.4,
        "max_temp_celsius": 122.3,
        "mean_temp_celsius": 78.2,
        "max_deviation_celsius": 1.2,
        "within_tolerance": true,
        "data_points": 5400
      },
      {
        "cycle_number": 2,
        "cycle_id": "CYCLE-002",
        "phase": "HOLD",
        "start_time": "2026-04-27T06:45:00Z",
        "end_time": "2026-04-27T07:45:00Z",
        "setpoint_celsius": 121.1,
        "min_temp_celsius": 120.4,
        "max_temp_celsius": 122.1,
        "mean_temp_celsius": 121.2,
        "max_deviation_celsius": 1.0,
        "within_tolerance": true,
        "data_points": 7200
      },
      {
        "cycle_number": 3,
        "cycle_id": "CYCLE-003",
        "phase": "COOL_DOWN",
        "start_time": "2026-04-27T07:45:00Z",
        "end_time": "2026-04-27T08:30:00Z",
        "setpoint_celsius": null,
        "min_temp_celsius": 22.1,
        "max_temp_celsius": 121.1,
        "mean_temp_celsius": 58.4,
        "max_deviation_celsius": null,
        "within_tolerance": true,
        "data_points": 5400
      }
    ],

    "validation_summary": {
      "overall_result": "PASS",
      "protocol_requirements_met": true,
      "cycles_within_tolerance": 3,
      "cycles_outside_tolerance": 0,
      "critical_deviations": [],
      "min_hold_temp_achieved": 120.4,
      "required_hold_temp": 121.1,
      "hold_temp_achieved": true,    // min >= required - 1.0°C tolerance
      "ich_q7_compliant": true,
      "gamp5_category": "4"
    },

    "anomalies": [],
    "parsed_at": "2026-04-27T10:17:45Z",
    "parser_version": "thermal-parser-v2.1.0"
  }
}
```

---

## 9. Multipart upload coordination

### 9.1 Initiating multipart upload

When `multipart: true` is set at Initiate, S3 multipart upload is used. The
server calls `CreateMultipartUpload` and returns per-part pre-signed URLs
(one per `part_count`). Parts must be uploaded in parallel or sequentially by
the client; S3 does not enforce order but the server requires ETags in
correct `part_number` order at Confirm.

### 9.2 Part size constraints

- Minimum part size (except last part): 5 MB (S3 requirement).
- Maximum part size: 5 GB (S3 limit).
- Recommended part size: 64 MB (balances parallelism and retry overhead).
- Maximum parts: 10,000 (S3 limit; enforced at Initiate).

### 9.3 Abort endpoint

**DELETE /api/v1/files/upload/{upload_id}**

Aborts a multipart upload in progress (`PENDING_UPLOAD` or `UPLOADED` state).
Calls `AbortMultipartUpload` on S3 to release part storage. Returns HTTP 204.
Not available once Confirm has been called (SCANNING or later states).

### 9.4 Resume support

Pre-signed part URLs issued at Initiate include a 90-minute expiry for large
files. If a part URL expires before upload, the caller may request a fresh URL
set:

**POST /api/v1/files/upload/{upload_id}/refresh-urls**

Returns fresh pre-signed URLs only for parts that have not yet been uploaded
(determined by listing S3 multipart parts). Already-uploaded parts are omitted.

---

## 10. List files for a record

**GET /api/v1/records/{record_kind}/{record_id}/files**

Returns all confirmed (CLEAN) files attached to a record, optionally filtered
by evidence class or state.

#### Query parameters

| Parameter | Type | Default | Description |
|---|---|---|---|
| `evidence_class` | string | — | Filter by H4 evidence class code |
| `state` | string | CLEAN | CLEAN \| QUARANTINED \| SCANNING \| ALL |
| `limit` | integer | 25 | Page size (max 100) |
| `cursor` | string | — | Pagination cursor |

#### Response (HTTP 200)

```jsonc
{
  "record_kind": "NQCASE",
  "record_id": "nqc-2026-00441",
  "total_files": 4,
  "files": [
    {
      "file_id": "fil-01JQK9Z8TVNPM2WXQ3RDES4KA1",
      "filename": "inspection-photo-01.jpg",
      "content_type": "image/jpeg",
      "size_bytes": 4204800,
      "evidence_class": "EC-01",
      "state": "CLEAN",
      "confirmed_at": "2026-04-27T10:16:44Z",
      "uploaded_by": "Nguyen Thi Lan",
      "worm_state": "LOCKED",
      "itar_classified": false
    }
    // ...
  ],
  "next_cursor": null
}
```

---

## 11. SLO table

| SLO | Target | Measurement | Degraded threshold |
|---|---|---|---|
| Initiate latency (p95) | < 300 ms | Server-side, excl. network | > 500 ms |
| Initiate latency (p99) | < 600 ms | Server-side | > 1 s |
| Confirm pre-check latency (p95) | < 500 ms | Server-side, excl. S3 HeadObject | > 1 s |
| S3 HeadObject call (p95) | < 200 ms | AWS SDK call | > 500 ms |
| Scan pipeline completion (p50) | < 30 s | Initiation to CLEAN state | > 60 s |
| Scan pipeline completion (p95) | < 120 s | | > 300 s |
| Scan pipeline completion (p99) | < 300 s | Large files (>100 MB) | > 600 s |
| Download URL issuance (p95) | < 150 ms | | > 300 ms |
| WORM lock application (p95) | < 500 ms | After clean scan | > 1 s |
| Metadata endpoint (p95) | < 100 ms | Cached metadata | > 200 ms |
| FAI bubble extraction (p50) | < 90 s | AI-08 job completion | > 180 s |
| Biocomp parse (p95) | < 10 s | Server-side PDF parse | > 30 s |
| Thermal cycle parse (p95) | < 5 s | CSV/Parquet parse | > 15 s |
| Quarantine on virus detect | < 5 s | From scan complete | > 10 s |
| ITAR watermark generation | < 3 s | On-demand per download | > 8 s |
| Upload availability | 99.9% | Monthly | < 99.5% |

---

## 12. Observability

### 12.1 Structured log fields

Every E12 log line includes:

```jsonc
{
  "service": "hesem-file-upload",
  "trace_id": "01JQK9...",
  "upload_id": "upl-...",
  "file_id": "fil-...",        // null until confirmed
  "record_kind": "NQCASE",
  "record_id": "nqc-...",
  "evidence_class": "EC-01",
  "user_id": "usr-...",
  "state_transition": "SCANNING → CLEAN",
  "duration_ms": 28400,
  "scan_engine": "ClamAV 1.4.1",
  "itar_classified": false,
  "pack_hint": null,
  "file_size_bytes": 4204800
}
```

### 12.2 Metrics

| Metric | Type | Labels |
|---|---|---|
| `file_upload_initiations_total` | Counter | `record_kind`, `evidence_class`, `multipart` |
| `file_upload_confirm_total` | Counter | `outcome` (CLEAN/QUARANTINED/REJECTED) |
| `file_scan_duration_seconds` | Histogram | `engine`, `result` |
| `file_content_inspection_total` | Counter | `check`, `result` |
| `file_worm_lock_applied_total` | Counter | `evidence_class`, `lock_mode` |
| `file_itar_access_total` | Counter | `action` (download/inspect), `watermarked` |
| `file_fai_extraction_duration_seconds` | Histogram | `ai08_model_version` |
| `file_quarantine_active_count` | Gauge | — |
| `file_upload_size_bytes` | Histogram | `evidence_class`, `content_type` |

### 12.3 Distributed tracing

All E12 operations propagate W3C Trace Context headers. Spans are created for:
- `file.upload.initiate`
- `file.upload.confirm.preheck`
- `file.scan.primary_av`
- `file.scan.secondary_av`
- `file.content_inspection.<check_name>`
- `file.worm.apply`
- `file.evidence.link`
- `file.intoto.attest`
- `file.ai08.fai_extract`
- `file.itar.watermark`

---

## 13. Operational runbook

### 13.1 ClamAV signature staleness

**Symptom:** `SCAN_ENGINE_STALE` errors in scan worker logs; Confirm returns
HTTP 503.

**Action:**
1. SSH to `hesem-av-worker` pod; run `freshclam --verbose`.
2. If freshclam fails (mirror unreachable), check egress firewall rules for
   port 443 to `database.clamav.net`.
3. If freshclam succeeds, restart scan worker: `kubectl rollout restart
   deployment/hesem-av-worker`.
4. Monitor `file_scan_duration_seconds` metric; confirm jobs resume within 5
   minutes.

### 13.2 Quarantine spike investigation

**Symptom:** `file_quarantine_active_count` rises unexpectedly; E10 sends
multiple quarantine notifications.

**Action:**
1. Query `file_quarantine_log` for `virus_name` distribution — mass quarantines
   from a single signature may indicate a false positive.
2. If false positive suspected: isolate a sample file; submit to ClamAV
   community false-positive reporting; escalate to Data Platform Lead.
3. Genuine malware: follow incident response procedure IR-001; notify
   Compliance Lead and CISO; do not release quarantined files.

### 13.3 S3 Object Lock errors

**Symptom:** WORM lock application fails (`file.worm.apply` span shows error);
file remains in SCANNING state indefinitely.

**Action:**
1. Check AWS CloudTrail for `PutObjectRetention` failures on the evidence
   bucket.
2. Verify IAM role attached to hesem-api has `s3:PutObjectRetention` and
   `s3:PutObjectLegalHold` on `arn:aws:s3:::hesem-evidence-bucket/*`.
3. Verify bucket has Object Lock enabled (cannot be enabled retroactively;
   must be set at bucket creation — see infrastructure IaC in `infra/s3/`).
4. Manual recovery: if confirmed CLEAN but WORM failed, Data Platform Lead
   can trigger `POST /api/v1/internal/files/{file_id}/reapply-worm` (internal
   admin endpoint, not exposed externally).

### 13.4 AI-08 FAI extraction timeout

**Symptom:** `fai_extraction_state` stuck at `PENDING` beyond 10 minutes;
`file_fai_extraction_duration_seconds` p99 exceeds 600 s.

**Action:**
1. Check AI-08 service health: `GET https://hesem-ai08.internal/health`.
2. If AI-08 is down, FAI bubble endpoint returns `extraction_state: "PENDING"`
   indefinitely; inform users via status page.
3. If AI-08 is up but slow: check GPU resource utilisation on AI-08 worker
   nodes; consider scaling up model replicas.
4. Force retry: `POST /api/v1/internal/files/{file_id}/retry-fai-extract`
   (internal admin endpoint).

### 13.5 ITAR watermark proxy failure

**Symptom:** ITAR-cleared users receive HTTP 502 on download of ITAR files.

**Action:**
1. Check `hesem-watermark-proxy` pod health.
2. Watermark proxy depends on the PDF manipulation library (pdfcpu); if pod
   OOM-killed by large files, increase memory limit.
3. Temporary workaround: Compliance Lead may issue a time-bounded direct S3
   pre-signed URL via `POST /api/v1/internal/files/{file_id}/emergency-download`
   (requires dual-approval from Compliance Lead + Data Platform Lead; every
   use is logged to E6 with mandatory audit note).

---

## 14. Database tables

| Table | Purpose |
|---|---|
| `file_upload` | Upload lifecycle record (upload_id, state, s3_key, declared metadata) |
| `file_confirmed` | Confirmed file record (file_id, sha256, worm lock details, evidence links) |
| `file_scan_result` | Per-scan pipeline results (AV engines, content inspection checks) |
| `file_quarantine_log` | Quarantine events (virus name, quarantine bucket key, auto-delete date) |
| `file_legal_hold_log` | Legal hold SET/CLEAR events with actor and reason |
| `file_itar_scan_result` | ITAR keyword scan results per file (keyword_id, severity, page, excerpt) |
| `file_biocomp_extraction` | Biocomp parse results per EC-17 file |
| `file_fai_extraction_result` | FAI bubble extraction results per EC-18 file (AI-08 output) |
| `file_ccp_classification` | CCP photo classification results per EC-01/J5 file |
| `file_thermal_parse` | Thermal cycle parse results per EC-22 file |
| `file_version` | Version history linking superseded file_ids |
| `file_evidence_link` | Many-to-many: file_id ↔ evidence_id (H4 evidence class rows) |

---

## 15. Security controls summary

| Control | Implementation |
|---|---|
| Pre-signed URL scoping | URL bound to specific S3 key; expires in 15 min (single-part) or 90 min (multipart) |
| Hash verification | SHA-256 recomputed server-side at Confirm; mismatch = REJECTED |
| Magic byte enforcement | libmagic validation against declared content_type |
| Virus scan | ClamAV primary + secondary; both must pass; quarantine on any detection |
| ITAR access control | HTTP 451 for non-ITAR_CLEARED; all access logged to E6 |
| ITAR watermark | Per-download injection; never stored; user identity + timestamp in overlay |
| WORM COMPLIANCE lock | S3 Object Lock COMPLIANCE mode; retain-until per H5; irreversible |
| Legal hold | S3 PutObjectLegalHold; requires COMPLIANCE_LEAD role; dual-logged |
| Quarantine isolation | Quarantine bucket with GOVERNANCE lock (30 day); no external read access |
| in-toto provenance | Attestation link created at Confirm; chain verifiable offline |
| ITAR keyword scan | Trie-based scanner against `itar_keyword_catalog`; FAIL = REJECTED |
| FAI access restriction | AI-08 FAI results additionally restricted to ITAR_CLEARED for J3 files |
| Audit trail | All state transitions and access events emitted to E6 audit chain |

---

## 16. Integration cross-references

| System | Integration point |
|---|---|
| E8 Evidence API | E12 returns `file_id`; E8 attaches it to an evidence row on confirmation |
| E6 Audit API | All state transitions, ITAR access, legal hold changes emitted as events |
| E10 Notification API | Quarantine and rejection events trigger notifications |
| H4 Evidence Class definitions | Allow-list, MIME types, mandatory fields per class |
| H5 Retention Schedule | WORM retain-until date computation per evidence class |
| I7 Content Inspection Policy | Keyword catalog, file-type rules, biocomp validation spec |
| AI-08 FAI Extraction Service | gRPC/REST call for bubble extraction; callback registration |
| B6 Storage Infrastructure | S3 bucket provisioning, Object Lock configuration, IAM roles |
| I4 WORM Policy Engine | Retention floor enforcement; legal hold approval workflow |

---

`S3-05_E12_FILE_UPLOAD_DEEP_UPGRADE_COMPLETE`

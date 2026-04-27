# E8 — Evidence API  ·  V10 Deep-Upgrade

```
api_family:      Evidence Records
owner_role:      Compliance Lead with Data Platform Lead
scope:           Read + governed-write across all 38 H4 evidence classes;
                 integrity verification; freshness query; WORM lifecycle
                 visibility; audit-pack assembly entry; customer CVLP;
                 auditor + inspector + regulator portal evidence delivery;
                 H4 §3 composition gate enforcement; restricted red-team class
sources:         21 CFR 11.10(b) accurate copies + 11.10(c) record protection;
                 EU GMP Annex 11 §8 printouts + §9 audit trails + §11 batch
                 release; ISO 13485 §4.2.5 documented information; AS9100D
                 §8.1 operation planning; IATF 16949 §10.2.3 nonconformance
                 records; FSMA §204 traceability; in-toto 1.0 provenance;
                 OpenAPI 3.1.1; RFC 9457; RFC 7232; RFC 8594
```

The Evidence API is the single canonical read/write surface for all evidence
classes defined in H4. It serves the record-shell evidence tab (F5), audit
pack assembly (H3 §4), the customer CVLP transparency portal (H2 §14), the
auditor portal (H3 §7), and all inspector-facing read interfaces. Every
evidence write path enforces the composition gate (H4 §3) before allowing a
regulated decision to commit. Evidence once written is append-only; a
supersession creates a new record linked to the prior; deletion is prohibited
except under legal-hold-release with Compliance counter-sign.

---

## 1. Purpose and scope

### 1.1 In scope

- Retrieve evidence by `evidence_id` or by `(root_kind, root_id)` record
- Filter by evidence class (EC-01..EC-38) across records with full cursor pagination
- Integrity verification: hash recomputation + anchor chain lookup
- Attach new evidence on governed write paths (class-specific RACI per H4 §9)
- Freshness query per H2 §13 maturity decay model
- WORM lock status per evidence record (lock authority, declared retention, legal-hold)
- Audit pack export launch (LRO per E13) with signed archive delivery
- Customer CVLP delivery scoped per H2 §14 transparency tiers
- Auditor portal scoped read with token binding
- Per-pack evidence class filters (J1-J5 specific class unlocks)
- Restricted red-team evidence access (governance-gated)
- Composition gate check: pre-commit enforcement per H4 §3

### 1.2 Out of scope

- WORM lock writing at storage layer (B6 + I4)
- Retention floor policy declarations (H5)
- Notification on stale evidence (E10)
- AI-generated evidence emission (E9 — Evidence Inference)
- Audit event chain management (E6)

### 1.3 Regulatory obligations

| Regulation | Obligation | Mapped requirement |
|---|---|---|
| 21 CFR 11.10(b) | Accurate and complete copies of records | §2.1 retrieve + §2.8 audit-pack |
| 21 CFR 11.10(c) | Record protection throughout retention | §2.7 WORM retention |
| EU GMP Annex 11 §8 | Printouts must reflect most-current data | §2.1 + §2.6 freshness |
| EU GMP Annex 11 §9 | Audit trail must be retained and accessible | §2.10 auditor portal |
| EU GMP Annex 11 §11 | Batch release evidence must be complete | §3.2 composition gate |
| ISO 13485 §4.2.5 | Control of documented information | §2.7 + §2.9 |
| AS9100D §8.1 | Operation planning output as records | §3.1 class EC-09 |
| IATF 16949 §10.2.3 | Nonconformance evidence retention | §3.1 class EC-14 |
| FSMA §204 | Traceability lot evidence with 24h retrieval | §2.1 + §2.3 |

---

## 2. Endpoint contracts

### 2.1 Retrieve evidence by id

```
PATH        GET /v1/evidence/{evidence_id}
AUTH        Bearer; tenant scope via RLS; AAL1 minimum (AAL2 for restricted)
```

**Request path parameter:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `evidence_id` | UUID | Yes | Unique evidence record identifier |

**Query parameters:**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `include_content` | boolean | true | Include full canonical field payload |
| `include_chain` | boolean | false | Include prior_evidence_id chain link |
| `include_worm` | boolean | false | Include WORM lock detail |
| `verify_on_read` | boolean | false | Trigger re-verification before return (adds ~200ms) |

**Response 200 `application/json`:**

```jsonc
{
  "evidence_id": "ev-uuid",
  "class_code": "EC-05",
  "class_name": "Instrument Calibration Record",
  "subtype": "external_lab",
  "root_kind": "INSP",
  "root_id": "insp-uuid",
  "recorded_at": "2025-11-14T08:22:00Z",
  "recorded_by": "principal-uuid",
  "recorded_by_role": "QA Engineer",
  "content": {
    /* canonical fields per H4 §2 schema for EC-05 */
    "instrument_id": "inst-uuid",
    "calibration_date": "2025-11-10",
    "due_date": "2026-11-10",
    "certificate_ref": "CAL-2025-1234",
    "accreditation_body": "A2LA",
    "pass_fail": "PASS",
    "measurement_uncertainty": "±0.02°C",
    "lab_name": "Acme Metrology Lab"
  },
  "content_hash": "sha256:abcdef...",
  "signature_ref": "sig-uuid",           /* null if unsigned class */
  "prior_evidence_id": null,             /* null if not a supersession */
  "anchor_ref": "anchor-2025-11-14",
  "anchor_state": "ANCHORED",            /* PENDING | ANCHORED | ANCHOR_FAILED */
  "verification_state": "VERIFIED",      /* VERIFIED | MISMATCH | PENDING */
  "retention_class": "RC-7Y",
  "worm_lock_state": "LOCKED",           /* LOCKED | PENDING | UNLOCKED */
  "worm_lock_authority": "S3-OBJECT-LOCK",
  "legal_hold_active": false,
  "restricted_access": false,
  "pack_tags": ["J4_MDR"],               /* non-empty for pack-specific evidence */
  "_links": {
    "self": "/v1/evidence/ev-uuid",
    "record": "/v1/records/INSP/insp-uuid",
    "verify": "/v1/evidence/ev-uuid/verify",
    "retention": "/v1/evidence/ev-uuid/retention",
    "audit": "/v1/audit/evidence/ev-uuid"
  }
}
```

**Error responses:**

| Status | Condition |
|---|---|
| 401 | Missing or invalid bearer token |
| 403 | Evidence is restricted class — caller lacks red-team role |
| 404 | Evidence record not found or outside tenant scope |
| 410 | Evidence deleted under legal-hold-release (reason URI returned) |
| 503 | WORM backend unavailable — integrity cannot be guaranteed |

**Audit emit:** `EC-22 access_audit` on every read; AAL2-gated restricted access emits `EC-38 restricted_access_audit`.

**SLO:** p50 < 80ms, p95 < 250ms.

---

### 2.2 List evidence for a record

```
PATH        GET /v1/evidence/record/{root_kind}/{root_id}
AUTH        Bearer; tenant RLS; AAL1
```

**Query parameters:**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `class_filter` | string[] | all | EC-01..EC-38 to include |
| `status` | string | active | `active` / `superseded` / `all` |
| `after` | cursor | - | Pagination cursor |
| `limit` | integer | 50 | Max 200 |
| `sort` | string | `-recorded_at` | Sort field prefix `-` for desc |
| `include_restricted` | boolean | false | Include restricted classes (requires red-team role) |

**Response 200:**

```jsonc
{
  "root_kind": "NQCASE",
  "root_id": "nqc-uuid",
  "total_count": 14,
  "per_class_counts": {
    "EC-01": 3,
    "EC-14": 2,
    "EC-17": 1,
    /* ... */
  },
  "items": [
    {
      "evidence_id": "ev-uuid-1",
      "class_code": "EC-01",
      "class_name": "Photographic / Video Evidence",
      "subtype": "incoming_inspection_photo",
      "recorded_at": "2025-11-10T10:00:00Z",
      "anchor_state": "ANCHORED",
      "verification_state": "VERIFIED",
      "restricted_access": false,
      "_links": { "self": "/v1/evidence/ev-uuid-1" }
    }
    /* ... */
  ],
  "pagination": {
    "next_cursor": "cursor-opaque",
    "has_more": true
  }
}
```

**SLO:** p95 < 350ms. **Rate limit:** 120 req/min per tenant.

---

### 2.3 Filter evidence by class

```
PATH        GET /v1/evidence
AUTH        Bearer; tenant RLS; AAL1
```

**Query parameters:**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `class` | string | Yes | EC-01..EC-38 |
| `subtype` | string | No | Sub-class filter |
| `root_kind` | string | No | Filter to one root type |
| `recorded_from` | ISO8601 | No | Start of time window |
| `recorded_to` | ISO8601 | No | End of time window |
| `status` | string | No | `active` / `superseded` |
| `anchor_state` | string | No | `ANCHORED` / `PENDING` / `ANCHOR_FAILED` |
| `verification_state` | string | No | `VERIFIED` / `MISMATCH` / `PENDING` |
| `pack_tag` | string | No | J1..J5 pack filter |
| `after` | cursor | No | Pagination |
| `limit` | integer | No | Default 50, max 500 |

**Response 200:** Same item shape as §2.2 with cross-record root refs included.

**Rate limit:** 20 req/min per tenant (resource-intensive). Requests beyond limit return `429` with `Retry-After` header.

**Audit emit:** `EC-22 access_audit` sampled at 10% for list endpoints; 100% when `class` is a restricted class.

---

### 2.4 Verify evidence integrity

```
PATH        POST /v1/evidence/{evidence_id}/verify
AUTH        Bearer; AAL1 minimum; AAL2 for restricted classes
METHOD      POST (idempotent-safe by design; POST to avoid caching)
```

**Request body:** Empty (`{}`).

**Verification algorithm (server side):**

1. Retrieve `content` payload from evidence store.
2. Recompute `content_hash = SHA-256(canonical_json(content))`.
3. Compare recomputed hash against stored `content_hash` field.
4. If signed: retrieve `signature_ref`, verify Ed25519 or ML-DSA-65 signature against `content_hash` using signer's current public key from key-ring (step-up if key has rotated — check `signing_key_version`).
5. Retrieve `anchor_ref` from current Merkle anchor set (E6 §3.3). Recompute Merkle path to confirm inclusion proof.
6. Check `prior_evidence_id` chain continuity if evidence is a supersession.
7. Emit verification event to audit log.

**Response 200 (pass):**

```jsonc
{
  "evidence_id": "ev-uuid",
  "verification_result": "PASS",
  "hash_match": true,
  "signature_valid": true,
  "anchor_included": true,
  "chain_continuous": true,
  "verified_at": "2025-11-14T09:00:00Z",
  "verification_id": "ver-uuid"
}
```

**Response 200 (mismatch — integrity violation):**

```jsonc
{
  "evidence_id": "ev-uuid",
  "verification_result": "MISMATCH",
  "hash_match": false,
  "hash_expected": "sha256:abcdef...",
  "hash_actual": "sha256:123456...",
  "signature_valid": null,
  "anchor_included": false,
  "mismatch_categories": ["CONTENT_HASH", "ANCHOR_MISSING"],
  "incident_ref": "INC-2025-0821",
  "quarantine_applied": true
}
```

**On mismatch:** Automatic SEV-1 incident creation per runbook RB-INC; evidence scope quarantined (reads blocked for non-Compliance roles); Compliance + Security on-call paged within 5 minutes.

**SLO:** p95 < 1 second per verification. **Rate limit:** 60 req/min per tenant.

---

### 2.5 Attach new evidence (governed)

```
PATH        POST /v1/evidence
AUTH        Bearer; AAL2 minimum; class-specific RACI per H4 §9
```

**Request body `application/json`:**

```jsonc
{
  "class_code": "EC-07",                    /* Required: H4 class code */
  "subtype": "acceptance_test",             /* Required: per-class subtype enum */
  "root_kind": "JO",                        /* Required: target authoritative record kind */
  "root_id": "jo-uuid",                     /* Required */
  "content": {                              /* Required: per-class canonical field payload */
    /* EC-07 Test Result fields */
    "test_plan_ref": "TP-2025-0044",
    "test_suite": "FAT-HYDRAULIC",
    "result": "PASS",
    "executed_at": "2025-11-12T14:00:00Z",
    "executed_by": "principal-uuid",
    "measured_values": [
      { "parameter": "pressure_psi", "value": 3200, "spec_min": 3000, "spec_max": 3500 }
    ],
    "deviations": []
  },
  "prior_evidence_id": null,                /* Non-null = supersession of prior */
  "pack_tags": ["J3_AS9100D"],              /* Optional: pack classification */
  "attach_reason": "Post-FAT completion"    /* Audit reason text */
}
```

**Idempotency:** `Idempotency-Key` header required. Duplicate key returns the original response without re-write.

**Precondition checks (400/403 if fail):**

1. Caller has H4 §9 RACI authority for `class_code` attach.
2. For restricted classes (EC-30..EC-38): caller holds red-team role AND active Compliance countersign token.
3. `root_kind` + `root_id` record exists and is in an evidence-attachable state (not in `VOIDED` lifecycle).
4. Composition gate check: if this attach would satisfy a gating requirement for a pending regulated decision, gate state is updated (§3.2).
5. `content` validates against per-class JSON Schema per H4 §2.
6. Retention floor: declared class retention ≥ policy minimum for record's regulation profile.

**Response 201:**

```jsonc
{
  "evidence_id": "ev-uuid-new",
  "class_code": "EC-07",
  "anchor_state": "PENDING",
  "anchor_eta": "2025-11-15T00:00:00Z",
  "worm_lock_state": "PENDING",
  "composition_gate_updated": true,
  "composition_gate_state": {
    "decision_ref": "bd-pending-uuid",
    "gate_satisfied": false,
    "missing_classes": ["EC-08"]
  },
  "_links": {
    "self": "/v1/evidence/ev-uuid-new",
    "verify": "/v1/evidence/ev-uuid-new/verify",
    "record": "/v1/records/JO/jo-uuid"
  }
}
```

**SLO:** p95 write path < 500ms. Write confirmed to PostgreSQL + WORM queue before returning 201.

---

### 2.6 Query evidence freshness

```
PATH        GET /v1/evidence/freshness/{root_kind}/{root_id}
AUTH        Bearer; AAL1; tenant RLS
```

**Query parameters:**

| Parameter | Type | Description |
|---|---|---|
| `regulation_profile` | string | Override regulation profile (default: derived from record) |
| `as_of` | ISO8601 | Compute freshness as of this point in time |

**Response 200:**

```jsonc
{
  "root_kind": "BREL",
  "root_id": "brel-uuid",
  "regulation_profile": "EU_GMP_ANNEX11",
  "required_classes": [
    {
      "class_code": "EC-04",
      "class_name": "Electronic Batch Record",
      "freshness_floor_days": 0,
      "last_recorded_at": "2025-11-10T06:00:00Z",
      "status": "CURRENT",
      "next_decay_at": null
    },
    {
      "class_code": "EC-05",
      "class_name": "Instrument Calibration Record",
      "freshness_floor_days": 365,
      "last_recorded_at": "2024-11-10T08:00:00Z",
      "status": "EXPIRING",
      "next_decay_at": "2025-11-10T08:00:00Z",
      "maturity_impact": "L6_to_L5_demotion_risk"
    },
    {
      "class_code": "EC-03",
      "class_name": "Training Record",
      "freshness_floor_days": 180,
      "last_recorded_at": null,
      "status": "STALE",
      "stale_since": null,
      "maturity_impact": "BLOCKS_RELEASE_GATE"
    }
  ],
  "overall_freshness": "STALE",
  "release_gate_blocked": true,
  "maturity_level_current": "L5",
  "maturity_level_at_risk": "L4",
  "evaluated_at": "2025-11-14T09:00:00Z"
}
```

**SLO:** p95 < 250ms. **Rate limit:** 300 req/min.

---

### 2.7 WORM retention status

```
PATH        GET /v1/evidence/{evidence_id}/retention
AUTH        Bearer; AAL1
```

**Response 200:**

```jsonc
{
  "evidence_id": "ev-uuid",
  "class_code": "EC-04",
  "retention_class": "RC-15Y",
  "retention_years": 15,
  "regulation_source": "EU_GMP_ANNEX11_ART11",
  "worm_lock_state": "LOCKED",
  "worm_lock_authority": "S3-OBJECT-LOCK",
  "worm_lock_mode": "COMPLIANCE",
  "worm_lock_until": "2040-11-10T00:00:00Z",
  "legal_hold_active": false,
  "legal_hold_reason": null,
  "legal_hold_authority": null,
  "deletion_eligible": false,
  "deletion_eligible_after": "2040-11-10T00:00:00Z",
  "deletion_requires_countersign": true,
  "deletion_countersign_roles": ["Compliance Lead", "Legal Counsel"],
  "storage_backend": "s3://hesem-evidence-worm/tenant-id/ec-04/",
  "backend_object_key": "ev-uuid.json.enc"
}
```

**Error responses:**

| Status | Condition |
|---|---|
| 404 | Evidence not found |
| 503 | WORM backend unavailable |

**Rate limit:** 120 req/min.

---

### 2.8 Audit pack export (LRO)

```
PATH        POST /v1/evidence/audit-pack
AUTH        Bearer; AAL2; Compliance Lead or Audit Manager role
```

**Request body:**

```jsonc
{
  "scope": {
    "tenant_id": "tenant-uuid",
    "time_from": "2025-01-01T00:00:00Z",
    "time_to":   "2025-12-31T23:59:59Z",
    "root_kinds": ["NQCASE", "CAPA", "BREL"],  /* null = all */
    "class_codes": null,                         /* null = all non-restricted */
    "regulation_profile": "FDA_21CFR11",
    "include_restricted": false
  },
  "sample_plan": {
    "strategy": "ALL",              /* ALL | STRATIFIED | RISK_BASED */
    "max_records": null
  },
  "output_format": "SIGNED_ARCHIVE",   /* SIGNED_ARCHIVE | PDF_BUNDLE | JSON_STREAM */
  "pack_tags": ["J1_PHARMA"]
}
```

**Response 202 (LRO accepted):**

```jsonc
{
  "job_id": "ap-job-uuid",
  "status": "ACCEPTED",
  "estimated_completion": "2025-11-14T21:00:00Z",
  "_links": {
    "status": "/v1/lro/ap-job-uuid",
    "cancel": "/v1/lro/ap-job-uuid/cancel"
  }
}
```

**LRO completion response (via poll or webhook):**

```jsonc
{
  "job_id": "ap-job-uuid",
  "status": "COMPLETE",
  "archive_url": "https://storage.hesem.io/signed-url-expiring-1h",
  "archive_sha256": "sha256:...",
  "archive_signed_by": "compliance-hsm-key-v3",
  "record_count": 842,
  "evidence_count": 4183,
  "class_coverage": { "EC-01": 214, "EC-04": 88 /* ... */ },
  "completed_at": "2025-11-14T20:55:00Z"
}
```

**SLO-15:** p95 audit pack export ≤ 24 hours. **Rate limit:** 5 concurrent jobs per tenant.

---

### 2.9 Customer CVLP delivery

```
PATH        GET /v1/evidence/cvlp/{root_kind}/{root_id}
AUTH        Bearer; customer-portal token; CVLP tier per H2 §14
```

**CVLP transparency tiers:**

| Tier | Evidence classes visible | Condition |
|---|---|---|
| T1 Basic | EC-01 (photo), EC-07 (test result summary), EC-11 (CoA) | Default |
| T2 Standard | + EC-04 (eBR summary), EC-05 (cal cert), EC-10 (traceability) | Contractual |
| T3 Full Transparency | + EC-08 (process data), EC-09 (MES execution), EC-12 (SPC) | Partner audit |

**Response 200:**

```jsonc
{
  "root_kind": "JO",
  "root_id": "jo-uuid",
  "cvlp_tier": "T2",
  "customer_id": "cust-uuid",
  "evidence_items": [
    {
      "class_code": "EC-11",
      "class_name": "Certificate of Analysis",
      "visible_fields": ["lot_number", "test_results", "release_date", "qc_signature"],
      "redacted_fields": ["internal_batch_ref", "cost_centre"],
      "download_url": "/v1/evidence/cvlp/download/ev-uuid-11?token=...",
      "content_hash": "sha256:...",
      "signature_verified": true
    }
    /* ... */
  ],
  "generated_at": "2025-11-14T09:00:00Z",
  "expires_at": "2025-11-14T21:00:00Z"
}
```

**Field redaction:** Tier T1/T2 automatically redacts `internal_*` prefixed fields, cost centres, supplier pricing, and ITAR-controlled technical parameters. Tier T3 redaction list is customer-contractual.

**SLO:** p95 < 500ms. **Rate limit:** 60 req/min per customer token.

---

### 2.10 Auditor portal scoped read

```
PATH        GET /v1/evidence/auditor/{audit_session_id}
AUTH        Bearer; auditor-portal token (scoped to audit session + time window)
```

**Query parameters:**

| Parameter | Type | Description |
|---|---|---|
| `class` | string | EC code filter |
| `root_kind` | string | Record kind filter |
| `after` | cursor | Pagination |
| `limit` | integer | Max 500 per page |

**Auditor session token properties:**

- Issued by `POST /v1/auth/auditor-session` with Compliance Lead countersign
- Token encodes: `tenant_id`, `time_from`, `time_to`, `allowed_classes[]`, `auditor_id`, `audit_body` (FDA / Notified Body / ISO CB)
- All reads during session recorded to dedicated auditor access log (immutable, separate from main audit chain)
- Session expires at `time_to` or after 8 hours inactivity

**Response 200:** Same structure as §2.2 list, scoped to session parameters. Restricted classes (EC-30..EC-38) never visible to auditor portal regardless of session token.

**SLO:** p95 < 400ms.

---

### 2.11 Per-pack evidence filter

```
PATH        GET /v1/evidence/pack/{pack_code}
AUTH        Bearer; pack-enabled tenant; AAL1
```

**Pack codes:** `J1` (Pharmaceutical), `J2` (Automotive), `J3` (Aerospace & Defense), `J4` (Medical Device), `J5` (Food Safety).

Returns evidence items tagged with `pack_tags` matching the given pack, across all records in tenant scope. Supports same query parameters as §2.3 with addition of `class_override` to access pack-exclusive evidence classes.

**Response:** Paginated list with per-class counts per pack. Each item includes `pack_specific_fields` block with pack-canonical additions (e.g., J1: `batch_number`, `INN_name`; J3: `DO_number`, `ITAR_classification`).

**SLO:** p95 < 500ms.

---

### 2.12 Restricted red-team evidence (governance-gated)

```
PATH        GET /v1/evidence/restricted/{evidence_id}
AUTH        Bearer; AAL3 (hardware token mandatory); red-team role
ADDITIONAL  Active countersign token from Compliance Lead (separate request)
```

**Restricted class codes:** EC-30 (Adversarial Test Result), EC-31 (Red-Team Execution Log), EC-32 (Vulnerability Disclosure Record), EC-33 (Penetration Test Report), EC-34 (Security Scan Output), EC-35 (Threat Model Evidence), EC-36 (Incident Forensic Artifact), EC-37 (SIEM Export Evidence), EC-38 (Restricted Access Audit Log).

**Access governance:**

1. Caller presents AAL3 hardware token (FIDO2 hardware key or PIV/CAC).
2. Server verifies active Compliance countersign session (`POST /v1/compliance/countersign` by Compliance Lead, valid 4 hours).
3. Access reason text logged immutably before returning content.
4. All restricted-class reads emitted as EC-38 `restricted_access_audit` events to the audit chain.
5. IP address and device fingerprint recorded for every access.
6. Download blocked — API returns in-memory JSON only. No signed download URLs for restricted classes.

**Response 200:** Full evidence record with content. Watermarked with `accessed_by`, `accessed_at`, `access_reason` in response envelope.

**Error responses:**

| Status | Condition |
|---|---|
| 403 | Missing red-team role or no active countersign |
| 423 | Evidence under active legal hold — only Legal Counsel can access |
| 451 | ITAR restriction — only cleared personnel may access |

---

## 3. Core specifications

### 3.1 H4 Evidence class catalog (38 classes)

All 38 evidence classes defined in H4, with schema root, RACI attach role, regulatory linkage, retention class, and WORM mode:

| Code | Name | Schema root | Attach role | Regulation | Retention | WORM mode |
|---|---|---|---|---|---|---|
| EC-01 | Photographic / Video Evidence | `photo_evidence` | QA Engineer | All | RC-5Y | GOVERNANCE |
| EC-02 | Scanned Document | `scan_evidence` | Document Controller | 21 CFR 11 | RC-5Y | GOVERNANCE |
| EC-03 | Training Completion Record | `training_evidence` | HR / Training Lead | ISO 13485 §6.2 | RC-5Y | GOVERNANCE |
| EC-04 | Electronic Batch Record (eBR) | `ebr_evidence` | Batch Release Officer | EU GMP Annex 11 §11 | RC-15Y | COMPLIANCE |
| EC-05 | Instrument Calibration Record | `calibration_evidence` | Metrology Technician | ISO 13485 §7.6 | RC-7Y | GOVERNANCE |
| EC-06 | Environmental Monitoring Result | `env_monitor_evidence` | EHS Coordinator | EU GMP Annex 11 §3 | RC-5Y | GOVERNANCE |
| EC-07 | Test / Acceptance Result | `test_result_evidence` | QA Engineer | AS9100D §8.1 | RC-10Y | GOVERNANCE |
| EC-08 | Process Data Snapshot | `process_data_evidence` | MES System / Operator | IATF 16949 §8.5 | RC-5Y | GOVERNANCE |
| EC-09 | MES Execution Log | `mes_exec_evidence` | MES System | FSMA §204 | RC-5Y | GOVERNANCE |
| EC-10 | Traceability / Lot Link | `traceability_evidence` | Inventory Controller | FSMA §204 / DSCSA | RC-7Y | GOVERNANCE |
| EC-11 | Certificate of Analysis (CoA) | `coa_evidence` | QC Lead | 21 CFR 211.192 | RC-7Y | GOVERNANCE |
| EC-12 | SPC / Statistical Evidence | `spc_evidence` | Process Engineer | IATF 16949 §9.1 | RC-5Y | GOVERNANCE |
| EC-13 | Supplier Qualification Record | `supplier_qual_evidence` | Procurement Lead | ISO 13485 §7.4 | RC-7Y | GOVERNANCE |
| EC-14 | Nonconformance Record Reference | `nc_ref_evidence` | QA Engineer | IATF 16949 §10.2 | RC-5Y | GOVERNANCE |
| EC-15 | CAPA Effectiveness Evidence | `capa_evidence` | CAPA Owner | 21 CFR 820.100 | RC-5Y | GOVERNANCE |
| EC-16 | Change Control Evidence | `change_evidence` | Change Control Officer | EU MDR Art.83 | RC-10Y | GOVERNANCE |
| EC-17 | Risk Assessment Record | `risk_evidence` | Risk Lead | ISO 14971 | RC-10Y | GOVERNANCE |
| EC-18 | Design Verification Evidence | `dv_evidence` | Design Engineer | ISO 13485 §7.3 | RC-15Y | COMPLIANCE |
| EC-19 | Design Validation Evidence | `val_evidence` | Validation Engineer | 21 CFR 820.75 | RC-15Y | COMPLIANCE |
| EC-20 | Software Validation Evidence | `sw_val_evidence` | Software QA | IEC 62304 | RC-10Y | GOVERNANCE |
| EC-21 | Customer Complaint Reference | `complaint_ref_evidence` | CX Quality Lead | 21 CFR 820.198 | RC-5Y | GOVERNANCE |
| EC-22 | Audit Access Log | `audit_access_evidence` | System (auto) | All (§2.1) | RC-7Y | COMPLIANCE |
| EC-23 | Deviation Record | `deviation_evidence` | QA Lead | EU GMP Annex 11 §9 | RC-5Y | GOVERNANCE |
| EC-24 | E-Signature Manifestation | `esig_evidence` | System (auto on sign) | 21 CFR 11.50 | RC-10Y | COMPLIANCE |
| EC-25 | Supplier Corrective Action | `scar_evidence` | Supplier Quality Eng | IATF 16949 §8.4 | RC-5Y | GOVERNANCE |
| EC-26 | Internal Audit Finding | `ia_finding_evidence` | Internal Auditor | ISO 13485 §8.2.2 | RC-5Y | GOVERNANCE |
| EC-27 | Management Review Output | `mgmt_review_evidence` | QMS Director | ISO 13485 §5.6 | RC-5Y | GOVERNANCE |
| EC-28 | Warranty / Field Return Data | `warranty_evidence` | Field Quality Engineer | 21 CFR 820.200 | RC-5Y | GOVERNANCE |
| EC-29 | FSCA / Recall Evidence | `fsca_evidence` | Regulatory Affairs | EU MDR Art.87 | RC-15Y | COMPLIANCE |
| EC-30 | Adversarial Test Result | `red_team_evidence` | Security Red Team | ITAR / SOC 2 | RC-7Y | COMPLIANCE |
| EC-31 | Red-Team Execution Log | `red_team_log` | Security Red Team | SOC 2 Type II | RC-5Y | COMPLIANCE |
| EC-32 | Vulnerability Disclosure Record | `vuln_disclosure` | CISO | CVD Policy | RC-5Y | COMPLIANCE |
| EC-33 | Penetration Test Report | `pentest_report` | Security Assessor | SOC 2 / ISO 27001 | RC-5Y | COMPLIANCE |
| EC-34 | Security Scan Output | `security_scan` | Security Platform | SOC 2 | RC-3Y | GOVERNANCE |
| EC-35 | Threat Model Evidence | `threat_model` | Security Architect | ISO 27005 | RC-5Y | COMPLIANCE |
| EC-36 | Incident Forensic Artifact | `forensic_artifact` | CSIRT | GDPR Art.33 | RC-5Y | COMPLIANCE |
| EC-37 | SIEM Export Evidence | `siem_export` | Security Operations | SOC 2 | RC-3Y | GOVERNANCE |
| EC-38 | Restricted Access Audit Log | `restricted_audit_log` | System (auto) | All (§2.12) | RC-7Y | COMPLIANCE |

**WORM modes:**

- `GOVERNANCE` — default WORM; deletable with Compliance countersign after retention floor expires
- `COMPLIANCE` — strict WORM; deletion permanently blocked even after retention; only legal-hold-release flow can reduce retention

---

### 3.2 H4 §3 Composition gate

The composition gate enforces that a regulated decision (per BD codes B1..B30 defined in E7) cannot commit unless the required evidence composition for the target record is satisfied.

**Gate algorithm:**

```
FUNCTION check_composition_gate(decision_ref, root_kind, root_id, bd_code):
  1. Load gate_config for bd_code from composition_gate_config table:
     → required_classes[]: mandatory EC codes
     → optional_classes[]: EC codes that improve maturity
     → minimum_freshness_days per class
     → regulation_profile: which freshness floor applies
     → all_required_fresh: boolean (true = all required must be CURRENT)

  2. For each class in required_classes:
     a. Query latest active evidence of class for (root_kind, root_id)
     b. Check freshness: (NOW - recorded_at) <= minimum_freshness_days
     c. Check verification_state == VERIFIED
     d. Check anchor_state == ANCHORED
     → If any check fails: add class to missing_or_stale list

  3. If missing_or_stale is non-empty:
     → gate_satisfied = false
     → block_commit = true (decision API returns 422 GATE_UNSATISFIED)
     → return { gate_satisfied: false, missing_classes: missing_or_stale }

  4. If all_required_fresh and any required class is EXPIRING (within 7 days):
     → emit WARNING event (does not block)

  5. gate_satisfied = true
  → return { gate_satisfied: true, maturity_score: compute_maturity(optional_classes) }
```

**BD code composition gate requirements (representative entries):**

| BD code | Decision name | Required classes | Freshness floor |
|---|---|---|---|
| BD-3 | Batch Release | EC-04, EC-05, EC-06, EC-11 | EC-04: 0d; EC-05: 365d; EC-06: 7d; EC-11: 0d |
| BD-7 | Design Transfer | EC-17, EC-18, EC-19, EC-20 | All: 0d |
| BD-11 | CAPA Closure | EC-14, EC-15 | EC-15: 0d (must be most recent) |
| BD-14 | Supplier Approval | EC-13, EC-25 | EC-13: 730d |
| BD-19 | Product Release (J4 MDR) | EC-04, EC-18, EC-19, EC-29 | EC-29: 0d (FSCA attestation) |
| BD-22 | Recall Initiation | EC-21, EC-29 | EC-29: 0d |
| BD-28 | ITAR Transfer Authorization | EC-30, EC-35 | EC-30: 180d |

**Gate API surface:**

```
GET  /v1/evidence/gate/{root_kind}/{root_id}?bd_code=BD-3
     → Returns current gate state for the decision
POST /v1/evidence/gate/{root_kind}/{root_id}/check
     → Triggers synchronous gate evaluation; returns pass/fail with detail
```

**Integration with E7 (§3.4 validate):** When `POST /v1/esignature/{bd_code}/validate` is called, it invokes the composition gate before checking quorum. If gate is unsatisfied, 422 `GATE_UNSATISFIED` is returned without proceeding to signature quorum check.

---

### 3.3 Restricted-class access governance

Evidence classes EC-30..EC-38 require the following governance controls beyond standard AAL:

| Control | Requirement |
|---|---|
| Authentication | AAL3 hardware token (FIDO2 / PIV / CAC) |
| Countersign | Active Compliance Lead session (4h TTL) |
| Access reason | Mandatory free-text; stored immutably in EC-38 |
| Download | Prohibited — in-memory JSON only |
| Export | Export to audit pack requires separate approval workflow with CISO countersign |
| Auditor portal | Never included regardless of session scope |
| Customer CVLP | Never included regardless of tier |
| Retention | Minimum RC-5Y; COMPLIANCE WORM mode |
| Access log | Every access emitted as EC-38 event; cannot be queried by the accessor |

**IP allow-list:** Restricted access may be configured per tenant to require source IP from an allow-list (e.g., corporate VPN CIDR). Attempts from outside the allow-list return `403 RESTRICTED_IP`.

---

### 3.4 WORM lifecycle visibility

The `GET /v1/evidence/{evidence_id}/retention` endpoint (§2.7) returns full WORM lifecycle state. Additional WORM management surfaces:

**Legal hold:**

```
POST /v1/evidence/{evidence_id}/legal-hold
     → Applies legal hold; requires Legal Counsel role + Compliance countersign
     → Sets legal_hold_active = true; extends WORM lock indefinitely
     → Returns: hold_id, applied_by, applied_at, reason

DELETE /v1/evidence/{evidence_id}/legal-hold/{hold_id}
     → Releases legal hold; requires same roles + Judge / Regulator release document attached
     → Emits EC-22 legal_hold_release event
```

**WORM lock states:**

| State | Meaning |
|---|---|
| `PENDING` | Evidence written; WORM lock being applied at storage layer (async, ≤60s) |
| `LOCKED` | WORM lock confirmed active at storage backend |
| `UNLOCKED` | Evidence outside WORM period (retention floor expired, legal hold released) — eligible for Compliance-countersigned deletion |
| `ANCHOR_FAILED` | WORM applied but daily Merkle anchor failed — SEV-2 incident; evidence still WORM-locked but anchor chain has gap |

---

## 4. Cross-cutting conventions

### 4.1 Response envelope

All responses use the standard HESEM envelope:

```jsonc
{
  "data": { /* payload */ },
  "meta": {
    "request_id": "req-uuid",
    "tenant_id": "tenant-uuid",
    "api_version": "2025-11",
    "deprecated": false,
    "sunset": null
  }
}
```

### 4.2 Pagination

All list endpoints use opaque cursor pagination. Cursor encodes `(sort_field_value, evidence_id)` for stable sort under concurrent inserts. Never expose offset-based pagination for evidence lists — offsets are unstable under WORM-protected append-only writes.

### 4.3 ETag and conditional GET

`GET /v1/evidence/{evidence_id}` returns `ETag: sha256:<content_hash>`. Clients SHOULD use `If-None-Match` on repeat reads to avoid re-transfer of unchanged evidence content. `304 Not Modified` returned on ETag match. Critical for large binary evidence payloads.

### 4.4 Versioning and sunset

API version expressed in `Accept: application/vnd.hesem.evidence.v2+json`. Default version served if header omitted. Deprecated versions annotated with `Sunset` response header per RFC 8594. Evidence API deprecation notice period: minimum 18 months before removal (longer than standard due to regulatory archival access requirements).

### 4.5 Field-level redaction

Field redaction table for cross-cutting fields:

| Field pattern | Redacted for | Reason |
|---|---|---|
| `internal_*` | CVLP T1/T2 customers | Competitive |
| `cost_*`, `price_*` | All external portals | Financial sensitivity |
| `supplier_margin_*` | All external | Commercial |
| `itar_technical_*` | Non-ITAR-cleared | ITAR §120-130 |
| `gdpr_personal_*` | Non-EEA tenants | GDPR Art.9 special categories |
| `red_team_finding_*` | All non red-team roles | Security |

---

## 5. Per-pack overlays (J1..J5)

### J1 — Pharmaceutical

**Additional required classes per BD-3 (Batch Release):** EC-04 (eBR), EC-06 (env monitoring 30-day window), EC-23 (deviation closure), EC-11 (CoA per INN substance).

**Pack-specific fields added to EC-04 content:**

```jsonc
{
  "inn_name": "paracetamol",
  "batch_number": "BN-2025-0091",
  "manufacturing_site_license": "MFG-EU-0044",
  "qualified_person_id": "qp-uuid",
  "qualified_person_signed_at": "2025-11-10T14:00:00Z",
  "apqr_reference": "APQR-2025-Q3",
  "pharmacovigilance_flag": false
}
```

**J1 audit pack:** Includes Annual Product Quality Review (APQR) as EC-27 subtype. Audit pack export for J1 requires QP e-signature (BD-3) before archive can be downloaded.

**J1 CVLP tier T2 additions:** `batch_number`, `inn_name`, `release_date`, `qp_name` (anonymized principal name).

---

### J2 — Automotive

**Additional required classes per BD-11 (CAPA Closure):** EC-15 (CAPA effectiveness with 8D report), EC-12 (SPC capability Cpk ≥ 1.33 post-action).

**Pack-specific fields added to EC-15:**

```jsonc
{
  "eight_d_ref": "8D-2025-0041",
  "d8_prevention_date": "2026-01-01",
  "cpk_before": 0.88,
  "cpk_after": 1.45,
  "lesson_learned_shared": true,
  "customer_approval_ref": "FORD-SCAR-2025-0099"
}
```

**J2 freshness override:** EC-12 (SPC) freshness floor = 30 days for IATF 16949 scope (tighter than default 365 days).

---

### J3 — Aerospace & Defense

**Additional required classes per BD-7 (Design Transfer):** EC-18 (DV), EC-19 (Validation), EC-20 (SW Validation if embedded), EC-17 (Risk Assessment FMEA/FHA).

**ITAR overlay:** EC-30..EC-38 restricted classes additionally tagged `ITAR_CONTROLLED`. Access requires ITAR clearance role in addition to red-team role. Export of restricted ITAR evidence to non-US persons is blocked at API level — returns `451 Unavailable For Legal Reasons`.

**Pack-specific fields added to EC-07 (Test Result):**

```jsonc
{
  "do_number": "DO-2025-0177",
  "as9102_fai_type": "FULL",
  "dod_contract_ref": "W912QR-25-C-0001",
  "export_control_classification": "EAR99",
  "nadcap_approval_ref": "NADCAP-AC7004-2025"
}
```

---

### J4 — Medical Device

**Additional required classes per BD-19 (Product Release EU MDR):** EC-18 (DV), EC-19 (Validation), EC-16 (Change Control), EC-29 (FSCA attestation if any open).

**DHF (Design History File) evidence pack:** J4 adds DHF assembly endpoint:

```
POST /v1/evidence/dhf/{product_id}
     → Assembles DHF from EC-16, EC-17, EC-18, EC-19, EC-20 across all design records
     → LRO; output: signed archive per EU MDR Annex II
```

**Pack-specific fields added to EC-29:**

```jsonc
{
  "fsca_type": "FIELD_SAFETY_NOTICE",
  "mdr_article": "Art.87",
  "notified_body": "TÜV SÜD-0123",
  "importer_notified": true,
  "distributor_count_notified": 14
}
```

---

### J5 — Food Safety

**FSMA §204 traceability overlay:** EC-09 (MES Execution) and EC-10 (Traceability/Lot Link) must be retrievable within 24 hours of FDA request. SLO override for J5 FSMA scope: p99 retrieve < 5 seconds (vs standard p99 < 1 second) for list-by-lot queries across full supply chain history.

**Pack-specific fields added to EC-10:**

```jsonc
{
  "fsma204_cte": "RECEIVING",
  "fsma204_kde": {
    "traceability_lot_code": "TLC-2025-1009",
    "quantity": 500,
    "unit": "kg",
    "location_description": "Warehouse A, Bay 14",
    "date_received": "2025-10-15"
  },
  "gfsi_scheme": "SQF Level 3",
  "haccp_ccp_ref": "CCP-2"
}
```

**J5 CVLP:** Tier T2 includes `fsma204_cte`, `traceability_lot_code`, `gfsi_scheme` for supply chain transparency to retail customers.

---

## 6. SLO summary

| Endpoint | p50 | p95 | p99 |
|---|---|---|---|
| §2.1 Retrieve by id | < 80ms | < 250ms | < 500ms |
| §2.2 List per record | < 150ms | < 350ms | < 700ms |
| §2.3 Filter by class | < 200ms | < 600ms | < 1.5s |
| §2.4 Verify integrity | < 300ms | < 1s | < 2s |
| §2.5 Attach evidence | < 200ms | < 500ms | < 1s |
| §2.6 Freshness query | < 100ms | < 250ms | < 500ms |
| §2.7 WORM retention | < 80ms | < 200ms | < 400ms |
| §2.8 Audit pack export | — | SLO-15: p95 < 24h | — |
| §2.9 CVLP delivery | < 150ms | < 500ms | < 1s |
| §2.10 Auditor portal | < 150ms | < 400ms | < 800ms |
| §2.11 Per-pack filter | < 200ms | < 500ms | < 1s |
| §2.12 Restricted read | < 200ms | < 600ms | < 1.2s |
| §3.2 Composition gate check | < 100ms | < 300ms | < 600ms |

---

## 7. Observability

### 7.1 Prometheus metrics

```
hesem_evidence_reads_total{class_code, root_kind, tenant}
hesem_evidence_writes_total{class_code, root_kind, tenant}
hesem_evidence_verification_duration_seconds{result}
hesem_evidence_gate_checks_total{bd_code, result}
hesem_evidence_anchor_lag_seconds{class_code}
hesem_evidence_worm_lock_pending_count{class_code}
hesem_evidence_restricted_access_total{class_code, outcome}
hesem_evidence_audit_pack_duration_seconds
```

### 7.2 Grafana boards

- **Evidence throughput board:** reads/writes by class per minute; P95 by endpoint; top-10 classes by access
- **Integrity board:** verification pass/fail rate; anchor state distribution; MISMATCH alert panel (SEV-1 threshold)
- **Composition gate board:** gate-satisfied vs gate-blocked ratio per BD code; blocked decisions aging
- **WORM board:** PENDING lock count (should converge to 0 within 60s); COMPLIANCE vs GOVERNANCE distribution; legal-hold count
- **Restricted access board:** EC-30..EC-38 access by principal; anomaly detection (spike alert)

### 7.3 Alerts

| Alert | Condition | Severity | Action |
|---|---|---|---|
| EVIDENCE_MISMATCH | Any `verification_result == MISMATCH` | SEV-1 | Page Compliance + Security on-call; quarantine scope |
| ANCHOR_LAG_HIGH | `hesem_evidence_anchor_lag_seconds` p95 > 23h | SEV-2 | Investigate anchor pipeline; SLO-10 at risk |
| WORM_PENDING_SPIKE | WORM PENDING > 1,000 for > 5 min | SEV-3 | Storage backend backpressure |
| GATE_BLOCK_SPIKE | Gate-blocked decisions > 20 in 1h | Warning | Notify Compliance; possible missing evidence batch |
| RESTRICTED_ACCESS_ANOMALY | EC-30..EC-38 reads > 10 in 1h outside business hours | SEV-2 | Security notification |

---

## 8. Operational runbook notes

### 8.1 Evidence integrity mismatch (SEV-1)

1. Quarantine is automatic on mismatch detection (§2.4). Verify quarantine in place by checking `evidence_quarantine` table.
2. Retrieve verification report from `incident_ref` link in verify response.
3. Check anchor chain integrity via E6 §2.5 to determine if this is an isolated record or systemic chain corruption.
4. If systemic: escalate to full chain integrity incident per E6 runbook.
5. If isolated: engage forensic team to determine whether storage-layer bit-rot or active tampering.
6. Do not un-quarantine without Compliance Lead written approval.
7. Notify regulatory body if evidence is a 21 CFR 11 record and mismatch cannot be explained within 24 hours.

### 8.2 Composition gate stuck (gate perpetually unsatisfied)

1. Identify the missing evidence class from gate response.
2. Check whether evidence exists but has `anchor_state = PENDING` — anchor lag delays gate satisfaction. Wait until anchor cycle completes (max 25h per SLO-10).
3. Check whether evidence exists but `verification_state = MISMATCH` — integrity incident blocks gate. Resolve integrity incident first.
4. If evidence genuinely missing: notify record owner and initiate evidence capture workflow.
5. Do not bypass gate via direct DB write — this is a compliance violation.

### 8.3 WORM backend unavailable (§2.1 503)

1. Evidence reads in `verify_on_read = true` mode fail. Switch to `verify_on_read = false` for read operations; integrity verification can be deferred until backend recovers.
2. New evidence writes queue to WORM-pending queue (Redis persistent). No data loss if queue persists through backend outage.
3. Alert SLO-watch if WORM backend unavailable > 30 minutes — audit pack exports for any active audits will be delayed.
4. Notify auditors of potential audit pack delay per regulatory obligation if outage extends beyond 4 hours.

### 8.4 Auditor portal token expiry mid-session

If auditor token expires during an active audit session, the auditor must re-authenticate. Compliance Lead must re-issue a new auditor session token via the countersign flow. Evidence already accessed in the prior session remains accessible in the immutable auditor access log. The new session must reference the same `audit_session_id` to maintain continuity of the access log thread.

### 8.5 High-volume FSMA §204 retrieval (J5)

Under a FSMA §204 FDA request, regulators may demand full traceability lot evidence within 24 hours. Preparation steps:

1. Pre-compute FSMA lot index nightly via scheduled sweep: `POST /v1/evidence/pack/J5?class=EC-09,EC-10` filtered by `recorded_from` past 24 months.
2. Cache index in read replica. Warm cache before business hours in North American and EU time zones.
3. If FDA request received: initiate audit pack export (§2.8) with `scope.pack_tags = ["J5_FSMA204"]` immediately — LRO should complete within 4 hours for typical lot spans.
4. Monitor `hesem_evidence_audit_pack_duration_seconds` alert — if p95 exceeds 8 hours for J5 scope, escalate and notify legal team to request FDA extension.
5. Deliver signed archive URL to FDA representative via secure documented channel; log delivery as EC-22 event with FDA contact ref.

### 8.6 Evidence class schema migration

When H4 is updated to add or modify an evidence class schema:

1. Increment `schema_version` on the affected class entry in `evidence_class_registry` table.
2. All new evidence writes for the class use the new schema version.
3. Legacy evidence records retain their original schema version — `content` is schema-versioned; API returns `schema_version` field alongside content.
4. Old-schema reads remain valid indefinitely (WORM evidence cannot be migrated in-place).
5. Update composition gate config if new required fields affect gate evaluation (§3.2).
6. Publish schema changelog via API `Sunset`-equivalent notice on old schema version with migration guide URL.

---

## 9. Deprecation and API lifecycle

**Evidence API version:** `2025-11`. Previous versions:

- `2024-06`: Superseded — missing composition gate (§3.2) and restricted class endpoints (§2.12). `Sunset: 2026-06-01`.
- `2023-11`: Removed. Tenants using this version must migrate by 2026-06.

All deprecated version responses include `Sunset` header per RFC 8594 and `Deprecation-Notice` body field pointing to migration guide. Evidence retrieved via deprecated APIs is identical in content; only envelope shape and pagination protocol differ.

---

## 10. Acceptance criteria

```
[x] Per-endpoint full contract for all 12 endpoints (§2.1..§2.12)
[x] BD-1..BD-N quorum gate integration specified (§3.2)
[x] H4 38 evidence classes fully enumerated with schema root, RACI, retention, WORM (§3.1)
[x] H4 §3 composition gate algorithm specified with BD code requirement table (§3.2)
[x] Restricted-class access governance (EC-30..EC-38) fully specified (§3.3 + §2.12)
[x] WORM lifecycle visibility: all states, legal-hold flow, backend management (§3.4 + §2.7)
[x] Per-pack J1..J5 overlays with pack-specific fields and BD requirements (§5)
[x] Cross-references resolve: E6 (audit chain), E7 (BD codes + esig), E13 (LRO), H4, H2, H3
[x] Field redaction table per audience tier (§4.5 + §2.9)
[x] SLO table per endpoint (§6)
[x] Observability: Prometheus metrics + Grafana boards + alerts (§7)
[x] Operational runbook: 4 scenarios (§8)
[x] No marketing language
[x] Decision phrase emitted below
```

---

`S3-03_E7_E8_DEEP_UPGRADE_COMPLETE`

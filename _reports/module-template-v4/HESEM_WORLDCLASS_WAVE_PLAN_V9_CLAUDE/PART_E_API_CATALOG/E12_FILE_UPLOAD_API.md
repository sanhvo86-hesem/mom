# E12 — File Upload / Download API

```
api_family:     File Upload / Download
owner_role:     Platform Lead
scope:          Document upload (CDOC), evidence file upload, photo
                upload (operator capture), file download with virus scan
```

---

## 1. Purpose

The File API supports attachment of files to records: CDOC content,
evidence files, photo evidence (operator captures, complaint photos),
and CAD drawing references.

---

## 2. Endpoints

### E12.1 — Initiate upload (pre-signed URL pattern)

**Purpose**: Initiate a file upload and return a pre-signed URL the
client uses to upload directly to object storage.

**Audience**: UI clients submitting files.

**Request**: filename, content type, byte size, target record (if
attachment), purpose.

**Success**: Pre-signed URL + upload method + headers + expiration +
attachment id.

### E12.2 — Confirm upload

**Purpose**: After the client uploads to the pre-signed URL, confirm
to HESEM with the actual checksum and byte size.

**Audience**: UI clients after PUT to pre-signed URL.

**Success**: Attachment registered; virus scan begins.

### E12.3 — Download

**Purpose**: Retrieve a file by attachment id.

**Audience**: UI clients, audit pack generator.

**Success**: Pre-signed download URL or direct streaming response.

### E12.4 — Virus scan status

**Purpose**: Check virus scan status on an uploaded attachment.

**Status values**: pending-scan, clean, virus-detected, scan-error.

### E12.5 — Attachment metadata lookup

**Purpose**: Retrieve attachment metadata without downloading the file.

---

## 3. Authentication and authorization

Authenticated session required. Per-tenant attachment isolation. Some
attachments (regulated, ITAR-restricted) have field-level authorization.

---

## 4. Virus scanning discipline

Every uploaded file goes through virus scan before being available for
download. Detected viruses cause attachment rejection and SEV-2 alert.

---

## 5. Failure modes

```
- upload/file-too-large           413
- upload/checksum-mismatch         422
- upload/virus-detected            422
- upload/unsupported-mime         415
- auth/forbidden                  403 (cross-tenant download)
```

---

## 6. Wave target

L4 by W3; L5 by W3.

---

## 7. Decision phrase

```
E12_FILE_UPLOAD_API_BASELINE_LOCKED
NEXT: E13_LONG_RUNNING_OPERATION_API.md
```

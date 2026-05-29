# MDA Evidence Object Model

Fields:

- `evidence_id`
- `subject_type`
- `subject_id`
- `subject_version`
- `subject_hash`
- `file_uri`
- `file_hash`
- `mime_type`
- `capture_source`
- `captured_at`
- `captured_by`
- `retention_class`
- `privacy_class`
- `legal_hold_state`
- `export_policy`
- `correlation_id`
- `command_id`

Rules:

1. Evidence is append-only. Replacement creates a new evidence row and relationship, never in-place overwrite.
2. Regulated decisions reference subject version and subject hash.
3. Legal hold prevents purge even after normal retention expiry.
4. Evidence export must preserve signer, timestamp, meaning, and linked record hash for e-sign events.

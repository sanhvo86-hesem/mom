# FRS-UOM-V5

Package posture: validation-ready package candidate.

## Functional Requirements

| ID | Source URS | Requirement |
|---|---|---|
| FRS-01 | URS-01 | API/UI shall require `magnitude`, `unit_code`, and `quantity_kind` or MEASVAL. |
| FRS-02 | URS-02 | Conversion shall return MEASVAL sections for original input, canonical value, display value, evidence, and digital thread. |
| FRS-03 | URS-03 | Affine and contextual categories shall route to explicit handlers or controlled errors. |
| FRS-04 | URS-04 | Alias resolve shall return resolved, ambiguous, quarantined, or unknown outcomes without silent mapping. |
| FRS-05 | URS-05 | Approval services shall require active human signer, permission, and signature meaning. |
| FRS-06 | URS-06 | Audit evidence shall include rule version/effective date, trace id, and SHA-256 audit hash. |
| FRS-07 | URS-07 | AI advisory records shall be evidence only and cannot approve rules or manifests. |
| FRS-08 | URS-08 | Evidence reports shall expose original and normalized measurement values. |

## Security And Audit

- Preview/list routes are separated from approval/e-sign routes.
- Problem Details include trace id and remediation.
- Audit and e-sign services are append-only or immutable where applicable.

## Backup/Restore And Time Assumptions

- Replay depends on rule version, effective date, original input, canonical output, and audit hash.
- Timestamps assume synchronized server time and traceable audit source.

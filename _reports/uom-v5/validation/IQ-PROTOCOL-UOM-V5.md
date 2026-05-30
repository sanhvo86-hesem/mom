# IQ-PROTOCOL-UOM-V5

Package posture: validation-ready package candidate.

## Objective

Verify installation/configuration evidence for UoM V5 source, dependencies, routes, indexes, and report artifacts in the development repository.

## Checks

| ID | Check | Expected |
|---|---|---|
| IQ-01 | PHP syntax for changed PHP files | No syntax errors |
| IQ-02 | Composer dependencies available | PHPUnit/PHPStan can run |
| IQ-03 | UoM routes registered | `/api/v1/uom/*` routes exist and OpenAPI parity test passes |
| IQ-04 | Registry files decode | JSON decode succeeds |
| IQ-05 | AI index regenerated | `.ai/*` index generated |

## Result

See `TEST-REPORT-UOM-V5.md`.

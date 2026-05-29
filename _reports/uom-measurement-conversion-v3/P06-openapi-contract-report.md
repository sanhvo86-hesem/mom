# P06 — OpenAPI Contract Report

**Prompt:** HESEM UoM V3 — P06  
**Blocker closed:** HB-09 (central OpenAPI + feature tests missing/incomplete)  
**Generated:** 2026-05-29

## Source

- Branch: `codex/mda-platform-sequential-20260529`
- New: `mom/api/openapi-uom-v3.yaml` (supplement spec)
- New test: `mom/tests/Unit/Uom/UomOpenApiContractTest.php`

## What was missing

`mom/api/openapi.yaml` (10 213 lines) did not document any `/api/v1/uom/*`
route. The routes file (`mom/api/routes/uom-routes.php`) declares 10
UoM endpoints; none were contracted.

## Repair

### Supplement OpenAPI 3.1 file

`mom/api/openapi-uom-v3.yaml` declares all 10 UoM paths against an
RFC 9457 `ProblemDetails` schema, mirroring the existing
`openapi-eqms-worldclass.yaml` precedent. Server base is
`https://eqms.hesemeng.com/api/v1`. Paths covered:

- `POST /uom/convert`
- `GET  /uom/units` / `/uom/units/{code}`
- `GET  /uom/kinds`
- `GET  /uom/rules`
- `POST /uom/aliases/resolve`
- `GET  /uom/external-map/{system}/{code}`
- `GET  /uom/health`
- `GET  /uom/item-policy/{item_id}` / `/uom/item-packaging/{item_id}`

### ProblemDetails schema

The `ProblemDetails` schema pins the HESEM stable problem codes as an
enum so any divergence between code and contract is caught at lint
time. The enum includes the new V3 codes from P05:

- `UOM_CONTEXT_REQUIRED`
- `UOM_CONTEXT_RULE_NOT_EFFECTIVE`
- `UOM_POLICY_NOT_FOUND`
- `UOM_METHOD_MISMATCH`

…and the manifest-service codes from P01:

- `UOM_MANIFEST_INVALID_AUTHORITY`
- `UOM_MANIFEST_DUPLICATE`
- `UOM_MANIFEST_NOT_FOUND`
- `UOM_MANIFEST_INVALID_TRANSITION`
- `UOM_MANIFEST_NOT_ACTIVE`

### Drift test

`UomOpenApiContractTest::testEveryUomRouteAppearsInSupplementOpenApi`
greps `uom-routes.php` for `$router->...('/api/v1/uom/…')` calls and
fails if the matching path is missing from the YAML supplement.

`UomOpenApiContractTest::testProblemDetailsCatalogIncludesV3Codes`
locks the new V3 codes into the enum.

## Tests

```
$ composer --working-dir=mom run test -- --filter UomOpenApiContract
..                                                                  2 / 2 (100%)
OK (2 tests, 10 assertions)
```

## Feature-test note (HB-09 partial close)

The V3 prompt asks for a full Feature test layer that boots the Router
and hits the controller end-to-end. That test layer requires a live
database fixture which the existing prototype suite does not yet
stand up. The supplement + drift test close the *contract* half of
HB-09 (no API without OpenAPI). The runtime-feature half is forwarded
to P09/P13 as a residual gap with explicit owner.

## Standards

- RFC 9457 — Problem Details for HTTP APIs.
- OpenAPI 3.1 — host repo version pin preserved (3.1.2 in main file,
  3.1.0 in this supplement aligned with `openapi-eqms-worldclass.yaml`).

## Decision token

```text
UOM_V3_P06_PASS_API_CONTRACT_HARDENED
```

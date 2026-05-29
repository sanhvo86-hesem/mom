# P06 — ProblemDetails Evidence

**Prompt:** HESEM UoM V3 — P06  
**Generated:** 2026-05-29

`UomController::uomProblemDetail($e, $instance)` (existing, lines 370-384
of `mom/api/controllers/UomController.php`) emits:

```json
{
  "type":         "<base>/problems/UOM_CONTEXT_REQUIRED",
  "title":        "<human title>",
  "status":       422,
  "detail":       "<exception message>",
  "instance":     "<request URI>",
  "problem_code": "UOM_CONTEXT_REQUIRED"
}
```

This is the exact RFC 9457 Problem Details shape with the HESEM
extension `problem_code` carrying the machine-readable stable code.

Every code present in `UomException` subclasses (P00 inventory:
17 codes) plus the V3-added codes (`UOM_CONTEXT_REQUIRED`,
`UOM_CONTEXT_RULE_NOT_EFFECTIVE`, `UOM_POLICY_NOT_FOUND`,
`UOM_METHOD_MISMATCH`, manifest codes) is enumerated in the
supplement's `ProblemDetails.problem_code` schema enum.

`UomOpenApiContractTest::testProblemDetailsCatalogIncludesV3Codes`
pins the V3 codes in CI.

## Decision token

```text
UOM_V3_P06_PASS_API_CONTRACT_HARDENED
```

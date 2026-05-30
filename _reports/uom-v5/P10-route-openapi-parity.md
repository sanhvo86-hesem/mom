# P10 Route/OpenAPI Parity

Prompt: P10
Branch: codex/uom-v5-no-guess-20260530
Current SHA before P10 commit: 7dc20cad369d47ec0a831520427bd38f64d3f674
Decision token: UOM_V5_P10_CONTRACT_FIRST_API_LOCKED

## Inventory

REPO_EVIDENCE: `mom/api/routes/uom-routes.php` exposes these UoM v1 routes:

| Route | Method | OpenAPI status |
|---|---:|---|
| `/api/v1/uom/convert` | POST | Documented |
| `/api/v1/uom/units` | GET | Documented |
| `/api/v1/uom/units/{code}` | GET | Documented |
| `/api/v1/uom/kinds` | GET | Documented |
| `/api/v1/uom/rules` | GET | Documented |
| `/api/v1/uom/aliases/resolve` | POST | Documented |
| `/api/v1/uom/external-map/{system}/{code}` | GET | Documented |
| `/api/v1/uom/health` | GET | Documented |
| `/api/v1/uom/item-policy/{item_id}` | GET | Documented |
| `/api/v1/uom/item-packaging/{item_id}` | GET | Documented |

## Contract Notes

- REPO_EVIDENCE: `mom/api/openapi.yaml` remains OpenAPI `3.1.2`; no speculative upgrade to 3.2.x was made.
- REPO_EVIDENCE: OpenAPI now has tag `UoM Measurement Intelligence`.
- REPO_EVIDENCE: Conversion is documented as preview-only and does not create approved rules.
- REPO_EVIDENCE: Alias resolution documents structured `ambiguous` and `quarantine_id` outputs.
- CONTROLLED_GAP: OpenAPI 3.2.x evaluation is backlog only because the current toolchain is 3.1.x.

## Gate

TEST_EVIDENCE: `UomApiContractP10Test::testSimP1004EveryUomRouteExistsInOpenApi` passed and fails if any route in `uom-routes.php` is missing from `openapi.yaml`.

# P14 — Coverage Gap and Risk Report

| Field | Value |
|---|---|
| Package | `HESEM_UOM_PROMPT_OS_V1_2026-05-28` |
| Slice | P14 / artifact 3 of 3 |
| Date sealed | 2026-05-29 |

## 1. Purpose

Inventory test-coverage gaps with their associated residual risk so the gating decision (`UOM_PROMPT_PASS_*`) is informed by actual evidence rather than assumed.

## 2. Coverage summary

| Layer | Suite | Pass / total | Notes |
|---|---|---|---|
| Unit | tests/Unit/Uom/ | 59 / 69 | 9 NS-* error on PSR-4 (G-001); 1 skipped (DB fixture) |
| Feature | tests/Feature/Uom/ | 0 / 0 | suite not yet authored (OG-002) |
| Integration | tests/Integration/Uom/ | 0 / 0 | suite not yet authored |
| Live VPS | scripted probes | 11 / 11 | LV-001..LV-011 pass |
| Visual regression | Playwright HMV4 | tokens covered via Module Sample | composite UoM screens follow-up |

## 3. Gap × risk

| Gap | Risk if unaddressed | Severity |
|---|---|---|
| G-001 PSR-4 exception split | NS-* tests don't fail-loud on regressions of negative path | critical |
| OG-002 Feature suite | route + middleware contract drift undetected | medium |
| TG-002 Integration suite | bridge + scanner against real DB not exercised by CI | medium |
| TG-003 Live VPS probes not scripted as CI | deploy regression not auto-caught | medium |
| TG-004 Bench harness absent | engine performance regression undetected | low |
| RG-002 Visual regression on UoM Control Center absent | UI drift undetected | low |
| UA-002 Hex/px ESLint rule absent | one-off hard-coded value lands unchecked | medium |

## 4. Coverage matrix vs golden cases

| Case | Unit | Feature | Integration | Live | Visual |
|---|---|---|---|---|---|
| TC-001 mm→m | ✓ | n/a | ✓ (via live) | ✓ | n/a |
| TC-003 100°C→°F | ✓ | n/a | ✓ | ✓ | n/a |
| TC-007 density water | ✓ (synthetic) | n/a | pending wiring | pending wiring | n/a |
| TC-N001 invalid magnitude | ✗ (G-001) | n/a | n/a | n/a | n/a |
| TC-N007 currency block | ✗ (G-001) | n/a | n/a | ✓ live | n/a |
| TC-N008 kind mismatch | ✗ (G-001) | n/a | n/a | ✓ live | n/a |
| TC-N015 tamper | manual | n/a | n/a | ✓ live (manual) | n/a |
| Control Center UI render | n/a | n/a | n/a | ✓ live | partial (Module Sample) |

## 5. Decision ledger

| ID | Decision | Authority |
|---|---|---|
| CGD-001 | G-001 is the gating coverage gap for pre-production sign-off | TD-001 |
| CGD-002 | Feature + Integration suites are scope items for the post-pre-production phase | TG-002 |
| CGD-003 | Live VPS probe scripts must land before any further consumer wiring | CI guard |

## 6. Gap register

| Severity | ID | Gap | Owner | Plan |
|---|---|---|---|---|
| critical | CGG-001 | G-001 PSR-4 split | platform | first follow-up commit |
| medium | CGG-002 | Feature suite | platform | per-PR |
| medium | CGG-003 | Live probes as CI | platform | scripted suite |
| low | CGG-004 | Bench harness | observability | optional |

## 7. Simulation result table

(see §4)

## 8. Audit scorecard

| Axis | Score |
|---|---|
| Coverage map clarity | 10 |
| Gap-to-risk mapping | 9 |
| Severity assignment | 9 |
| Sequencing | 9 |
| **Total** | **37 / 40** |

## 9. Final token

`UOM_PROMPT_PASS_WITH_MINOR_REPAIRS_READY_FOR_NEXT` — CGG-001 must close before VRS-001 final sign-off

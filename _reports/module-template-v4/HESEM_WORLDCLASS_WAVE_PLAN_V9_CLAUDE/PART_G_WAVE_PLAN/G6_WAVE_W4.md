# G6 — Wave W4: Live Read-Only API Graduation

```
wave_id:        W4
wave_name:      Live Read-Only API Graduation
predecessor:    W3
successor:      W4.5
calendar:       6-8 weeks
team_size:      8-12 FTE
```

---

## 1. Goal

Graduate selected Wave-1 to Wave-3 slices from L3 (current-portal-safe
E2E) to L4 (opt-in live read-only API). Per-slice graduation per V3
RULE-1 — never bulk graduation.

---

## 2. Entry criteria

W3 READY.

---

## 3. Exit criteria

```
[ ] >= 60% of W1+W2+W3 in-scope slices graduated to L4
[ ] Cross-browser baseline GREEN (chromium + firefox + webkit
     tri-required from W4 onwards)
[ ] No silent fallback violations (INV-7 enforcement)
[ ] All graduated slices have OpenAPI 3.1.1 spec authored
[ ] Per-slice graduation tracker maintained
```

---

## 4. Work packages

Per-slice graduation. Typical pattern:
- Author OpenAPI 3.1.1 spec at mom/contracts/openapi/<domain>/<root>.openapi.yaml
- Author live-fixture adapter
- Author graduation ADR
- User approval phrase received: "Proceed with <slice> Stage 2 live-API graduation"
- Update Authority Ledger entry to maturity_level=4
- Activate per-tenant feature flag HMV4_LIVE_API_<ROOT> (default false)
- Verify performance budget (p95 < 500ms)
- Verify failure mode (no silent fallback)

Slices targeted for L4 in W4 (highest priority):
```
NQCASE, CAPA, CDOC, TRAIN_RECORD, INSP
ITEM, IREV, BOM (master data already L4 from W2)
QUOTATION, SO (commercial)
PO, RECEIPT (procurement)
DISPATCH (existing HMV4 baseline)
```

---

## 5. Decision phrases

```
W4_LIVE_READ_ONLY_READY
W4_PARTIAL_NEEDS_CONTINUATION
W4_LIVE_READ_ONLY_FAIL_BLOCK_NEXT
```

---

## 6. Decision phrase

```
G6_WAVE_W4_BASELINE_LOCKED
NEXT: G7_WAVE_W4_5.md
```

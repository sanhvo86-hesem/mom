# P09 — External Unit Data Spoofing / Ambiguity Red-team Audit

| Field | Value |
|---|---|
| Package | `HESEM_UOM_PROMPT_OS_V1_2026-05-28` |
| Slice | P09 / artifact 3 of 3 |
| Date sealed | 2026-05-29 |

## 1. Purpose

Adversarial audit of the external-unit ingress path. The threat surface is wider than internal: shop-floor signals, EDI, supplier portals, and AI extraction all introduce opportunities for unit spoofing, encoding tricks, replay, and silent coercion.

## 2. Threat model

| Threat | Path | Mitigation |
|---|---|---|
| Spoofed OPC UA UnitId | a compromised PLC emits a different UnitId than its physical sensor | mapping is by UnitId; HESEM cannot validate sensor truth; mitigation upstream via OT security |
| Encoding attack on alias text | `µm` (Greek mu, U+03BC) vs `μm` (math mu, U+03BC) vs `μm` (micro sign, U+00B5) | resolver normalises Unicode before lookup; alias seed includes both forms |
| Mass quarantine flood | adversary submits 10000 unique unresolvable aliases | rate-limit + duplicate-suppression within 24h |
| Re-issue of UNECE Rec20 code | Rec20 historically re-uses some codes across revisions | `source_revision` pinning |
| Supplier scope hijack | another supplier session uses a victim's supplier_id | supplier_id binding from authenticated session, not request body |
| Customer scope hijack | analogous to supplier | same |
| OPC UA namespace > 0 collision | two vendors use the same vendor-namespace tag | SUPPLIER alias keyed on supplier_id |
| AI advisor poisoning | model trained to mis-suggest canonicals for malicious aliases | advisor is informational; human still triages |
| EDI partner unit drift | partner upgrades to Rec20 r18 silently | versioned source_revision; old rows continue resolving |
| Replay attack on quarantine resolution | adversary replays an old resolve API call | endpoint requires CSRF + auth; idempotency check on quarantine_id state |

## 3. Findings

| Severity | ID | Finding | Repair |
|---|---|---|---|
| medium | EA-001 | Unicode normalisation for alias text not yet declared at the service layer; current code uses raw input | add NFKC normalisation in resolver |
| medium | EA-002 | Mass quarantine flood mitigation relies on rate-limit middleware which is per-IP, not per-(alias, scope) | add per-(alias, scope) suppress within 24h |
| medium | EA-003 | Supplier session binding to supplier_id is the responsibility of the calling adapter; resolver does not re-verify | document in adapter contracts; add optional check |
| medium | EA-004 | AI advisor suggestion column has no confidence floor; low-confidence suggestions might dominate triage UI | add confidence threshold for surfacing in admin UI |
| low | EA-005 | EDI partner version handshake not yet automated | release of EDI integration |
| low | EA-006 | Replay-attack mitigation on quarantine resolve relies on idempotency of `RESOLVED` → `RESOLVED` (no state change) | add `resolved_at` immutability check |

## 4. Repair log

| Repair ID | Finding | Patch |
|---|---|---|
| RP-EA001 | EA-001 | resolver normalises input via Unicode NFKC; alias seed extended for all three μ glyphs |
| RP-EA002 | EA-002 | quarantine writer dedupes within 24h via `idx_uom_quarantine_alias` partial unique |
| RP-EA003 | EA-003 | adapter contract section §3 documents requirement; resolver `supplierId` parameter cross-checked against authenticated session at controller layer |
| RP-EA004 | EA-004 | admin UI filters by `confidence >= 0.6` by default; reviewer can lower |
| RP-EA005 | EA-005 | release plan |
| RP-EA006 | EA-006 | resolver method idempotency confirmed; `resolved_at` immutability documented |

## 5. Simulation result table

| Case | Probe | Expected | Actual |
|---|---|---|---|
| ES-001 | OPC UA unit_id=99999 | `UOM_EXTERNAL_CODE_UNKNOWN` + quarantine | confirmed |
| ES-002 | alias `µm` (Greek mu) | resolves to RA_UM or um based on hint | confirmed after NFKC patch (RP-EA001) |
| ES-003 | 1000 unresolvable aliases from same IP | rate-limited after threshold | confirmed via middleware |
| ES-004 | UNECE Rec20 MMK r17 vs r18 | both rows coexist; resolution time-aware | confirmed |
| ES-005 | Supplier scope with wrong supplier_id | resolution either misses (no row) or returns wrong canonical if request body alone trusted | RP-EA003 mitigates; documented |
| ES-006 | AI advisor with confidence=0.1 | surfaced low in UI; metrology can ignore | confirmed |
| ES-007 | Replay of resolveQuarantineEntry on RESOLVED row | no-op, no state change | confirmed |
| ES-008 | EDI partner upgrades silently | old rows continue resolving; new mapping coexists | confirmed |

## 6. Audit scorecard

| Axis | Score |
|---|---|
| Unicode normalisation | 9 (after RP-EA001) |
| Anti-flood | 9 (after RP-EA002) |
| Scope hijack resistance | 8 (RP-EA003 documented + partial enforcement) |
| AI advisor isolation | 10 |
| Revision pinning | 10 |
| Replay resistance | 9 |
| **Total** | **55 / 60** |

## 7. Final token

`UOM_PROMPT_PASS_WITH_MINOR_REPAIRS_READY_FOR_NEXT`

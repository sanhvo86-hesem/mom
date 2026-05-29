# P05 — Conversion Engine Edge-Case Audit

| Field | Value |
|---|---|
| Package | `HESEM_UOM_PROMPT_OS_V1_2026-05-28` |
| Slice | P05 / artifact 3 of 3 |
| Date sealed | 2026-05-29 |

## 1. Purpose

Adversarial audit of the conversion engine focused on edge cases: subnormal inputs, SI-hop traps, affine sign traps, density-context pitfalls, rounding-policy interactions, and tamper paths.

## 2. Edge-case catalog

### 2.1 Subnormal / boundary input

| Probe | Behaviour | Status |
|---|---|---|
| magnitude='0' | result='0' (or with trailing zeros to display_scale) | confirmed |
| magnitude='-0' | normalised to '0' for unsigned kinds; preserved for signed kinds | confirmed |
| magnitude='1e-100' | preserved at scale=30; rounds to '0.000000' at display_scale=6 unless ROUND_NONE | confirmed |
| magnitude='1e100' | accepted; result preserved at scale=30 | confirmed |
| magnitude='1e101' | rejected with `UOM_MAGNITUDE_OVERFLOW` | confirmed |
| magnitude='inf' or 'NaN' | rejected with `UOM_INVALID_MAGNITUDE` (not numeric per `is_numeric`) | confirmed |
| factor=0 in catalog | engine rejects rule activation via DB CHECK on workflow path | confirmed |
| factor=NULL | only valid for empirical units (RA_UM, HRC, HRB); engine refuses conversion across kinds that lack si_factor | confirmed |

### 2.2 Affine sign traps

| Probe | Expected | Status |
|---|---|---|
| 98.6 degF → Cel (using factor-only) | wrong: 54.78; right: 37 | ED-002 enforces correct path |
| 32 degF → Cel | 0 | confirmed |
| 0 K → Cel | -273.15 | confirmed (reverse path) |
| -40 degF → Cel | -40 (the unique fixed point) | confirmed |
| 100 Cel → degF (reverse bidirectional) | 212 | confirmed live |
| -273.15 Cel → K | 0 | confirmed |
| -274 Cel → K | engine does not validate physical bounds; returns -0.85 K | known limitation; documented |

### 2.3 SI-hop traps

| Probe | Expected | Status |
|---|---|---|
| in → cm via SI hop | accepted (factor via m base) | confirmed |
| in → cm direct rule (if seeded) | accepted | confirmed |
| ft → cm via SI hop | accepted | confirmed |
| HRC → RA_UM via SI hop | rejected: no si_factor on either side | confirmed |
| L → m3 via SI hop | accepted | confirmed |
| L → g via SI hop | rejected (kind mismatch, requires density context) | confirmed |
| Cel → degF via SI hop | rejected: SI hop only for linear; affine path needs direct rule | confirmed (engine refuses SI hop on affine) |

### 2.4 Density-contextual traps

| Probe | Expected | Status |
|---|---|---|
| L → kg substance=`WATER_PURE` at 20°C | density 998.207 kg/m³ → magnitude × 0.998207 kg | confirmed |
| L → kg substance=`UNKNOWN` | `UOM_DENSITY_NOT_FOUND` | confirmed |
| L → kg substance=`WATER_PURE` at 90°C | resolver picks closest temperature row; documents in MEASVAL `evidence.density_source` | confirmed |
| kg → L reverse via density | division path; safety check on density=0 | confirmed |
| L → kg without substance_code | `UOM_KIND_MISMATCH` with hint | confirmed |
| substance is currency code (mis-input) | rejected at catalog lookup | n/a (substance code is separate from unit code) |

### 2.5 Rounding interactions

| Probe | Expected | Status |
|---|---|---|
| 0.125 round HALF_EVEN to 2 decimals | 0.12 | confirmed |
| 0.135 round HALF_EVEN to 2 decimals | 0.14 | confirmed |
| 0.125 round HALF_UP to 2 decimals | 0.13 | confirmed |
| 1.99999... × 10^-30 round to 6 decimals HALF_EVEN | 0.000000 | confirmed |
| ROUND_NONE | preserves full scale=30 | confirmed |
| missing policy code | engine defaults to HALF_EVEN with warning logged | confirmed |

### 2.6 Tamper paths

| Probe | Expected | Status |
|---|---|---|
| MEASVAL JSONB edited in DB | hash mismatch on next bridge re-wrap | confirmed |
| MEASVAL hash recomputed with different canonical-form keys | mismatch detected | confirmed |
| Bridge run on row with hash divergence | raises `UOM_TAMPER_DETECTED` | confirmed |
| MEASVAL display rounded differently downstream | display drift accepted; canonical hash unaffected (display fields are NOT in hash input) | confirmed; documented |

## 3. Findings

| Severity | ID | Finding | Repair |
|---|---|---|---|
| medium | ER-001 | Engine does not validate physical lower-bound (e.g. Cel ≥ -273.15) | document; consider adding optional kind-level lower bound metadata |
| medium | ER-002 | SI-hop is silently allowed for linear conversions but documented only in evidence; users may not realise their conversion was 2-step | always populate `evidence.via_si_hop=true` flag (already done) |
| medium | ER-003 | Density lookup at far-from-recorded temperature returns nearest row without a confidence flag | add `density_temperature_delta_c` to envelope |
| low | ER-004 | Missing policy code defaults to HALF_EVEN but only logs warning to PHP error log, not to evidence | add `evidence.policy_fallback=true` when triggered |
| low | ER-005 | Density-zero substance entry would cause division-by-zero on reverse path | already raises `UOM_DENSITY_ZERO`; documented |

## 4. Repair log

| Repair ID | Finding | Patch |
|---|---|---|
| RP-E001 | ER-001 | add optional `kind_lower_bound` / `kind_upper_bound` columns to `uom_quantity_kind` in follow-up migration; engine to soft-warn (envelope flag) rather than reject |
| RP-E002 | ER-002 | evidence.via_si_hop flag confirmed in MEASVAL envelope shape |
| RP-E003 | ER-003 | envelope.evidence.density_temperature_delta_c proposed for next bridge update |
| RP-E004 | ER-004 | evidence.policy_fallback proposed; documented |
| RP-E005 | ER-005 | DensityContextualConverter::massToVolume guards bccomp density to '0' |

## 5. Simulation result table

(see §2 for per-row results)

## 6. Audit scorecard

| Axis | Score |
|---|---|
| Subnormal handling | 10 |
| Affine sign safety | 10 |
| SI-hop transparency | 8 (ER-002 evidence flag mandatory) |
| Density-context safety | 8 (ER-003 confidence flag pending) |
| Rounding correctness | 10 |
| Tamper resistance | 9 |
| **Total** | **55 / 60** |

## 7. Final token

`UOM_PROMPT_PASS_WITH_MINOR_REPAIRS_READY_FOR_NEXT`

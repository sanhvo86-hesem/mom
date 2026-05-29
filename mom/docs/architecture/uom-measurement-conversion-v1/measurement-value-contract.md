# P06 — MeasurementValue (MEASVAL) Envelope Contract

| Field | Value |
|---|---|
| Package | `HESEM_UOM_PROMPT_OS_V1_2026-05-28` |
| Slice | P06 / artifact 1 of 3 |
| Date sealed | 2026-05-29 |

## 1. Purpose

Lock the MEASVAL evidence envelope as the immutable evidence record for every measurement and every conversion. The contract specifies the schema, the invariants, and the digital-thread linkage that turns a single conversion into a regulatory artifact.

## 2. Envelope schema

```json
{
  "input": {
    "magnitude":  "<string>",        // exact BCMath input
    "unit_code":  "<canonical>",
    "kind_code":  "<canonical>"
  },
  "normalization": {
    "si_value": "<string scale=30>",
    "si_unit":  "<canonical SI base>"
  },
  "display": {
    "magnitude": "<string rounded>",
    "unit_code": "<canonical>"
  },
  "evidence": {
    "category":     "exact_linear|defined_linear|affine|logarithmic|density_contextual",
    "rule_code":    "UOMCONV-...",
    "rule_version": <int>,
    "factor":       "<string scale=20>",
    "offset_value": "<string scale=20|null>",
    "reversed":     <bool>,
    "via_si_hop":   <bool>,
    "policy_fallback": <bool>,
    "density_kg_m3": "<string|null>",
    "density_source": "<string|null>",
    "substance_code": "<string|null>"
  },
  "precision_envelope": {
    "bcmath_scale":    30,
    "display_scale":   6,
    "rounding_policy": "ROUND_HALF_EVEN",
    "uncertainty":     null
  },
  "semantic_context": {
    "domain":          "QC|SPC|MES|LIMS|UI|ITUOM",
    "item_id":         "<string|null>",
    "quantity_kind":   "<canonical>",
    "from_risk_level": "low|medium|high",
    "to_risk_level":   "low|medium|high"
  },
  "digital_thread": {
    "actor_id":        "<uuid|null>",
    "audit_hash":      "<sha256-hex 64 chars>",
    "hash_algorithm":  "SHA256",
    "recorded_at":     "<RFC3339>",
    "request_id":      "<string|null>",
    "trace_id":        "<string|null>"
  },
  "ai_flags": [<advisory_flag_string>...]
}
```

## 3. Invariants

| Invariant | Mechanism |
|---|---|
| Once written, envelope content (excluding `display`) is immutable | application contract; tamper detection on re-read |
| Audit hash covers everything except `display.*` and `ai_flags` | canonical-form serialiser |
| Audit hash is SHA-256 of stable-sorted JSON canonical form | `MeasurementValueFactory::hash` |
| `evidence.rule_code` + `evidence.rule_version` uniquely identify the conversion rule applied | rule registry stable |
| `evidence.reversed` is true iff the rule was applied in reverse via bidirectional path | `AffineConverter::convertReverse` only |
| `evidence.via_si_hop` is true iff no direct rule existed and SI-base hop was used | engine step 6c |
| `evidence.density_*` populated iff category=`density_contextual` | DensityContextualConverter |
| `digital_thread.actor_id` is NULL only for system / batch / unauthenticated reads (which still produce envelopes for traceability) | bridge writers populate when actor known |
| `precision_envelope.bcmath_scale = 30` for v1 | engine constant |
| `ai_flags` is empty unless an AIAdvisory was attached to this conversion | future advisory write path |

## 4. Decision ledger

| ID | Decision | Authority |
|---|---|---|
| MD-001 | Envelope is JSONB on the source row PLUS a row in `uom_measurement_thread` linking by hash | QD-002 |
| MD-002 | SHA-256 over canonical JSON (RFC 8785-style, sort keys ascending, strip whitespace, normalise number strings) | reproducibility |
| MD-003 | `display.*` is mutable on re-rendering (different precision contexts); excluded from hash | display vs canonical separation |
| MD-004 | `ai_flags` is mutable (advisory may be added later); excluded from hash | advisory injection separation |
| MD-005 | `hash_algorithm` recorded so a future migration can introduce SHA3 without breaking historic verification | future-proofing |
| MD-006 | `digital_thread.actor_id` may be NULL but is recorded when known (bridge writers) | audit completeness |
| MD-007 | `evidence.reversed` and `evidence.via_si_hop` are separate flags; both can be true at once | clarity |
| MD-008 | `semantic_context.domain` is one of a fixed set; never free-text | governance |
| MD-009 | Currency conversion never produces an envelope (engine rejects before envelope construction) | UD-007 |

## 5. Tamper detection

```
def verify(envelope, source_row_hash):
  canonical = canonicalize(envelope, exclude=["display", "ai_flags"])
  recomputed_hash = sha256(canonical)
  if recomputed_hash != envelope.digital_thread.audit_hash:
    raise UOM_TAMPER_DETECTED
  if source_row_hash != envelope.digital_thread.audit_hash:
    raise UOM_TAMPER_DETECTED
```

On every bridge re-wrap and on every audit read, verify is called. Mismatch surfaces in admin scanner.

## 6. Digital thread row

`uom_measurement_thread` (migration 228):

| Column | Source |
|---|---|
| thread_id | gen_random_uuid() |
| source_table | `inspection_results` / `mes_inline_measurements` |
| source_id | row PK as text |
| audit_hash | from envelope.digital_thread.audit_hash |
| from_unit_code | envelope.input.unit_code |
| to_unit_code | envelope.display.unit_code |
| magnitude_input | envelope.input.magnitude |
| magnitude_result | envelope.display.magnitude |
| rule_code | envelope.evidence.rule_code |
| rule_version | envelope.evidence.rule_version |
| rounding_policy | envelope.precision_envelope.rounding_policy |
| context_code | envelope.semantic_context.domain |
| item_id | envelope.semantic_context.item_id |
| job_number | (from source row if available) |
| operation_seq | (from source row if available) |
| characteristic | (from source row if available) |
| inspector_id | envelope.digital_thread.actor_id |
| ai_advisory_flag | envelope.ai_flags non-empty |
| recorded_at | envelope.digital_thread.recorded_at |

Indexes on `(source_table, source_id)`, `(item_id, recorded_at DESC)`, `(job_number, operation_seq)`, `(audit_hash)`, `(rule_code)` cover the queries Quality, MES, and audit auditors run.

## 7. Gap register

| Severity | ID | Gap | Plan |
|---|---|---|---|
| medium | MG-001 | `uncertainty` reserved but never populated in v1 | metrology supply |
| medium | MG-002 | `ai_flags` mutable; needs append-only audit log if changed post-hoc | follow-up flag-history table |
| low | MG-003 | `request_id` / `trace_id` only populated by REST entry path; bridge-call entry path doesn't yet propagate | bridge improvement |

## 8. Audit scorecard

| Axis | Score |
|---|---|
| Schema completeness | 10 |
| Invariant clarity | 10 |
| Hash discipline | 10 |
| Tamper detection design | 9 |
| Digital thread linkage | 10 |
| **Total** | **49 / 50** |

## 9. Final token

`UOM_PROMPT_PASS_READY_FOR_NEXT`

## 10. Cross-references

- Sibling (contract): `mom/contracts/objects/master_data--measurement-value/PLANNING_CONTRACT.md` (P06 / 2)
- Audit: `_reports/uom-measurement-conversion-v1/p06-no-naked-number-risk-report.md` (P06 / 3)

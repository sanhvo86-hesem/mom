# UOM Conversion Policy

PROMPT_ID=P25
DATE=2026-05-29

## Formula

All conversions use this formula:

```text
target_qty_raw = source_qty * numerator / denominator
target_qty = deterministic_round(target_qty_raw, precision_scale, rounding_mode)
```

The conversion record snapshot must be stored with ledger-capable commands.

## Rounding Modes

| Mode | Meaning |
|---|---|
| `half_up` | Standard commercial half-up rounding. |
| `half_even` | Bankers rounding for finance-sensitive flows. |
| `floor` | Always round down at the configured precision. |
| `ceil` | Always round up at the configured precision. |
| `truncate` | Drop digits beyond configured precision toward zero. |

## Dimension Policy

| Case | Result |
|---|---|
| Same dimension and approved conversion exists | Allowed. |
| Same dimension but no approved conversion exists | Blocked with `uom_conversion_not_found`. |
| Different dimensions without packaging policy | Blocked with `uom_dimension_mismatch`. |
| Different dimensions with packaging policy | Allowed only when policy is explicit and auditable. |

## Effectivity Policy

The service selects exactly one approved conversion active at the command timestamp. If more than one active conversion matches the same from/to/scope/effectivity window, the command fails with `uom_conversion_ambiguous`.

Running work orders or released engineering packages must keep the conversion snapshot captured at release/start. New commands use the conversion active at their own command timestamp.

## Scope Policy

| Scope | Intended Use |
|---|---|
| `global` + `*` | General physical conversions such as G to KG or INCH to MM. |
| `item` + item code/id | Item-specific packaging such as BOX to PCS. |
| `supplier_item` + supplier item reference | Supplier-specific pack size. |
| `customer_item` + customer item reference | Customer packaging or labeling unit. |
| `work_order` + WO id | Frozen released snapshot only. |

## Compatibility Policy

`mdm_uom_conversions` may feed migration/import reconciliation but cannot be a runtime conversion authority. Any consumer that reads `mdm_uom_conversions` directly must be classified as a bypass and repaired.

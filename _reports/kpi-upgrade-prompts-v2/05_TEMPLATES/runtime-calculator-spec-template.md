# Runtime Calculator Spec — <CODE>

## 1. Registry row

Paste/summary of registry fields.

## 2. SQL source verification

```bash
grep "<table>" .ai/db-map/index.json
cat .ai/db-map/<domain>.json | jq ...
```

Verified tables/cột:

## 3. Function design

- Constant:
- `ALL_METRICS` insertion:
- Unit:
- Default target:
- Lower-is-better:
- Calculator map:
- Function name:

## 4. Query

Pseudo-SQL:

```sql
SELECT ...
FROM ...
WHERE ...
```

Parameters:
- `:s`
- `:e`
- filters:

## 5. Return payload

```php
[
  'value' => ...,
  'sample_size' => ...,
  'numerator' => ...,
  'denominator' => ...,
  'breakdown_by_reason' => ...,
  'data_quality_flags' => ...
]
```

## 6. Edge handling

- divide by zero:
- nulls:
- missing reason:
- min_sample:
- period:
- reopened records:
- planned vs unplanned:

## 7. Tests

Commands/API results:

## 8. Docs sync

- Registry:
- ANNEX-122:
- ANNEX-128:
- Dashboard:
- CI guard:

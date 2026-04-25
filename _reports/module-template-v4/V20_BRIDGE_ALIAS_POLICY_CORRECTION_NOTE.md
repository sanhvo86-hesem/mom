# V20 Bridge Alias Policy Correction Note

## Summary

This note corrects planning language around the `ncr` bridge alias. No bridge code was changed in V20 planning.

## Correct Policy

```text
ncr without explicit record context must not invent a record ID.
It may map to the quality-case-management module route as a legacy module alias.
Only context-backed ncr mapping may produce an authoritative record-shell route.
Unknown aliases remain unmapped_needs_decision.
```

## Practical Interpretation

Allowed:

```text
Hmv4Bridge.resolveEqmsModule("ncr")
```

may return the legacy quality case management module route, because no record identity is present.

Allowed:

```text
Hmv4Bridge.resolveEqmsModule("ncr", { recordId: "NC-001", tab: "overview" })
```

may return:

```text
/ops/records/nonconformance-cases/NC-001?tab=overview
```

Not allowed:

```text
ncr without explicit record context creating NC-001 or any other record ID
```

Unknown aliases must continue returning:

```text
unmapped_needs_decision
```

## V20 Impact

Training Matrix planning must preserve this policy. The later Training Matrix implementation may verify `training` alias behavior, but it must not weaken the `ncr` no-invented-record rule.

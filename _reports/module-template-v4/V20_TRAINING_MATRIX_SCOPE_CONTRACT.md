# V20 Training Matrix Scope Contract

## Summary

Third-slice candidate:

```text
Training Matrix / Qualification Workspace - read-only projection workspace prototype
```

This is development/prototype planning for limited Wave 1 implementation. It does not authorize implementation.

## Route Grammar

Target route:

```text
/ops/people-skill-ehs/training-competency/matrix
```

Route class:

```text
WS
```

Workspace family:

```text
matrix
```

## Authority Posture

Required attributes for later implementation:

```text
data-route-class="WS"
data-authority-class="projection"
data-resource-family="training-records"
data-root-code="TRAIN"
data-requires-reanchor="true"
```

The workspace is a projection, not the authority for certification, completion, acknowledgement, or e-sign execution.

## Subject Filters

Fixture-only filters:

```text
?team=<team_id>
?role=<role_code>
?qualification=<qual_code>
?status=qualified|expiring|expired|in_training|not_required
```

Filters must change projection display only. They must not submit workflow, certification, completion, acknowledgement, or e-sign actions.

## Projection Columns

Required projection columns:

```text
operator
role
qualification
status
last_certified_at
expires_at
evidence_link
```

Record-open links, if rendered, must route to:

```text
/ops/records/training-records/{id}?tab=overview
```

## Status States

Required states:

```text
qualified
expiring
expired
in_training
not_required
```

Status must be visible text, not color-only. Color may supplement text but cannot be the sole indicator.

## No-mutation Rules

Later implementation must keep all mutation-looking controls absent or disabled.

If a control is displayed for issue qualification, schedule training, certify, complete, acknowledge, or sign, it must:

```text
be disabled
show visible read-only/re-anchor explanation
use data-hmv4-mutation-intent only as a safe marker
perform no backend call
perform no workflow mutation
```

## In Scope

```text
read-only training matrix projection shell
operator rows
qualification/status cells
status text and evidence links
fixture-only subject filters
empty projection fixture
degraded/stale projection fixture
partial-access fixture
record-open links to training-records AR placeholder route
bridge alias planning for training
E2E planning for route, bridge, keyboard, accessibility, and current portal safety
```

## Out Of Scope

```text
certification mutation
training completion mutation
e-sign execution
acknowledgement mutation
backend API changes
current portal navigation switch
mom/qms-data promotion
production registry consumption
workflow mutation
```

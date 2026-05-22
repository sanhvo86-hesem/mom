# Manual KPI Input Form Spec — <CODE>

## Form identity

- Metric code:
- Metric name:
- Owner:
- Data steward:
- Approver:
- Cadence:

## Fields

| Field | Type | Required | Validation | Notes |
|---|---|---:|---|---|
| period_start | date | yes | ISO date | |
| period_end | date | yes | >= start | |
| value | number | yes | finite | |
| unit | select | yes | registry unit | |
| evidence_ref | text/url/doc id | yes | exists/format | |
| breakdown_reason | select/text | no | | |
| notes | text | no | | |
| entered_by | user | yes | session | |
| approval_status | enum | yes | pending/approved/rejected/superseded | |

## Workflow

1. Enter.
2. Validate.
3. Save pending.
4. Approver review.
5. Approved input becomes scoreable.
6. Supersede with audit if corrected.

## UI warnings

- Staged vs manual distinction.
- Missing evidence blocks save.
- Pending input not used for reward.
- Counter red blocks recognition.

## API

- Save route:
- List route:
- Audit event:

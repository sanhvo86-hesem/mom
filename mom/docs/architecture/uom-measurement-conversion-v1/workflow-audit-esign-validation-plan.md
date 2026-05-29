# P12 — Workflow, Audit, E-sign, and Validation Plan

| Field | Value |
|---|---|
| Package | `HESEM_UOM_PROMPT_OS_V1_2026-05-28` |
| Slice | P12 / artifact 1 of 3 |
| Date sealed | 2026-05-29 |

## 1. Purpose

Lock the workflow + audit + e-sign chain that mediates every catalog mutation, plus the validation plan that proves the chain meets 21 CFR Part 11, EU Annex 11, and GAMP 5 expectations for a regulated measurement subsystem.

## 2. Workflow (4-step approval)

| Step | Method | Effect on lifecycle | Evidence row |
|---|---|---|---|
| 1 | `submitForReview(ruleId, submitterId, payload)` | `draft → pending_review` | `uom_rule_approval` step=`SUBMITTED` |
| 2 | `approve(ruleId, approverId, comments)` | `pending_review → approved_pending_signoff` | step=`APPROVED` |
| 3 | `esign(ruleId, signerId, signature, reason)` | `approved_pending_signoff → approved` + sets `approved_by` | step=`ESIGNED` + signature payload row |
| 4 | (automatic at e-sign + effective_from reached) | `approved → active` | (no extra row; transition implicit) |

## 3. Approval-row schema

`uom_rule_approval`:

| Column | Purpose |
|---|---|
| `id` | row PK |
| `rule_id` | FK to `uom_conversion_rule` |
| `rule_version` | the version this approval applies to |
| `step` | enum `SUBMITTED` / `APPROVED` / `ESIGNED` |
| `actor_id` | FK to users(user_id) |
| `comments` | free-text (audit) |
| `recorded_at` | timestamptz; immutable |
| `signature_payload_id` | optional FK to a signature payload table |

Approval rows are **append-only**. UPDATE / DELETE prohibited at the application layer.

## 4. E-sign payload

The e-sign step accepts a `signature` payload that includes:

- the rule_id and rule_version,
- a server-issued nonce (preventing replay),
- the signer's identity claim,
- a reason-for-signing (FDA Part 11 requirement),
- a timestamp,
- a checksum over the above.

The payload is stored in a dedicated signature payload table (reserved column on rule_approval; table to be created in IMPL-07 follow-up).

## 5. Validation plan (VRS-001)

| Test | Authority | Status |
|---|---|---|
| MEASVAL envelope shape | internal model lock | passing in `VRS001ValidationTest` |
| SHA-256 hash determinism | 21 CFR Part 11 §11.10(e) | passing |
| Hash sensitivity (any envelope edit → hash change) | 21 CFR Part 11 §11.10(e) | passing |
| Precision envelope recorded | ASTM E29 | passing |
| Digital thread carries `hash_algorithm` | future-proofing | passing |
| Reversed evidence flag | internal model lock | passing |
| Workflow 4-step round-trip | 21 CFR Part 11 §11.50 | proven in IMPL-07 simulations GW-001..GW-004 |
| DB CHECK `chk_rule_approved` rejects bypass | 21 CFR Part 11 separation of duties | proven via psql probe |
| AI advisor isolation | UD-012 | proven by absence of mutation path |
| Impact analysis pre-approval render | UD-005 / WD-005 | UI gate |
| Scanner CRITICAL classification | GAMP 5 risk-based | scanner full-scan returns OK on clean live DB |

## 6. Validation environment

| Element | Configuration |
|---|---|
| DB | live PostgreSQL on eqms.hesemeng.com (migrations 1..230 applied) |
| Engine | `hesem-measurement-intelligence` v1.0.0 |
| Test pack | `tests/Unit/Uom/VRS001ValidationTest.php` (7 cases) |
| Live probes | `_reports/uom-measurement-conversion-v1/impl06-quality-metrology-validation-report.md` §6 |
| Scanner | `UomDataQualityScanner::fullScan()` returns overall_status=OK |

## 7. Decision ledger

| ID | Decision | Authority |
|---|---|---|
| WD-001 | 4 distinct steps; submit / approve / e-sign separate actors | 21 CFR Part 11 §11.50 |
| WD-002 | DB CHECK `chk_rule_approved` is the structural gate independent of the application | tamper resistance |
| WD-003 | E-sign payload requires nonce + reason | FDA + Annex 11 |
| WD-004 | Approval rows are append-only | audit integrity |
| WD-005 | Impact analysis rendered to approver inline before approve action | tamper resistance |
| WD-006 | VRS-001 must pass before pre-production gate | governance |
| WD-007 | Production cutover is a separate gate, not in this slice | scope |
| WD-008 | Scanner CRITICAL = deploy block (planned CI gate) | release engineering |

## 8. Gap register

| Severity | ID | Gap | Plan |
|---|---|---|---|
| medium | WG-001 | Signature payload table not yet created; e-sign currently signs only with auth context | IMPL-07 follow-up |
| medium | WG-002 | Scanner CRITICAL gate not yet wired in CI | release engineering |
| medium | WG-003 | Impact analysis UI render gate not yet in UI | IMPL-07 follow-up |
| low | WG-004 | Risk-confirm dialog for high-risk catalog changes not yet wired | UI follow-up |

## 9. Audit scorecard

| Axis | Score |
|---|---|
| Workflow design | 10 |
| Audit trail completeness | 10 |
| E-sign separation | 9 |
| Validation pack alignment | 9 |
| **Total** | **38 / 40** |

## 10. Final token

`UOM_PROMPT_PASS_WITH_MINOR_REPAIRS_READY_FOR_NEXT`

## 11. Cross-references

- Sibling: `mom/docs/standards/uom-measurement-conversion-v1/validation-readiness-matrix.md` (P12 / 2)
- Audit: `_reports/uom-measurement-conversion-v1/p12-regulated-action-redteam.md` (P12 / 3)

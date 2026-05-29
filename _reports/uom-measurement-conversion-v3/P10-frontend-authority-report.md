# P10 — Frontend Authority Report

**Prompt:** HESEM UoM V3 — P10  
**Generated:** 2026-05-29

## Posture

The HESEM UoM Measurement Intelligence subsystem is in
**development/prototype → pre-production readiness candidate only**.
No live customer-facing UoM widget ships as part of V3.

The portal currently exposes UoM read paths via existing JS modules
(unit catalog browsing, conversion sandbox in `01-QMS-Portal`). The
V3 prompt P10 scope deliverables are:

- Control Center authority boundary documentation.
- Quantity widget contract (value + unit + quantity kind + precision
  + evidence status; no naked number input).
- A11y posture statement.
- Fallback / fixture-only posture acknowledgement.

## Control Center authority boundary

Control Center MUST be read-only / projection unless the governed
mutation path (`UomWorkflowService::submit/approve/esign`) is
explicitly invoked. Direct writes to authority tables are forbidden
by the V3 P01 DB CHECK constraint `uom_cr_approved_requires_owner`
and by the V3 P09 anti-pattern guard list.

## Quantity widget contract

A V3-conforming quantity widget MUST always capture and surface:

- `magnitude`         — BCMath-safe decimal string (no naked float).
- `unit_code`         — canonical code from `uom_unit_catalog`.
- `quantity_kind`     — derived from the unit row, displayed to user.
- `precision`         — display scale + rounding policy.
- `evidence_status`   — `pending` | `wrapped` | `verified`.
- `problem_code`      — populated from RFC 9457 ProblemDetails on failure.

Ambiguous aliases MUST block submission and surface the
`alias_quarantine` ProblemDetails route to the user. The widget MUST
NOT carry its own approved-list.

## A11y posture

The V3 widget contract relies on the existing HESEM portal a11y
primitives (keyboard, labels, focus, error messages, contrast). No
one-off visual tokens may be introduced — Graphics Authority tokens
are the only colour/spacing surface.

## Fallback / fixture-only posture

For V3 the API consumer surface is **fixture-only** unless the
controller workflow path is explicitly invoked. Live mutation is
disabled. This mirrors the HMV4 Wave 1 program posture.

## Decision token

```text
UOM_V3_P10_PASS_FRONTEND_AUTHORITY_SAFE
```

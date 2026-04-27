# V22 Phase 3 Implementation Prompt Drafts

Date: 2026-04-25

## Shared Guardrail For All Drafts

Use these drafts only after explicit approval for a specific Phase 3 slice. Each approved implementation must start from current `main`, create a `codex/...` branch, preserve current portal safety, and state exact files before edits.

Do not switch current portal navigation, promote fixture registries to `mom/qms-data`, enable live API by default, or add backend APIs unless that specific prompt explicitly approves the exact API surface.

## Draft A: CI Matrix Hardening

```text
Act as Phase 3 CI matrix hardening coordinator for module-template-v4.

Plan and implement only approved CI/test harness changes after confirming:
- current main HEAD;
- current Playwright Chromium result;
- latest Firefox/WebKit evidence;
- runtime budget;
- artifact retention policy;
- snapshot update policy.

Do not change business shell source or regenerate snapshots unless explicitly approved.
Produce a CI matrix hardening report under _reports/module-template-v4/.
```

## Draft B: CAPA Live API Toggle Replication

```text
Act as Phase 3 CAPA live API toggle implementer.

Reuse ADR-0011 opt-in pattern from NQCASE. Keep default fixture mode unchanged.
Implement only the approved CAPA read adapter and focused tests.
All mutation controls must remain disabled. No POST/PATCH/DELETE calls.
Do not enable live API by default and do not change current portal navigation.
```

## Draft C: Slice 5 CDOC Governed Document Record Shell

```text
Act as Phase 3 Slice 5 CDOC planning/implementation agent only after approval.

Build a read-only controlled-document record shell using fixture-backed HMV4 patterns.
DCC service/database paths remain authority. No document revision, approval, publication,
obsolescence, acknowledgement, training assignment, or e-signature mutation is allowed.
```

## Draft D: Slice 6 INSP Inspection Record / Lot Shell

```text
Act as Phase 3 Slice 6 INSP planning/implementation agent only after approval.

Build a read-only inspection record or inspection lot shell using fixture-backed HMV4 patterns.
Inspection disposition, measurement entry, NCR creation, lot release, and e-signature execution
remain out of scope unless separately approved through governed EQMS/MES write paths.
```

## Draft E: Slice 8 ECO Engineering Change Record Shell

```text
Act as Phase 3 Slice 8 ECO planning/implementation agent only after approval.

Build a read-only ECR/ECO shell for affected-object traceability.
No item revision release, route mutation, CNC program release, controlled document publication,
approval mutation, or e-signature execution is allowed.
```

## Draft F: Slice 7 BREL Batch Release Packet Shell

```text
Act as Phase 3 Slice 7 BREL planning/implementation agent only after approval.

Build a read-only batch release packet shell that aggregates evidence without becoming release authority.
No release, reject, approval, e-signature, exception closure, or override mutation is allowed.
```

## Draft Decision

These are prompt drafts only. No Phase 3 implementation was performed.

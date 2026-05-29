# P39 Multi-Role Adversarial Audit

## Verdict

P39 is acceptable as a controlled runtime-gate slice. It is not runtime-complete because the evaluator is not yet invoked by every governed command and decisions are not persisted by the command gateway.

## Findings

- Source authority: physical tables and governed registry now exist for the P39 root. Remaining risk is live policy source convergence with `AuthorizationKernel`.
- Runtime bypass: Generic CRUD cannot mutate P39 tables after denylist update. Remaining bypass risk is direct command handlers that do not call `MdaRuntimeSecurityBoundaryService`.
- Operator safety: OT semantic changes are blocked unless adapter and checksum are approved. Remaining risk is telemetry/alerting for repeated denials.
- Quality containment: AI cannot release/approve/sign quality holds through this gate. Remaining risk is all quality command handlers must invoke it.
- Financial/inventory correctness: field redaction blocks sensitive financial fields in read projections. Remaining risk is role-to-field policy persistence and UI evidence.
- Security/SoD: expired or incomplete SoD exception is blocked. Remaining risk is exception approval command lifecycle and audit persistence.
- Migration/cutover: migration 242 is additive and does not grant permission. Existing P2 migration prefix collisions remain unrelated and non-fatal.
- UI evidence: no live browser/control tower proof exists for P39. This is registered as `GAP-P39-002`.
- Auditor defensibility: service decisions carry deterministic hashes, but regulated evidence table persistence remains pending.

## Repairs Applied Before Handoff

- Changed BOLA mismatch reason to explicit `bola_scope_violation_blocked`.
- Added missing-scope denial instead of allowing when resource scope exists but actor has no matching scope list.
- Added command-name based AI firewall detection so an AI cannot bypass by labeling action class as `read`.
- Added P39 authority root to contracts and Generic CRUD hard-stop.

# D03 Record Evidence, Audit and Signature Panel Model

## 0. Decision phrase

```text
D03_EVIDENCE_AUDIT_SIGNATURE_MODEL_READY_AS_PLANNING_CONTRACT
```

D03 displays evidence/audit/signature regions as planning contracts. It does not claim e-signature, regulated evidence capture, validation or live command mutation is implemented.

## 1. Evidence panel contract

Evidence tab shows evidence links, guard checklist, missing evidence blockers, source/owner, retention, integrity hash/reference, visibility and version. Attachments panel shows governed references only; uncontrolled upload is forbidden. Packet/export panel shows readiness/export/release packet views; export/release execution is disabled until packet policy and validation gates exist.

## 2. Audit panel contract

Every canonical AR shell requires actor, timestamp, action/transition, prior state, target state, reason/comment, evidence references, signature references, record version/effectivity, source route, correlation id, tenant/site and problem/decision phrase where applicable.

## 3. Signature panel contract

The signature tab is required when a transition or regulated/customer rule needs accountable human approval, review, release, disposition, void/correction or other controlled signature meaning. D03 treats signature as disabled/planned unless B07/B08/M04 define meaning, signer identity, SoD, challenge policy, record version/state, reason/evidence links and audit manifestation.

## 4. Regulated/GxP emphasis

D03 marks 57 P0 roots as GxP-eligible and gives them required evidence/audit/signature panels. This is a planning requirement, not a validation claim.

## 5. Stop rules

- No transition requiring evidence may be enabled until evidence type, retention, integrity and ownership are approved.
- No e-sign may be enabled without signature meaning, challenge, signer permission, SoD, record link and audit trail.
- No regulated shell may hide validation/evidence/signature blockers.
- No dashboard/workspace/landing may capture evidence/signature directly.
- No evidence/signature action is allowed offline/stale; D03 default is read-only stale.

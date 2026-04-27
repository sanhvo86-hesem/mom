# V21 Phase 3 Planning Package

Date: 2026-04-25
Based on Phase 2 integration decision: `PHASE2_INTEGRATION_PASS_READY_FOR_PHASE3_PLANNING`

## Planning Boundaries

Phase 3 must remain planning-first until an approved branch/prompt starts a specific slice.

Do not implement Phase 3 from this package. Do not switch current portal navigation, promote fixture registries to `mom/qms-data`, enable live API by default, or create backend APIs without explicit approval.

## Candidate Prompt 1: CDOC Governed Document Record Shell

Goal: plan a read-only governed document record shell for controlled document evidence without changing DCC write authority.

Required outputs:

```text
route contract
fixture contract
read-only mutation posture
portal safety guard list
E2E/axe/visual coverage plan
rollback plan
```

Key boundary:

```text
CDOC shell is a development/prototype read model. DCC service paths remain the authority for document control writes.
```

## Candidate Prompt 2: INSP Inspection Record / Inspection Lot Shell

Goal: plan a read-only inspection record or inspection lot shell for EQMS/MES inspection traceability.

Required outputs:

```text
route contract
inspection lot versus inspection record authority split
fixture contract
SPC/measurement display boundaries
disabled mutation controls
E2E/axe/visual coverage plan
```

Key boundary:

```text
No inspection disposition, release, NCR creation, or measurement mutation is allowed from the prototype shell.
```

## Candidate Prompt 3: BREL Batch Release Read-Only Packet Shell

Goal: plan a read-only batch release packet/record shell that aggregates release evidence without becoming release authority.

Required outputs:

```text
packet evidence sections
source-of-truth map
readiness and exception display states
disabled release controls
fixture and degraded-state contract
E2E/axe/visual coverage plan
```

Key boundary:

```text
Release approval, e-signature, and final disposition must remain governed workflow actions outside the prototype shell.
```

## Candidate Prompt 4: ECO Engineering Change Record Shell

Goal: plan a read-only engineering change record shell for ECO/ECR traceability and digital-thread adjacency.

Required outputs:

```text
ECR/ECO route contract
affected item/revision display contract
related document/program/inspection-plan references
disabled change approval controls
fixture and conflict-state contract
E2E/axe/visual coverage plan
```

Key boundary:

```text
No item revision release, route change, CNC program release, or approval mutation is allowed from the shell.
```

## Candidate Prompt 5: Live API Toggle Replication To CAPA

Goal: plan replication of the ADR-0011 opt-in live API toggle pattern from NQCASE to CAPA.

Required outputs:

```text
CAPA live read endpoint candidate
adapter shape
fixture fallback behavior
auth/error fallback behavior
mutation prohibition evidence
focused E2E plan
```

Key boundary:

```text
Live API remains opt-in only and must not alter current portal default behavior.
```

## Candidate Prompt 6: CI Matrix Hardening

Goal: plan CI hardening for module-template-v4 without masking browser-specific or visual drift failures.

Required outputs:

```text
current local matrix evidence
CI runtime budget
Chromium-only versus all-browser gate decision
artifact retention plan
snapshot update policy
failure triage taxonomy
```

Key boundary:

```text
Do not enable an all-browser required gate until the cost, artifact storage, and triage policy are explicit.
```

## Recommended Sequencing

1. CI matrix hardening plan.
2. CAPA live API toggle replication plan.
3. CDOC governed document record shell plan.
4. INSP inspection record / inspection lot shell plan.
5. ECO engineering change record shell plan.
6. BREL batch release read-only packet shell plan.

This sequence keeps platform quality and current portal safety ahead of new shell breadth.

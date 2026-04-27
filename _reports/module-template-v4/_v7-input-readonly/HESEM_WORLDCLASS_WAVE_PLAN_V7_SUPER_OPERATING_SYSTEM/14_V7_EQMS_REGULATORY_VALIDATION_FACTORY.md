# 14 — eQMS, Regulatory and Validation Factory
## Validation stance

Regulated claims require intended use, risk classification, requirements, tests, traceability and validation report. V7 treats validation as a factory built into the wave plan, not a late documentation exercise.

## Validation artifact stack

| Artifact | When required | Owner |
| --- | --- | --- |
| Intended Use Statement | all regulated/gxP features | Product + Quality |
| Risk Assessment | feature can affect product quality/safety/data integrity | Validation + Domain |
| User Requirements Specification | maturity 6 promotion | Validation |
| Functional/Configuration Spec | workflow/API/e-sign/data regulated behaviors | Engineering + Validation |
| Traceability Matrix | all regulated requirements | Validation |
| IQ/OQ/PQ Protocols | validation package | Validation + QA |
| Validation Report | maturity 6 exit | Validation Owner |
| Periodic Review | sustained controlled use | Quality + SRE |

## eQMS closed-loop model

Complaint/Finding/Inspection/NQCASE can raise CAPA or SCAR. CAPA links cause, action, verification, effectiveness and related evidence. CDOC version changes can trigger TRAIN requirements. TRAIN status affects worker dispatch eligibility. Audit findings can link to CAPA and risk. Release packet verifies all quality holds and deviations are closed or approved.

## Part 11 / Annex 11 gate

No electronic signature moves beyond placeholder until signature meaning, signer identity, challenge/authentication, record snapshot, audit trail and retention policy are implemented and tested.

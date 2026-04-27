# 07 — Authority Ledger and Operational Truth Graph V3
## Concept

Authority Ledger là bảng quyết định “nguồn sự thật” cho mỗi root/action. Operational Truth Graph V3 là graph biểu diễn objects, states, events, evidence, signatures, data products và AI recommendations. Authority Ledger trả lời: ai được đổi gì, ở đâu, với guard nào. OTG trả lời: vì sao record này có trạng thái này, bằng chứng nào, liên quan đến root nào.

## Ledger fields

| Field | Meaning |
| --- | --- |
| root_code | Canonical code such as NQCASE/CAPA/WO/LOT |
| resource_family | URL/API family token |
| authority_class | authoritative/projection/dependency/platform/vertical |
| allowed_commands | Commands permitted from command bus |
| forbidden_surfaces | Workspaces/screens where mutation is forbidden |
| guard_requirements | Policy/workflow/evidence/e-sign/data validations |
| audit_requirements | Before/after, actor, reason, timestamp, correlation |
| rollback_model | Compensating command, revert, or no-reversal policy |
| maturity_level | 0-7 evidence-backed maturity |
| validation_scope | regulated/not regulated/intended use/risk class |

## OTG node types

| Node type | Examples | Authority source |
| --- | --- | --- |
| Business root | SO, PO, JO, WO, NQCASE, CAPA | root record |
| Master/dependency | ITEM, SUP, EQP, MDEV | master data authority |
| Evidence | inspection result, photo, file, measurement | Evidence Spine |
| Workflow event | state transition, guard decision | Workflow Spine |
| Signature | approval/disposition/release signoff | Evidence/eSign Spine |
| Data product | OEE data product, quality trend | Data Contract Factory |
| AI recommendation | summary, risk explanation, missing-evidence check | AI Governance |

## OTG edge types

| Edge | Meaning | Test |
| --- | --- | --- |
| DERIVES_FROM | record/event derived from prior root | lineage traversal |
| EXECUTES | WO/OPER executes JO/routing | execution evidence |
| CONSUMES | operation consumes LOT/material | genealogy completeness |
| PRODUCES | operation produces LOT/serial | genealogy completeness |
| INSPECTED_BY | lot/work order inspected by INSP | inspection linkage |
| RAISES | inspection/nonconformance raises NQCASE | quality trigger |
| CORRECTED_BY | NQCASE/FINDING corrected by CAPA/SCAR | closed-loop quality |
| RELEASED_BY | lot/batch released by BREL/ESIGN | release packet |
| EXPLAINS | AI recommendation explains evidence gaps | AI advisory evidence |

## Canonical decision flow

A mutation request becomes a command. The command checks Authority Ledger, Policy, Workflow Guard, Evidence Requirements, e-sign boundary, data contract and idempotency key. If accepted, it emits audit event, workflow event, domain event, OTG node/edge updates and observability traces. If rejected, it returns RFC 9457 problem details.

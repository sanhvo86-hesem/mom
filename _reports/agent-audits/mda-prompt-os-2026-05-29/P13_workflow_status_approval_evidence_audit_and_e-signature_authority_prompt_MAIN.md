# P13 Main

## Source-truth audit

| claim_id | claim | source_tag | exact_source_path_or_url | confidence | risk_if_wrong | verification_action | status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| P13-CLAIM-001 | current repo already has a workflow/status unification target. | REPO_EVIDENCE | `docs/backend/WORKFLOW_STATUS_UNIFICATION_SPEC.md` | High | split status authority persists | use it as canonical generator basis | verified |
| P13-CLAIM-002 | approval and workflow bridge logic already exists but is fragmented. | REPO_EVIDENCE | `mom/api/services/ApprovalWorkflowAdapter.php` | High | approval semantics guessed | centralize route and SoD rules | verified |
| P13-CLAIM-003 | e-sign challenge infrastructure exists in migration history. | REPO_EVIDENCE | `mom/database/migrations/126_e_signature_auth_challenges.sql` | High | weak signature assumptions | keep challenge and replay controls explicit | verified |
| P13-CLAIM-004 | document control and quality contracts already require immutable released records and audits. | REPO_EVIDENCE | `mom/contracts/objects/quality_improvement--document-control/contract.json`; `mom/contracts/objects/quality_improvement--nonconformances/contract.json` | High | release and quality actions may remain unaudited | bind evidence and signatures to record version/hash | verified |
| P13-CLAIM-005 | OPC UA security and NIST governance support authenticated, auditable edge/user claims but not site policy choices. | CURRENT_OFFICIAL_REFERENCE | [OPC UA](https://opcfoundation.org/about/opc-technologies/opc-ua/); [NIST CSF](https://www.nist.gov/cyberframework) | Medium | local policy may be overclaimed from generic standards | keep applicability-gated site policy model | verified |

## Authority decisions

1. There is one workflow/status source per governed root, and everything else is generated from it.
2. Approval policy, evidence object policy, and e-sign policy are shared services referenced by commands, not local controller logic.
3. Every regulated approval or release binds signer identity, meaning, timestamp, record id, version, and hash.
4. Audit trail is append-only and reconstructable across command, workflow, evidence, and signature layers.

## Repair pass applied in P13

1. Published `MDA_WORKFLOW_STATUS_AUTHORITY.md`.
2. Published `MDA_APPROVAL_POLICY_MATRIX.csv`, `MDA_EVIDENCE_OBJECT_MODEL.md`, and `MDA_ESIGN_POLICY.md`.
3. Locked derived-state vs lifecycle-state separation to prevent stale aliases like `overdue` becoming workflow truth.
4. Carried training and delegation checks into approval and signature policy.

## Decision token

`P13_PASS_WITH_CONTROLLED_GAPS`

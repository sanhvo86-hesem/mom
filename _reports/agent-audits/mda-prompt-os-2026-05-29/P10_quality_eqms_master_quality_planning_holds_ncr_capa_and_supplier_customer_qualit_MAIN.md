# P10 Main

## Source-truth audit

| claim_id | claim | source_tag | exact_source_path_or_url | confidence | risk_if_wrong | verification_action | status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| P10-CLAIM-001 | canonical NCR and CAPA contracts already exist with governed workflows. | REPO_EVIDENCE | `mom/contracts/objects/quality_improvement--nonconformances/contract.json`; `mom/contracts/objects/quality_improvement--corrective-actions/contract.json` | High | quality case lifecycle could be modeled from memory instead of repo truth | anchor NCR/CAPA to current contracts | verified |
| P10-CLAIM-002 | IQC already has a governed canonical object with pass/fail/conditional outcomes and downstream NCR/quarantine semantics. | REPO_EVIDENCE | `mom/contracts/objects/procurement_supplier_quality--iqc-inspections/contract.json` | High | inbound quality gate could be underspecified | anchor IQC hold logic to current contract | verified |
| P10-CLAIM-003 | document control already has released revision and training-adjacent semantics, separate from engineering change control. | REPO_EVIDENCE | `mom/contracts/objects/quality_improvement--document-control/contract.json` | High | document/training gate could be mixed with ECC | keep QMS DCC separate and linked | verified |
| P10-CLAIM-004 | runtime status and command surfaces for NCR/deviation/quality transitions already exist but remain fragmented across stores and triggers. | REPO_EVIDENCE | `docs/backend/WORKFLOW_STATUS_UNIFICATION_SPEC.md`; `mom/contracts/command-index.json` | High | quality authority could overclaim a unified implementation | model unified policy while keeping fragmentation as a gap | verified |
| P10-CLAIM-005 | audit columns already exist on `ncr_records` and `capa_records`. | REPO_EVIDENCE | `mom/database/migrations/113_audit_columns.sql` | High | evidence lineage could be missed | rely on audited quality records as current foundation | verified |

## Authority decisions

1. `QualityOrder` / inspection / hold / NCR / CAPA / complaint / SCAR must form one linked quality chain; no defect signal is allowed to disappear into an isolated note or projection.
2. hold authority is scoped: `InventoryHold`, `ShipmentHold`, and broad `QualityHold` are separate but must reconcile through one gate policy.
3. quality result integrity requires plan revision, characteristic, method, gage/MSA validity, actor qualification, and immutable timestamps/evidence.
4. customer and supplier quality outcomes are not side topics; they directly influence release, receipt, shipment, and approval authority.

## Repair pass applied in P10

1. Unified IQC/IPQC/OQC, holds, NCR/CAPA, complaint, and supplier quality under one gate policy.
2. Locked source-linkage so every quality case must point back to inspection/lot/serial/WO/machine/operator/tool/shipment/supplier/customer evidence.
3. Connected DCC document revision and training currentness into inspector/operator/approver qualification gates.
4. Made SCAR/8D overdue status a downstream block on supplier receipt/approval logic rather than an isolated dashboard fact.

## Decision token

`P10_PASS_WITH_CONTROLLED_GAPS`

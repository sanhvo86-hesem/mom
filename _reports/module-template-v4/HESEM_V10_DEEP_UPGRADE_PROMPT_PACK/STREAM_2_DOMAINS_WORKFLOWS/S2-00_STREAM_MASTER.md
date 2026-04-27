# Stream 2 — Domains + Workflows — Stream Master

```
stream_id:        S2
stream_name:      Domains + Workflows
sub_prompt_count: 14
estimated_total:  14 × ~80 min ≈ 19 hours
```

## Stream goal

Upgrade V9 business domains C1..C11 (excluding cross-cutting C12-C14
in S1) and all 14 workflows D1..D14 from V9-shallow to V10
GPT-Pro-equivalent depth.

This stream owns the largest body of business specification: 11
domains × 7-15 capabilities each + 14 end-to-end workflows. Backend
+ frontend execution depends on this stream's depth.

## Files this stream upgrades

```
PART_C_DOMAIN_CAPABILITIES/C1_COMMERCIAL_CUSTOMER.md
PART_C_DOMAIN_CAPABILITIES/C2_PRODUCT_ENGINEERING.md
PART_C_DOMAIN_CAPABILITIES/C3_PLANNING_PRODUCTION.md
PART_C_DOMAIN_CAPABILITIES/C4_PROCUREMENT.md
PART_C_DOMAIN_CAPABILITIES/C5_INVENTORY_LOGISTICS.md
PART_C_DOMAIN_CAPABILITIES/C6_SHOPFLOOR_MES.md
PART_C_DOMAIN_CAPABILITIES/C7_QUALITY_IMPROVEMENT.md
PART_C_DOMAIN_CAPABILITIES/C8_TRACEABILITY_GENEALOGY.md
PART_C_DOMAIN_CAPABILITIES/C9_MAINTENANCE_EHS.md
PART_C_DOMAIN_CAPABILITIES/C10_WORKFORCE_TRAINING.md
PART_C_DOMAIN_CAPABILITIES/C11_FINANCE.md
PART_D_WORKFLOW_CATALOG/D1_ORDER_TO_CASH.md
PART_D_WORKFLOW_CATALOG/D2_PROCUREMENT_TO_PAY.md
PART_D_WORKFLOW_CATALOG/D3_PLAN_TO_PRODUCE.md
PART_D_WORKFLOW_CATALOG/D4_RECEIVE_TO_INSPECT.md
PART_D_WORKFLOW_CATALOG/D5_INSPECT_TO_DISPOSITION.md
PART_D_WORKFLOW_CATALOG/D6_NC_TO_CAPA.md
PART_D_WORKFLOW_CATALOG/D7_DOCUMENT_TO_RELEASE.md
PART_D_WORKFLOW_CATALOG/D8_TRAIN_TO_QUALIFY.md
PART_D_WORKFLOW_CATALOG/D9_MAINTAIN_TO_RESTORE.md
PART_D_WORKFLOW_CATALOG/D10_BATCH_TO_RELEASE.md
PART_D_WORKFLOW_CATALOG/D11_RELEASE_TO_TRACE.md
PART_D_WORKFLOW_CATALOG/D12_COMPLAINT_TO_RECALL.md
PART_D_WORKFLOW_CATALOG/D13_AUDIT_TO_REMEDIATE.md
PART_D_WORKFLOW_CATALOG/D14_VALIDATE_TO_QUALIFY.md
```

## Stream-level depth requirements

### Domain chapters (C1..C11)

Per chapter:
```
1.  Resource family enumeration (every authoritative root +
    every sub-record; per M3)
2.  Per-root entity model (full field list; semantic;
    constraint; PII flag; mutability)
3.  Per-root state machine (full transition table per S1-04)
4.  Capabilities (≥ 8-15 per domain; per V8 CAP-CN-NN format
    or equivalent)
    Per capability:
    - Purpose
    - Lifecycle
    - Integration with state machine
    - Wave target (L4 / L5 / L6 / L7)
    - Acceptance evidence
5.  Per-domain APIs (cross-link to E catalog)
6.  Per-domain frontend surfaces (cross-link to F catalog)
7.  Per-domain cross-cutting concerns instantiation
8.  Per-domain wave assignments (per G)
9.  Per-domain standards (with clause-level)
10. Per-domain boundary with adjacent domains
11. Per-pack overlay (J1..J5)
12. Per-domain failure modes
13. Per-domain KPIs
14. Decision phrase
```

### Workflow chapters (D1..D14)

Per chapter:
```
1.  Purpose + boundary
2.  Trigger catalog (≥ 15-20 triggers; concrete)
3.  Actors + authority (per E1 + E2)
4.  Primary state machine (full transition table per M4)
5.  Step-by-step substance (per step):
    - actor
    - input
    - decision points
    - check (every guard explicit)
    - output
    - evidence emit (per H4)
    - SLO target
    - failure modes
    - per-pack overlay
6.  Branches (workflow variants ≥ 15)
7.  Cross-domain footprint (which domains; primary + supporting)
8.  Pack overlays (J1..J5)
9.  KPIs + targets
10. Failure modes catalog with concrete recovery
11. RACI per major action
12. Cross-references inter-Part
13. Decision phrase
```

## Sub-prompts

```
S2-01  C1 Commercial + C2 Engineering
S2-02  C3 Planning + C4 Procurement
S2-03  C5 Inventory + C6 Shopfloor / MES
S2-04  C7 Quality / eQMS (alone)
S2-05  C8 Traceability + C9 Maintenance
S2-06  C10 Workforce + C11 Finance
S2-07  D1 Order to Cash (alone)
S2-08  D2 Procurement to Pay + D3 Plan to Produce
S2-09  D4 Receive to Inspect + D5 Inspect to Disposition
S2-10  D6 NC to CAPA + D7 Document to Release
S2-11  D8 Train to Qualify + D9 Maintain to Restore
S2-12  D10 Batch to Release (alone)
S2-13  D11 Release to Trace + D12 Complaint to Recall
S2-14  D13 Audit to Remediate + D14 Validate to Qualify
```

## Anti-patterns

Same as Stream 1 master. Plus specifically:
- "Comprehensive workflow management" — definitional fluff
- "Robust quality system" — pick concrete clauses
- Treating workflow steps as bullets instead of full spec rows
- Skipping "decision points" within steps

## Reference materials

- ISA-95 + ISA-88 functional + batch hierarchy
- 21 CFR 211 + 820 + 11 + 803; EU GMP Annex 11/15/16/1;
  IATF 16949; AIAG-VDA FMEA 2019; ISO 13485; ISO 14971;
  AS9100D + AS9102 + AS9145; AS5553 + AS6174;
  FSMA Part 117 + §204; HACCP Codex; DSCSA + EU FMD;
  ICH Q7-Q14; ICH E2B(R3)
- DDD bounded-context patterns
- Saga + TCC patterns

## Stream decision phrase

```
STREAM_2_DOMAINS_WORKFLOWS_DEEP_UPGRADE_COMPLETE
```

---
END S2-00 STREAM MASTER

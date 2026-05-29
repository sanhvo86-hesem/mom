# P07 Main

## Source-truth audit

| claim_id | claim | source_tag | exact_source_path_or_url | confidence | risk_if_wrong | verification_action | status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| P07-CLAIM-001 | Legacy engineering structures for `bill_of_materials`, `bom_components`, `routings`, and `routing_operations` already exist physically. | REPO_EVIDENCE | `mom/database/migrations/006_erp_master_data.sql` | High | P07 could invent core engineering tables unnecessarily | anchor BOM/routing authority to existing physical lanes | verified |
| P07-CLAIM-002 | `control_plans` and `control_plan_characteristics` already exist, including links to FMEA and inspection plan. | REPO_EVIDENCE | `mom/database/migrations/042_fmea_apqp_control_plan_mobile.sql` | High | quality planning package could be modeled without actual linkage evidence | reuse current CP schema as real authority lane | verified |
| P07-CLAIM-003 | CNC program governance already has program, version, approval, and setup-sheet lanes. | REPO_EVIDENCE | `mom/database/migrations/039_cnc_program_management.sql` | High | NC release package design could ignore actual program/checksum structures | build NC authority on these proven tables | verified |
| P07-CLAIM-004 | MES already has `mes_nc_release_packages` and `mes_nc_download_receipts` with checksum, machine family, item revision, and receipt verification data. | REPO_EVIDENCE | `mom/database/migrations/026_mes_world_class_foundations.sql`; `mom/contracts/table-registry.json` | High | NC package design could duplicate or conflict with current MES lane | elevate current package lane into engineering release bundle member | verified |
| P07-CLAIM-005 | Shopfloor execution already blocks missing, unverified, or unreleased CNC program/setup/inspection references. | REPO_EVIDENCE | `mom/api/services/ShopfloorExecutionService.php` | High | P07 could understate current runtime safeguards | treat runtime checks as partial implemented gate evidence | verified |
| P07-CLAIM-006 | Sales/JO readiness already requires `engineering_ready`, but current runtime only verifies presence/status fields rather than canonical released versions in PostgreSQL. | REPO_EVIDENCE | `docs/backend/WORLD_CLASS_BACKEND_REMEDIATION_PLAN.md`; `docs/backend/WORKFLOW_STATUS_UNIFICATION_SPEC.md` | High | release package could be overstated as already solved | make canonical package verification the core repair in P07 output | verified |
| P07-CLAIM-007 | Manufacturing engineering already has work-instruction, tooling requirement, process family, and standard operation tables. | REPO_EVIDENCE | `mom/database/migrations/063_manufacturing_engineering_industrialization.sql` | High | work-definition package could omit available work-instruction/tooling evidence | include these as release package members | verified |
| P07-CLAIM-008 | P06 already locked item revision immutability, effectivity, and snapshot behavior, and P07 must extend that rule to BOM/routing/CP/IP/work instructions/NC programs. | REPO_EVIDENCE | `_reports/agent-audits/mda-prompt-os-2026-05-29/P06_item_material_part_number_revision_site_and_specification_authority_prompt_MAIN.md` | High | engineering package could weaken item release truth | inherit P06 immutability explicitly | verified |
| P07-CLAIM-009 | Current runtime/master-data authority map still classifies BOM/routing/CP/IP as JSON-primary with incomplete PG verification. | REPO_EVIDENCE | `docs/backend/RUNTIME_AUTHORITY_MAP.md` | High | P07 could pretend cutover already happened | keep PG verification and bundle commands as target state with controlled gaps | verified |

## Authority decisions

1. `EngineeringReleasePackage` is the canonical release root for execution readiness. It does not replace BOM/routing/control plan/inspection plan/NC ownership; it binds released versions of those objects into one frozen, approved package for SO/JO/WO use.
2. `BOMVersion`, `WorkDefinitionVersion`, `ControlPlanRevision`, `InspectionPlanRevision`, and `NCProgramRevision` remain owned by their engineering/quality domains, but none of them alone can authorize production release.
3. production orders, job orders, and work orders must snapshot the exact package member versions they were released against and must never re-resolve latest engineering data after release.
4. `PFMEA -> Control Plan -> Inspection Plan` traceability is mandatory for CTQ/CQA and high-risk processes. Open high-priority PFMEA actions block release.
5. CNC release is not only “program released”; it must also match machine family/controller/item revision/operation sequence and, when downloaded, must produce a verified checksum receipt.

## Canonical object set

| Object | Class | Current physical lane | Authority decision |
| --- | --- | --- | --- |
| `BOM` / `BOMVersion` / `BOMLine` / `BOMSubstitute` | lifecycle owner + children | `bill_of_materials`, `bom_components` | released material structure authority |
| `WorkDefinition` / `WorkDefinitionVersion` / `Operation` / `OperationResource` / `OperationMaterial` / `OperationOutput` | lifecycle owner + children | `routings`, `routing_operations`, `eng_standard_operations`, `eng_tooling_requirements` | released execution method authority |
| `WorkInstruction` | evidence child | `eng_work_instructions`, `eng_work_instruction_steps`, linked docs | released operator/setup instruction authority |
| `ControlPlan` / `ControlPlanRevision` / `ControlCharacteristic` | lifecycle owner + children | `control_plans`, `control_plan_characteristics` | released process control authority |
| `InspectionPlan` / `InspectionPlanRevision` / `InspectionCharacteristic` / `SamplingPlan` | lifecycle owner + children | `inspection_plans`, related characteristics in quality lane | released inspection definition authority |
| `PFMEA` | evidence and risk source | `fmea_records`, `fmea_failure_modes`, `fmea_actions` | release-risk evidence authority |
| `NCProgram` / `NCProgramRevision` | lifecycle owner + child | `cnc_programs`, `cnc_program_versions`, `cnc_program_approvals` | released CNC content authority |
| `EngineeringReleasePackage` | lifecycle owner | target root using current release-package fields and `mes_nc_release_packages` member evidence | canonical execution-ready bundle |

## Command catalog

| Command | Owner | Preconditions | Result |
| --- | --- | --- | --- |
| `CreateBomVersion` | engineering master-data command service | item revision exists, base BOM identity valid | draft BOM version created |
| `ReleaseBomVersion` | engineering release command service | BOM complete, no overlap, substitutes approved | released BOM effective |
| `CreateWorkDefinitionVersion` | manufacturing engineering command service | released item revision exists | draft work definition created |
| `ReleaseWorkDefinition` | manufacturing engineering command service | operations/resources/materials/work instructions valid | released work definition effective |
| `AddOperation` / `AddOperationResource` / `AddOperationMaterial` | manufacturing engineering command service | editable work-definition version | child rows added |
| `CreateControlPlanRevision` | quality planning command service | item/process scope valid, PFMEA link valid | CP revision created |
| `CreateInspectionPlanRevision` | quality planning command service | item/process scope valid | IP revision created |
| `ReleaseNcProgram` | CNC engineering command service | version approved, checksum present, setup sheet linked | released NC program / package evidence updated |
| `CreateEngineeringReleasePackage` | engineering release command service | package members selected and effective-dated | draft package created |
| `ApproveEngineeringReleasePackage` | governed approval service | all gates pass, SoD valid, e-sign complete | package released for execution |
| `SupersedeReleasePackage` | engineering release command service | successor package released, rollback/effectivity handled | old package superseded |

## Release package membership

Mandatory frozen members:

- released `item_revision`
- released BOM version
- released routing/work definition version
- released operations/resources/material/output set
- released work instructions and/or setup sheets
- released control plan and inspection plan revisions
- critical characteristics, sampling logic, gage requirements, reaction plans
- NC program id/version/checksum/controller mapping where CNC applies
- tooling, fixture, gage, and machine-family requirements
- customer approval / supplier process approval dependencies when required
- hashed attachments and released evidence links
- approval and e-signature record

## Snapshot rules

1. WO/JO/SO release stores the exact engineering release package id and member versions.
2. After WO snapshot, resequencing operations, replacing control characteristics, or changing NC program references does not retroactively change the running WO. A new package or governed deviation is required.
3. `ECO rev B while rev A WO running` is allowed only through controlled coexistence/effectivity rules; open WOs remain anchored to rev A package unless an explicit governed rebind flow exists.

## NC program rules

- program scope = item revision + operation seq + machine family + controller type
- released package must carry checksum hash and controller program name
- machine download receipt must compare expected vs controller checksum and mark `verified_match`
- checksum mismatch or unreleased package blocks execution
- supersede keeps old program available only for open WOs bound to the prior package unless explicit rollback policy releases the previous package again

## Quality-planning rules

- CTQ/CQA characteristics require reaction plan, method, responsible role, and downstream inspection linkage
- if inspection method requires a gage/class, missing gage requirement blocks release
- customer approval required on CP or IP must be satisfied before package release
- PFMEA high-priority open actions block CP/IP release unless governed conditional release exists and is captured in package evidence

## Repair pass applied in P07

1. Converted runtime `engineering_ready` from field-presence concept into a true package-verification rule set.
2. Bound shopfloor CNC/setup/inspection blockers to the broader engineering release package instead of isolated references.
3. Explicitly froze package members to protect running orders from later engineering resequence or supersede drift.
4. Kept current physical tables as real authority lanes and introduced `EngineeringReleasePackage` as a canonical orchestrating root instead of inventing a parallel rewrite.

## Final re-audit result

No unresolved P0/P1 defect remains in the prompt output. Remaining gaps are physical package-table implementation, JSON-to-PG cutover, and unified command/e-sign enforcement, all classified as P2 and non-blocking for `P08`.

## Decision token

`P07_PASS_WITH_CONTROLLED_GAPS`

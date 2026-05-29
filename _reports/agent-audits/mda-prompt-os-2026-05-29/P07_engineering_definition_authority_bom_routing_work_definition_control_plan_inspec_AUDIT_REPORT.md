# P07 Adversarial Audit

| audit_id | role | attack_question | finding | severity(P0-P3) | affected_artifact | repair_required | repair_action | residual_risk |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| P07-AUD-ARC-01 | Chief Enterprise Architect | Can BOM/routing/CP/IP each self-release production independently? | Without a package root, release truth fragments. | P1 | `P07_MAIN` | Y | elevate EngineeringReleasePackage as canonical release root | low |
| P07-AUD-ARC-02 | Chief Enterprise Architect | Are frozen order snapshots protected? | later engineering edits could leak into live WOs. | P1 | `P07_MAIN` | Y | add explicit package snapshot rules | low |
| P07-AUD-ARC-03 | Chief Enterprise Architect | Does P07 invent a framework rewrite? | repo needs extension, not replacement. | P2 | `P07_MAIN` | Y | reuse current tables and runtime guards | low |
| P07-AUD-ARC-04 | Chief Enterprise Architect | Are member owners preserved under the bundle root? | bundle could incorrectly absorb domain ownership. | P1 | `P07_MAIN` | Y | keep bundle as orchestrating root only | low |
| P07-AUD-ARC-05 | Chief Enterprise Architect | Is release package still just a checklist? | field presence alone is insufficient authority. | P1 | `MDA_ENGINEERING_RELEASE_GATE_MATRIX.csv` | Y | convert to source-object/status/effectivity gate matrix | low |
| P07-AUD-MES-01 | Manufacturing/MES Architect | Can routing use inactive work center or invalid resource? | runtime execution would fail or misroute work. | P1 | `P07_MAIN` | Y | add operation-resource gate | low |
| P07-AUD-MES-02 | Manufacturing/MES Architect | Can operation resequence after WO snapshot? | open WOs would lose deterministic sequence. | P1 | `P07_SIMULATION` | Y | add snapshot freeze scenario | low |
| P07-AUD-MES-03 | Manufacturing/MES Architect | Can outside processing proceed without supplier-process approval? | routing/resource release would be unsafe. | P2 | `P07_GAP_LEDGER` | Y | carry supplier approval dependency from P05/P06 | medium |
| P07-AUD-MES-04 | Manufacturing/MES Architect | Can backflush bypass manual traceability requirements? | lot-trace components need explicit override logic. | P1 | `P07_SIMULATION` | Y | add traceability vs backflush scenario | low |
| P07-AUD-MES-05 | Manufacturing/MES Architect | Is work definition distinct from BOM? | material list and execution sequence must not be conflated. | P1 | `P07_MAIN` | Y | separate BOM from work definition authority | low |
| P07-AUD-ERP-01 | ERP/Finance Architect | Does engineering_ready verify actual released versions? | current runtime only checks status/presence. | P1 | `P07_MAIN` | Y | make package verification explicit | low |
| P07-AUD-ERP-02 | ERP/Finance Architect | Can yield changes create material shortage unnoticed? | planning/procurement impact may be hidden. | P2 | `P07_SIMULATION` | Y | add yield-shortage scenario | medium |
| P07-AUD-ERP-03 | ERP/Finance Architect | Can rollback to older package ignore open SO/JO/WO commitments? | rollback can corrupt planning assumptions. | P2 | `P07_SIMULATION` | Y | add rollback scenario with coexistence rule | medium |
| P07-AUD-ERP-04 | ERP/Finance Architect | Can customer approvals be forgotten in engineering package? | commercial compliance would break late. | P1 | `MDA_ENGINEERING_RELEASE_GATE_MATRIX.csv` | Y | make customer approval a gate condition | low |
| P07-AUD-ERP-05 | ERP/Finance Architect | Are attachments/evidence hash-bound? | release packets without evidence hashes are weak. | P1 | `P07_MAIN` | Y | require attachment hash/record link | low |
| P07-AUD-QUAL-01 | Quality/Regulatory Lead | Can control plan CTQ release without reaction plan? | high-risk process control would be incomplete. | P1 | `P07_MAIN` | Y | add CTQ reaction-plan rule | low |
| P07-AUD-QUAL-02 | Quality/Regulatory Lead | Can gage-based inspection release without gage class/requirement? | measurement readiness would be unprovable. | P1 | `MDA_ENGINEERING_RELEASE_GATE_MATRIX.csv` | Y | add gage gate | low |
| P07-AUD-QUAL-03 | Quality/Regulatory Lead | Can PFMEA actions stay open while CP is released? | risk closure would be fake. | P1 | `P07_MAIN` | Y | add open-action blocker | low |
| P07-AUD-QUAL-04 | Quality/Regulatory Lead | Can obsolete work instruction remain referenced? | operator guidance would be invalid. | P1 | `P07_SIMULATION` | Y | add obsolete instruction scenario | low |
| P07-AUD-QUAL-05 | Quality/Regulatory Lead | Is PFMEA->CP->IP traceability explicit? | disconnected quality planning weakens audit trail. | P1 | `P07_MAIN` | Y | state the mandatory traceability chain | low |
| P07-AUD-MDG-01 | Master Data Governance Lead | Are overlaps in BOM effectivity prevented? | overlapping BOM truth causes ambiguous issue logic. | P1 | `P07_MAIN` | Y | add no-overlap release rule | low |
| P07-AUD-MDG-02 | Master Data Governance Lead | Can substitute BOM lines release without approval? | shadow substitute authority would appear. | P1 | `P07_SIMULATION` | Y | add substitute approval scenario | low |
| P07-AUD-MDG-03 | Master Data Governance Lead | Are JSON master-data shadows still treated as authority? | PG verification is still incomplete today. | P2 | `P07_GAP_LEDGER` | Y | retain cutover gap explicitly | medium |
| P07-AUD-MDG-04 | Master Data Governance Lead | Can release package members drift after approval? | silent member mutation would break authority. | P1 | `P07_MAIN` | Y | freeze exact member versions and hashes | low |
| P07-AUD-MDG-05 | Master Data Governance Lead | Is traveler/gate profile scope explicit? | readiness depends on these auxiliary objects too. | P2 | `MDA_ENGINEERING_RELEASE_GATE_MATRIX.csv` | Y | include traveler and quality gate profile | low |
| P07-AUD-DBA-01 | DBA/PostgreSQL Architect | Are audit and actor columns acknowledged? | released engineering objects need lineage. | P2 | `P07_MAIN` | Y | reuse audit-column evidence and carry remaining uplift gap | low |
| P07-AUD-DBA-02 | DBA/PostgreSQL Architect | Does package root physically exist? | not yet proven as a table. | P2 | `P07_GAP_LEDGER` | Y | mark as target implementation gap | low |
| P07-AUD-DBA-03 | DBA/PostgreSQL Architect | Can NC package mismatch be proven? | checksum receipt lane must be part of authority. | P1 | `P07_MAIN` | Y | bind release to download receipts | low |
| P07-AUD-DBA-04 | DBA/PostgreSQL Architect | Are release statuses normalized enough? | mixed `active/approved/released` states across objects can confuse gate logic. | P2 | `P07_MAIN` | Y | normalize gate matrix to required status semantics | medium |
| P07-AUD-DBA-05 | DBA/PostgreSQL Architect | Are future bundle-member tables falsely assumed? | avoid fake implementation claims. | P2 | `P07_MAIN` | Y | keep target additions as inference/gaps | low |
| P07-AUD-API-01 | API/Integration Architect | Can public APIs keep working while bundle authority hardens? | route renaming would break runtime clients. | P1 | `P07_MAIN` | Y | treat bundle as authority model, not immediate API rename | low |
| P07-AUD-API-02 | API/Integration Architect | Are current runtime blockers aligned with package logic? | isolated service checks can diverge. | P2 | `P07_MAIN` | Y | map them into one gate matrix | low |
| P07-AUD-API-03 | API/Integration Architect | Can external systems know why release failed? | failure codes must be explicit. | P1 | `MDA_ENGINEERING_RELEASE_GATE_MATRIX.csv` | Y | add failure_code column | low |
| P07-AUD-API-04 | API/Integration Architect | Are package events defined at high enough level? | downstream consumers need one release-ready event. | P2 | `P07_MATRIX` | Y | add package released event row | low |
| P07-AUD-API-05 | API/Integration Architect | Can stale version submission collide concurrently? | package approval must be concurrency-safe. | P2 | `P07_SIMULATION` | Y | add retry/stale version cases implicitly in repair | medium |
| P07-AUD-SEC-01 | Security/IAM/SoD Lead | Can originator approve the release package? | SoD breach invalidates release. | P1 | `P07_SIMULATION` | Y | add originator-approver block scenario | low |
| P07-AUD-SEC-02 | Security/IAM/SoD Lead | Is e-sign mandatory for final release? | engineering package approval is regulated enough to require strong evidence. | P1 | `P07_MAIN` | Y | include e-sign as mandatory package member | low |
| P07-AUD-SEC-03 | Security/IAM/SoD Lead | Are attachments content-addressed? | mutable attachment pointers are weak evidence. | P1 | `P07_MAIN` | Y | require hash and record link | low |
| P07-AUD-SEC-04 | Security/IAM/SoD Lead | Can AI auto-release package? | AI advisory boundary must hold. | P1 | `P07_MAIN` | Y | keep AI out of mutation authority | low |
| P07-AUD-SEC-05 | Security/IAM/SoD Lead | Is rollback controlled and attributable? | rollback to older rev is a governed action. | P2 | `P07_SIMULATION` | Y | add rollback simulation with approval | medium |
| P07-AUD-SHOP-01 | Shopfloor Supervisor | Can work start without traveler/inspection references? | floor execution loses operational guidance. | P1 | `MDA_ENGINEERING_RELEASE_GATE_MATRIX.csv` | Y | include traveler/inspection gates | low |
| P07-AUD-SHOP-02 | Shopfloor Supervisor | Can setup sheet be draft while work starts? | setup readiness would be fake. | P1 | `P07_MAIN` | Y | released setup sheet required when applicable | low |
| P07-AUD-SHOP-03 | Shopfloor Supervisor | Can wrong CNC program download still run? | checksum mismatch must block. | P1 | `P07_MAIN` | Y | bind receipt verification to execution block | low |
| P07-AUD-SHOP-04 | Shopfloor Supervisor | Can rev A WO be silently rebound to rev B? | open work must keep frozen package. | P1 | `P07_MAIN` | Y | freeze snapshot rule | low |
| P07-AUD-SHOP-05 | Shopfloor Supervisor | Can backflush hide lot scan obligation? | traceability requirement can override automation. | P1 | `P07_SIMULATION` | Y | add backflush-vs-traceability scenario | low |
| P07-AUD-WH-01 | Warehouse/Inventory Lead | Can released BOM line substitute skip approval? | material issue would diverge from approved structure. | P1 | `P07_SIMULATION` | Y | add BOM substitute block | low |
| P07-AUD-WH-02 | Warehouse/Inventory Lead | Can operation yield change create shortage after release? | downstream material availability impact must be visible. | P2 | `P07_SIMULATION` | Y | add yield shortage scenario | medium |
| P07-AUD-WH-03 | Warehouse/Inventory Lead | Can manual lot scan be skipped because backflush is true? | traceability policy may require scan regardless. | P1 | `P07_MAIN` | Y | explicit override precedence | low |
| P07-AUD-WH-04 | Warehouse/Inventory Lead | Are supplier outside-process approvals checked? | outsourced steps affect inventory flow and compliance. | P2 | `MDA_ENGINEERING_RELEASE_GATE_MATRIX.csv` | Y | include supplier-process approval gate | medium |
| P07-AUD-WH-05 | Warehouse/Inventory Lead | Can rollback package invalidate open pick/kit reservations? | package change affects staged material. | P2 | `P07_SIMULATION` | Y | include rollback impacts | medium |
| P07-AUD-MNT-01 | Maintenance/Calibration Lead | Are machine-family and controller compatibility enforced? | wrong machine/controller can damage assets. | P1 | `P07_MAIN` | Y | include machine family/controller in NC scope | low |
| P07-AUD-MNT-02 | Maintenance/Calibration Lead | Can inactive work center still appear on release package? | maintenance/availability truth would be bypassed. | P1 | `P07_MAIN` | Y | gate inactive work center references | low |
| P07-AUD-MNT-03 | Maintenance/Calibration Lead | Are gage/tooling requirements included? | calibration-critical assets must be explicit. | P1 | `P07_MAIN` | Y | include tooling/fixture/gage members | low |
| P07-AUD-MNT-04 | Maintenance/Calibration Lead | Can setup sheets omit safety details? | machine setup release may be unsafe. | P2 | `P07_MAIN` | Y | treat setup sheet as released work instruction evidence | low |
| P07-AUD-MNT-05 | Maintenance/Calibration Lead | Can receipt verification ignore equipment id? | checksum proof must tie to machine/equipment. | P1 | `P07_MAIN` | Y | keep equipment-scoped receipt chain | low |
| P07-AUD-TOOL-01 | Tooling/CNC Process Engineer | Can NC revision ignore operation sequence? | same item may use different programs by op. | P1 | `P07_MAIN` | Y | include operation seq in program scope | low |
| P07-AUD-TOOL-02 | Tooling/CNC Process Engineer | Is checksum optional at release? | release without checksum is weak and unsafe. | P1 | `P07_MAIN` | Y | make checksum mandatory for CNC release | low |
| P07-AUD-TOOL-03 | Tooling/CNC Process Engineer | Can obsolete work instruction or setup sheet remain linked? | stale setup guidance can cause scrap. | P1 | `P07_SIMULATION` | Y | add obsolete instruction scenario | low |
| P07-AUD-TOOL-04 | Tooling/CNC Process Engineer | Are tooling/fixture requirements tied to operation? | generic kit references are too weak. | P2 | `P07_MAIN` | Y | scope tooling by op/item/rev | low |
| P07-AUD-TOOL-05 | Tooling/CNC Process Engineer | Can previous NC package be restored without controls? | rollback must be governed. | P2 | `P07_SIMULATION` | Y | add rollback scenario | medium |
| P07-AUD-DATA-01 | Data/AI Governance Lead | Can JSON master-data shadow remain hidden authority? | PG verification gap must be explicit. | P2 | `P07_GAP_LEDGER` | Y | keep migration gap visible | medium |
| P07-AUD-DATA-02 | Data/AI Governance Lead | Are release package members lineaged? | bundle without member lineage becomes opaque. | P1 | `P07_MAIN` | Y | freeze member versions and hashes | low |
| P07-AUD-DATA-03 | Data/AI Governance Lead | Can AI decide release readiness? | advisory boundary risk. | P1 | `P07_MAIN` | Y | keep AI non-authoritative | low |
| P07-AUD-DATA-04 | Data/AI Governance Lead | Are derived warnings mistaken for authority? | shopfloor warnings must not replace governed release checks. | P2 | `P07_MAIN` | Y | classify runtime warnings as partial implemented evidence | low |
| P07-AUD-DATA-05 | Data/AI Governance Lead | Is PFMEA->CP->IP traceability machine-readable? | auditability suffers if implicit only. | P1 | `P07_MAIN` | Y | make traceability explicit | low |
| P07-AUD-SRE-01 | SRE/Observability Lead | Are release gate failures enumerated? | oncall cannot diagnose hidden blockers. | P1 | `MDA_ENGINEERING_RELEASE_GATE_MATRIX.csv` | Y | explicit failure codes | low |
| P07-AUD-SRE-02 | SRE/Observability Lead | Is checksum mismatch observable? | CNC incidents require telemetry. | P2 | `P07_MATRIX` | Y | add mismatch metrics | low |
| P07-AUD-SRE-03 | SRE/Observability Lead | Are stale package member drifts measurable? | need drift counter once package root exists. | P2 | `P07_GAP_LEDGER` | Y | carry package-drift telemetry requirement | medium |
| P07-AUD-SRE-04 | SRE/Observability Lead | Can rollback/retry remain idempotent? | release package approval must be replay-safe. | P2 | `P07_GAP_LEDGER` | Y | carry command-envelope dependency | medium |
| P07-AUD-SRE-05 | SRE/Observability Lead | Are field-presence checks distinguishable from canonical checks? | mixed signals hamper cutover. | P2 | `P07_MAIN` | Y | explicitly classify current runtime as partial | low |
| P07-AUD-EXT-01 | External Auditor/Customer Auditor | Can you prove exactly what technical definition a WO used? | without frozen package, evidence is weak. | P1 | `P07_MAIN` | Y | freeze package members per WO | low |
| P07-AUD-EXT-02 | External Auditor/Customer Auditor | Can you prove non-originator approved the release? | SoD proof is essential. | P1 | `P07_SIMULATION` | Y | add SoD approval scenario | low |
| P07-AUD-EXT-03 | External Auditor/Customer Auditor | Can you prove program on machine matched released checksum? | download receipt verification is required. | P1 | `P07_MAIN` | Y | bind release to receipt chain | low |
| P07-AUD-EXT-04 | External Auditor/Customer Auditor | Can you prove CTQ had linked control and inspection reaction? | quality planning chain must be explicit. | P1 | `P07_MAIN` | Y | PFMEA->CP->IP traceability requirement | low |
| P07-AUD-EXT-05 | External Auditor/Customer Auditor | Can package rollback be traced? | older-package reuse needs audit basis. | P2 | `P07_SIMULATION` | Y | add rollback audit scenario | medium |

## Re-audit conclusion

All P1 findings are repaired in the prompt output. Remaining exposure is limited to P2 physical implementation and cutover gaps.

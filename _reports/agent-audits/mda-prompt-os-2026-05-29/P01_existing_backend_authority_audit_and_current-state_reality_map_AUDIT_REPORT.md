# P01 Audit Report

## Multi-role adversarial audit

| audit_id | role | attack_question | finding | severity | affected_artifact | repair_required | repair_action | residual_risk |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| AUD-P01-001 | Chief Enterprise Architect | Are we mistaking schema for authority? | `uom` and `mdm_uom_conversions` exist in schema but not in the active authority chain. | P1 | P01 main | Y | define one canonical UOM authority model and runtime path | medium |
| AUD-P01-002 | Chief Enterprise Architect | Is there a hidden second write path? | JSON repository remains active while PG target exists. | P1 | P01 main | Y | replace or govern repository path | high |
| AUD-P01-003 | Chief Enterprise Architect | Can a later prompt assume master-data cutover is done? | No. Core engineering rebuild/sync coverage was repaired, but cutover is still not done because JSON remains primary and live PG validation is missing. | P1 | gap ledger | Y | preserve controlled gaps and avoid false cutover claims | medium |
| AUD-P01-004 | Chief Enterprise Architect | Is the command boundary complete? | No, Generic CRUD block is safety only. | P1 | gap ledger | Y | implement command APIs | medium |
| AUD-P01-005 | Chief Enterprise Architect | Is source freshness adequate? | Repo truth is current enough for audit; live DB evidence is still missing. | P2 | source map | N | collect runtime probe later | low |
| AUD-P01-006 | Manufacturing/MES Architect | Can WO release trust current engineering authority? | More than baseline, because BOM/routing/CP/IP are now wired into rebuild/sync code, but still not fully because release commands and live PG evidence are missing. | P1 | P01 main | Y | complete release package authority chain | medium |
| AUD-P01-007 | Manufacturing/MES Architect | Can machine/operator/tool readiness be enforced centrally? | Not with current partial master-data mirrors alone. | P1 | P01 main | Y | add readiness command gates | high |
| AUD-P01-008 | Manufacturing/MES Architect | Can start-job proceed with stale JSON master data? | It can drift because PG mirrors are incomplete. | P1 | simulation report | Y | use version locks and PG commands | high |
| AUD-P01-009 | Manufacturing/MES Architect | Does missing `master-data.json` prove no runtime? | No, it proves the checkout lacks direct JSON runtime evidence. | P2 | source map | N | gather live runtime evidence separately | medium |
| AUD-P01-010 | Manufacturing/MES Architect | Is UOM conversion operationally safe today? | No runtime proof ties UOM conversion to routing/BOM/inventory execution. | P1 | P01 main | Y | wire UOM into operational commands | high |
| AUD-P01-011 | ERP/Finance Architect | Are customer/supplier masters safely governing downstream docs? | Not fully; procurement and order command paths remain partial. | P1 | P01 main | Y | add downstream consumption gates | high |
| AUD-P01-012 | ERP/Finance Architect | Is contract review authoritative? | No, still fragmented. | P2 | runtime authority docs | N | later command integration | medium |
| AUD-P01-013 | ERP/Finance Architect | Can UOM mismatch affect costing and ledger? | Yes, without governed conversions it can contaminate issue/receipt math. | P1 | P01 main | Y | canonical conversion policy | high |
| AUD-P01-014 | ERP/Finance Architect | Are posting policies tied to master-data status? | Not comprehensively. | P2 | main map | N | future command design | medium |
| AUD-P01-015 | ERP/Finance Architect | Is period control enough to claim financial safety? | No, not for most posting domains. | P2 | referenced backend docs | N | later prompts | medium |
| AUD-P01-016 | Quality/Regulatory Lead | Can failed OQC/IQC rely on one authority? | No, quality remains fragmented across JSON/JSONL/PG. | P1 | gap ledger | Y | canonical quality hold/NCR service | high |
| AUD-P01-017 | Quality/Regulatory Lead | Is released master data immutable in runtime? | Service status maps exist, but command governance is incomplete. | P1 | P01 main | Y | enforce revisions via commands | medium |
| AUD-P01-018 | Quality/Regulatory Lead | Are e-signature rules unified? | No, only partial cross-cutting support exists. | P2 | referenced backend docs | N | later prompt P13 | medium |
| AUD-P01-019 | Quality/Regulatory Lead | Can UOM changes alter inspection meaning? | Yes, absent governed conversion authority they can drift sample/result interpretation. | P1 | P01 main | Y | add UOM classification to quality plans | high |
| AUD-P01-020 | Quality/Regulatory Lead | Can current evidence prove cutover readiness? | No. | P1 | decision token | Y | keep gate closed | low |
| AUD-P01-021 | Master Data Governance Lead | Is the entity map complete? | No, UOM/UOM conversion are outside current service entity map. | P1 | P01 main | Y | extend canonical object map | high |
| AUD-P01-022 | Master Data Governance Lead | Are duplicate checks comprehensive? | Only for registered entities in `MasterDataService`; not for UOM conversions. | P1 | P01 main | Y | add duplicate policy to UOM slice | medium |
| AUD-P01-023 | Master Data Governance Lead | Are live-record edits command-governed? | Not fully; active record updates can queue pending approval, but still remain JSON-based. | P1 | P01 main | Y | move to PG-backed governed workflow | medium |
| AUD-P01-024 | Master Data Governance Lead | Is one storage model canonical? | No, JSON and multiple PG schema lanes coexist. | P1 | conflict ledger | Y | choose canonical model | high |
| AUD-P01-025 | Master Data Governance Lead | Is stewardship visible enough for audit? | Partial only. | P2 | docs and service review | N | later object-pack work | low |
| AUD-P01-026 | DBA/PostgreSQL Architect | Does rebuild include all required collections? | Not all. Core BOM/routing/control-plan/inspection-plan/defect-catalog coverage is now present, but traveler, quality-gate, approval, warehouse, and UOM lanes are still incomplete. | P1 | `DataLayer` | Y | extend remaining governed collection coverage and tests | medium |
| AUD-P01-027 | DBA/PostgreSQL Architect | Does shadow sync include all required collections? | Not all. Core engineering coverage is repaired, but remaining governed collections and live reconciliation are still incomplete. | P1 | `RuntimeShadowSync` | Y | extend remaining dual-write coverage | medium |
| AUD-P01-028 | DBA/PostgreSQL Architect | Is UOM duplicated in schema? | There are two lanes with no runtime decision record. | P1 | conflict ledger | Y | consolidate contract | medium |
| AUD-P01-029 | DBA/PostgreSQL Architect | Can drift audit validate master-data completeness today? | Not for all required collections. | P1 | drift tool | Y | extend audit coverage and fail conditions | medium |
| AUD-P01-030 | DBA/PostgreSQL Architect | Is live DB reachability proven in this run? | No. | P2 | source map | N | run runtime probe later | medium |
| AUD-P01-031 | API/Integration Architect | Are public mutations consistently commandized? | No. | P1 | generic CRUD and command spec | Y | build command surface | high |
| AUD-P01-032 | API/Integration Architect | Can clients discover denied runtime endpoints clearly? | Only partially through runtime behavior. | P2 | generic CRUD | N | publish deny contracts | medium |
| AUD-P01-033 | API/Integration Architect | Is UOM conversion API defined? | No governed command API found. | P1 | P01 main | Y | add command contract later | high |
| AUD-P01-034 | API/Integration Architect | Do fallback reads emit enough telemetry? | Not proven here. | P2 | backend docs | N | observability work later | medium |
| AUD-P01-035 | API/Integration Architect | Can downstream systems trust schema registry alone? | No. | P1 | P01 main | Y | enforce runtime evidence | low |
| AUD-P01-036 | Security/IAM/SoD Lead | Can Generic CRUD still become a bypass? | Reduced but not eliminated until all governed commands exist. | P1 | generic CRUD | Y | continue quarantine strategy | medium |
| AUD-P01-037 | Security/IAM/SoD Lead | Are active master-data edits strongly attributable? | JSON history exists but not canonical enterprise-grade proof. | P2 | master data service | N | move to command audit tables | medium |
| AUD-P01-038 | Security/IAM/SoD Lead | Can UOM conversion edits bypass SoD? | Yes, because no dedicated governed writer exists. | P1 | P01 main | Y | create dedicated command and approval policy | high |
| AUD-P01-039 | Security/IAM/SoD Lead | Is release status mutable through non-command lanes? | Risk remains while JSON primary remains active. | P1 | P01 main | Y | close JSON mutation lane | medium |
| AUD-P01-040 | Security/IAM/SoD Lead | Are identity links fully proven? | No live runtime proof in this turn. | P2 | source map | N | later validation | low |
| AUD-P01-041 | Shopfloor Supervisor | Can I trust the released route shown to operators? | Not fully if PG mirror lacks routing collections. | P1 | P01 main | Y | complete route authority | high |
| AUD-P01-042 | Shopfloor Supervisor | Can an inactive machine or tool slip through? | Yes, readiness chain is incomplete. | P1 | simulation report | Y | add release/start gates | high |
| AUD-P01-043 | Shopfloor Supervisor | Will unit conversions on setup sheets be governed? | Not yet. | P1 | P01 main | Y | include UOM conversion authority in engineering/runtime | high |
| AUD-P01-044 | Shopfloor Supervisor | Can I see why a record was blocked? | Partial only. | P2 | service review | N | later UX/telemetry work | medium |
| AUD-P01-045 | Shopfloor Supervisor | Does current audit let P02 proceed safely? | Yes, with controlled gaps only. The audit no longer hides the main runtime defects, and the core repair package is applied in code. | P2 | decision token | N | carry forward the gap ledger into P02 assumptions | low |
| AUD-P01-046 | Warehouse/Inventory Lead | Can receipt, putaway, and issue share one unit authority? | No runtime chain proves that yet. | P1 | P01 main | Y | define enterprise UOM model | high |
| AUD-P01-047 | Warehouse/Inventory Lead | Can stock balances trust current master-data readiness? | No, ledger and UOM gaps remain. | P1 | P01 main | Y | tie inventory commands to UOM authority | high |
| AUD-P01-048 | Warehouse/Inventory Lead | Will lot/serial genealogy survive unit conversions? | Not proven. | P1 | simulation report | Y | add conversion-safe traceability rules | medium |
| AUD-P01-049 | Warehouse/Inventory Lead | Are quality holds centralized? | No. | P1 | gap ledger | Y | canonical hold table | medium |
| AUD-P01-050 | Warehouse/Inventory Lead | Is warehouse-location master ready? | Only partially through JSON service maps. | P2 | service review | N | later object-pack work | low |
| AUD-P01-051 | Maintenance/Calibration Lead | Is calibration state in the same authority chain as tool/device activation? | No complete proof. | P1 | P01 main | Y | connect calibration master and release gates | high |
| AUD-P01-052 | Maintenance/Calibration Lead | Are device units and tolerances governed? | Not in the current audited runtime chain. | P1 | UOM gap | Y | tie UOM to measurement-device governance | high |
| AUD-P01-053 | Maintenance/Calibration Lead | Can PM overdue still leak into release? | Yes until command gates close. | P1 | simulation report | Y | enforce PM checks | medium |
| AUD-P01-054 | Maintenance/Calibration Lead | Is alarm/playbook authority canonical? | Partial sync only. | P2 | main map | N | later domain modeling | medium |
| AUD-P01-055 | Maintenance/Calibration Lead | Is there enough evidence to certify shopfloor readiness? | No, but enough to continue benchmark/design work under controlled gaps. | P2 | decision token | N | keep readiness certification blocked until later prompts | low |
| AUD-P01-056 | Tooling/CNC Process Engineer | Are NC releases governed in the same spine as tooling and units? | Partial only; NC release packages mirror but broader engineering package is incomplete. | P1 | P01 main | Y | finish integrated release authority | high |
| AUD-P01-057 | Tooling/CNC Process Engineer | Can tool-assembly consumption use consistent units? | Not yet proven. | P1 | UOM gap | Y | add conversion policy to tooling slice | medium |
| AUD-P01-058 | Tooling/CNC Process Engineer | Can released revision be edited directly? | Risk remains while JSON primary is alive. | P1 | P01 main | Y | command-only revision change | medium |
| AUD-P01-059 | Tooling/CNC Process Engineer | Are route and setup release dependencies enforced? | Partial only. | P1 | P01 main | Y | build complete WO release command | high |
| AUD-P01-060 | Tooling/CNC Process Engineer | Is checksum/version evidence enough? | Not for whole package chain. | P2 | docs review | N | later prompt P07/P14 | medium |
| AUD-P01-061 | Data/AI Governance Lead | Could AI infer authority from registry/schema and be wrong? | Yes, especially for UOM and engineering collections. | P1 | P01 main | Y | keep no-guess controls explicit | medium |
| AUD-P01-062 | Data/AI Governance Lead | Are generated artifacts being treated as truth? | Not in this package; explicitly blocked. | P2 | constitution | N | maintain rule | low |
| AUD-P01-063 | Data/AI Governance Lead | Are missing sources properly surfaced? | Yes, absent JSON store recorded as gap. | P2 | source map | N | none | low |
| AUD-P01-064 | Data/AI Governance Lead | Is benchmark research needed yet? | Not for P01; repo truth dominates. | P3 | N/A | N | defer to P02 | low |
| AUD-P01-065 | Data/AI Governance Lead | Can P02 start after the repair pass? | Yes, because the main repo-truth blockers are now explicit and the core runtime repair package is applied. | P2 | decision token | N | continue with no-guess assumptions only | low |
| AUD-P01-066 | SRE/Observability Lead | Are fallback reads observable enough? | Not fully proven in this run. | P2 | backend docs | N | later observability prompt | medium |
| AUD-P01-067 | SRE/Observability Lead | Can drift detection block bad cutover today? | Not for all governed collections. | P1 | drift tool | Y | extend fail conditions | medium |
| AUD-P01-068 | SRE/Observability Lead | Is shadow-write failure handling explicit for all collections? | No. | P1 | RuntimeShadowSync scope | Y | add failure reporting and reconciliation | medium |
| AUD-P01-069 | SRE/Observability Lead | Is runtime mode report sufficient to claim authority? | No. | P2 | RuntimeAuthorityService | N | combine with live validation | low |
| AUD-P01-070 | SRE/Observability Lead | Would proceeding hide latent outage risk? | Not if the remaining gaps stay explicit and no one claims PG cutover readiness. | P2 | decision token | N | proceed with controlled gaps | low |
| AUD-P01-071 | External Auditor/Customer Auditor | Can the system identify one authoritative UOM conversion source today? | No. | P1 | P01 main | Y | define and evidence the authority | high |
| AUD-P01-072 | External Auditor/Customer Auditor | Can it prove released engineering data gates WO release? | Not with incomplete PG rebuild/sync. | P1 | P01 main | Y | repair the release chain | high |
| AUD-P01-073 | External Auditor/Customer Auditor | Can it prove all regulated changes go through governed commands? | No. | P1 | Generic CRUD gap | Y | deliver command platform | high |
| AUD-P01-074 | External Auditor/Customer Auditor | Can it prove the active runtime store from this checkout alone? | No; the JSON store is absent. | P2 | source map | N | collect runtime evidence | medium |
| AUD-P01-075 | External Auditor/Customer Auditor | Should the next prompt proceed? | Yes, but only with `PASS_WITH_CONTROLLED_GAPS`, not with a clean readiness claim. | P2 | decision token | N | carry forward the controlled gap package | low |

## Final re-audit

The prompt now clearly distinguishes:

- schema present but not runtime-authoritative,
- JSON primary versus PG-ready,
- guard mitigation versus true command authority,
- UOM foundation assets versus governed UOM runtime capability.

That repair is enough to trust the diagnosis and unlock `P02`, provided all downstream prompts preserve these controlled gaps:

- JSON remains the active master-data repository lane.
- UOM/UOM conversion authority is still unresolved in runtime.
- Generic CRUD replacement is incomplete.
- Several governed collections still lack live PG reconciliation evidence.

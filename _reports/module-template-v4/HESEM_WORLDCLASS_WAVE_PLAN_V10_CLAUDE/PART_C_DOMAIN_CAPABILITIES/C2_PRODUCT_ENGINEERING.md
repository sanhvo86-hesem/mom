# C2 — Product & Engineering (V10)

```
domain_code:             D-02
domain_name:             Product & Engineering
owner_role:              Engineering Lead (Quality Engineer for FMEA; Regulatory Affairs for
                         DHF/DMR; Safety Engineer for HARA/ASIL)
primary_state_machines:  SM-7 Document/ECO Lifecycle; SM-DHF Design History File (MD pack)
root_count:              28
capability_count:        15
wave_maturity_target:    L5 by W3 (Item/BOM/Routing/ECO core); L5 by W6 (FMEA);
                         L5 by W8 (pack-specific: DHF, DO-178C, HARA)
part_c_version:          V10
```

---

## 1. Purpose

The Product & Engineering domain owns the description of what the manufacturer makes,
how it is made, and what risks must be controlled. Without an authoritative engineering
specification, no other domain has anything to reference. This domain answers:

- What is the part, what revision is current, and what constraints define it?
- What components and operations are required to produce it (BOM + Routing)?
- What could go wrong in the product design or production process (FMEA)?
- How do we change it in a controlled, traceable manner (ECO)?
- For regulated product lines: what is the design history, the software lifecycle, the safety
  case, and the cybersecurity posture?

This domain is the source-of-truth dependency for C1 (item revision on SO line), C3
(BOM + Routing for MRP), C4 (BOM components drive PO), C5 (lot tracks to item revision),
C6 (routing drives operations), C7 (FMEA failure modes drive Control Plan), C8 (item
revision is the genealogy anchor), and C9 (routing equipment drives calibration schedule).

---

## 2. Resource Families — Full Enumeration

### 2.1 Item

The system of record for every product, sub-assembly, raw material, consumable, packaging
component, kit, or phantom assembly the manufacturer produces, procures, or tracks.

| Field | Type | Semantics | Required | PII | Mutable |
|---|---|---|---|---|---|
| item_id | UUID | PK; system-generated | Y | N | N |
| item_number | VARCHAR(50) | unique per tenant; human-readable ID | Y | N | N (after qualified) |
| description | VARCHAR(500) | plain-text description | Y | N | Y |
| item_type | ENUM | FINISHED_GOOD\|SUBASSEMBLY\|RAW_MATERIAL\|CONSUMABLE\|PACKAGING\|KIT\|PHANTOM\|SERVICE | Y | N | N (after released) |
| item_family_id | FK → Item Family | classification group | N | N | Y |
| uom | VARCHAR(10) | base unit of measure | Y | N | N (after first use) |
| status | ENUM | in_development\|qualified\|active\|restricted\|retired | Y | N | SM-controlled |
| make_or_buy | ENUM | MAKE\|BUY\|MAKE_OR_BUY | Y | N | Y |
| lead_time_days | INTEGER | default procurement or production lead time | Y | N | Y |
| shelf_life_days | INTEGER | nullable; triggers FEFO allocation in C5 | N | N | Y |
| lot_control | BOOLEAN | lot tracking required | Y | N | N (after first lot) |
| serial_control | BOOLEAN | serial tracking required | Y | N | N (after first serial) |
| dangerous_goods_class | VARCHAR(10) | IMDG/IATA class; nullable | N | N | Y |
| regulated_product | BOOLEAN | subject to regulatory controls (MD, Pharma, Aero) | Y | N | Y |
| gtin | VARCHAR(14) | GS1 GTIN; nullable | N | N | Y |
| udi_di | VARCHAR(100) | MD pack: FDA/EU UDI Device Identifier; nullable | N | N | Y (per revision) |
| counterfeit_risk | ENUM | LOW\|MEDIUM\|HIGH\|CRITICAL; Aero pack | N | N | Y |
| allergen_flags | VARCHAR[] | Food pack: allergen codes per Regulation (EU) 1169/2011 | N | N | Y |
| tenant_id | UUID | tenant isolation | Y | N | N |
| created_at | TIMESTAMPTZ | immutable | Y | N | N |
| created_by | USER_ID | immutable | Y | N | N |

Lifecycle: in_development → qualified (qualification evidence attached; ECO or NII workflow)
→ active (full production use) → restricted (limited use; reasons noted) → retired
(requires zero pending orders + zero on-hand inventory; ECO required).

### 2.2 Item Family

Groups items for reporting, pricing tier, and pack overlay routing.

Fields: family_id, family_code (VARCHAR 20, unique), family_name, parent_family_id (nullable,
hierarchy), product_line (VARCHAR 100), regulatory_category (ENUM: STANDARD|MD|PHARMA|AERO|FOOD),
default_retention_class (FK → H5 retention table), created_at.

### 2.3 Item Spec

Captures the formal specification for an item: dimensional tolerances, material specifications,
surface finish, cleanliness class, etc.

| Field | Type | Semantics |
|---|---|---|
| spec_id | UUID | PK |
| item_id | FK → Item | |
| spec_revision_id | FK → Spec Revision | current effective revision |
| spec_type | ENUM | DIMENSIONAL\|MATERIAL\|FUNCTIONAL\|PERFORMANCE\|SAFETY\|CLEANLINESS\|OTHER |
| spec_code | VARCHAR(50) | reference ID |
| title | VARCHAR(200) | |
| issuing_standard | VARCHAR(200) | e.g. ISO 2768-1 medium; ASTM B265 |
| status | ENUM | draft\|in_review\|released\|superseded\|obsolete |

### 2.4 Spec Revision (sub-record of Item Spec)

Fields: spec_revision_id, spec_id (FK), revision_label (VARCHAR 20), change_summary (TEXT),
effective_date (DATE), eco_id (FK → ECO), released_by (USER_ID), released_at (TIMESTAMPTZ),
status (draft|in_review|released|superseded|obsolete).

### 2.5 BOM (Bill of Materials)

Version-bound to an Item Revision. Multi-level: each BOM component may itself have a child BOM.

| Field | Type | Semantics | Required | Mutable |
|---|---|---|---|---|
| bom_id | UUID | PK | Y | N |
| parent_item_id | FK → Item | top-level item this BOM belongs to | Y | N |
| item_revision_id | FK → Item Revision | effectivity anchor | Y | N |
| bom_type | ENUM | MANUFACTURING\|ENGINEERING\|PLANNING\|SALES | Y | N (after released) |
| status | ENUM | draft\|in_review\|released\|superseded\|obsolete | Y | SM-controlled |
| released_at | TIMESTAMPTZ | | N | system |
| eco_id | FK → ECO | ECO that released this BOM version | N | N |

### 2.6 BOM Component (sub-record)

| Field | Type | Semantics |
|---|---|---|
| component_id | UUID | PK |
| bom_id | FK → BOM | |
| sequence_number | INTEGER | order of components |
| child_item_id | FK → Item | component item |
| child_revision_id | FK → Item Revision | nullable; if null = use current effective |
| quantity | DECIMAL(14,6) | quantity per parent UOM |
| uom | VARCHAR(10) | component UOM |
| reference_designator | VARCHAR(200) | location on assembly (PCB: R1, C12; etc.) |
| operation_sequence | INTEGER | which routing operation this component is consumed at |
| scrap_factor_pct | DECIMAL(5,2) | planned scrap allowance |
| alternate_group | VARCHAR(50) | alternates share group code; first available used |
| is_phantom | BOOLEAN | phantom component; exploded through, not kitted |
| critical_component | BOOLEAN | key characteristic; requires traceability |
| supplier_preferred | FK → Supplier (C4) | nullable; auto-populates PO suggestion |

### 2.7 Routing

Sequence of manufacturing operations required to produce an item at a specific revision.

| Field | Type | Semantics |
|---|---|---|
| routing_id | UUID | PK |
| item_id | FK → Item | |
| item_revision_id | FK → Item Revision | effectivity anchor |
| routing_type | ENUM | STANDARD\|REWORK\|REPAIR | |
| status | ENUM | draft\|in_review\|released\|superseded\|obsolete |
| eco_id | FK → ECO | ECO that released this routing version |
| released_at | TIMESTAMPTZ | |

### 2.8 Routing Operation (sub-record)

| Field | Type | Semantics |
|---|---|---|
| operation_id | UUID | PK |
| routing_id | FK → Routing | |
| operation_sequence | INTEGER | order of execution |
| operation_code | VARCHAR(20) | standard operation code |
| operation_name | VARCHAR(200) | |
| work_center_id | FK → Work Center (C6) | required equipment family |
| setup_time_min | DECIMAL(8,2) | standard setup time |
| run_time_min | DECIMAL(8,2) | per-unit run time |
| move_time_min | DECIMAL(8,2) | transit time to next operation |
| parallel_flag | BOOLEAN | can start in parallel with prior op |
| yield_pct | DECIMAL(5,2) | expected first-pass yield |
| critical_op | BOOLEAN | key process step; requires SPC or inspection gate |
| work_instruction_id | FK → Controlled Document (C7/CDOC) | nullable |
| isa88_phase | ENUM | PROCESS_CELL\|UNIT\|EQUIPMENT_MODULE\|CONTROL_MODULE | nullable |

### 2.9 Operation Step (sub-sub-record of Routing Operation)

Granular steps within an operation for operator guidance or SFC step gating.

Fields: step_id, operation_id (FK), step_sequence, step_description (TEXT), expected_outcome
(TEXT), check_type (ENUM: VISUAL|MEASUREMENT|GO_NO_GO|TORQUE|NONE), tolerance_spec_id (FK → Spec),
required_tool_id (FK → Equipment, nullable), requires_esig (BOOLEAN).

### 2.10 Drawing

Reference to the authoritative CAD drawing. HESEM holds the reference and metadata; the CAD
asset lives in the customer's PLM system.

Fields: drawing_id, item_id (FK), drawing_number (VARCHAR 50), title (VARCHAR 200),
plm_system (ENUM: WINDCHILL|TEAMCENTER|ENOVIA|ARENA|SOLIDWORKS_PDM|OTHER),
plm_document_id (VARCHAR 200, the PLM system's internal ID), current_revision_label (VARCHAR 20),
file_format (ENUM: STEP|DXF|DWG|PDF|OTHER), viewer_url (VARCHAR 500, nullable, generated
by PLM integration at access time — never stored permanently), custodian_user_id (USER_ID).

### 2.11 Drawing Revision (sub-record)

Fields: drawing_revision_id, drawing_id (FK), revision_label, change_description (TEXT),
effective_date, eco_id (FK → ECO), superseded_by (FK → drawing_revision_id, nullable).

### 2.12 ECO (Engineering Change Order)

Governed by SM-7 Document Lifecycle (Tier T-3; banned decision BD-5: ECO approval cannot
be automated).

| Field | Type | Semantics | Required | Mutable |
|---|---|---|---|---|
| eco_id | UUID | PK | Y | N |
| eco_number | VARCHAR(20) | unique per tenant | Y | N |
| title | VARCHAR(300) | brief description | Y | Y (pre-review) |
| reason_category | ENUM | CUSTOMER_REQUIREMENT\|COST_REDUCTION\|QUALITY_IMPROVEMENT\|REGULATORY\|SUPPLIER_CHANGE\|SAFETY\|OBSOLESCENCE | Y | N (after approved) |
| reason_text | TEXT | full description | Y | Y (pre-approved) |
| initiator | USER_ID | | Y | N |
| status | ENUM per SM-7 | see §3 | Y | SM-controlled |
| priority | ENUM | URGENT\|HIGH\|NORMAL\|LOW | Y | Y (pre-approved) |
| implementation_date | DATE | planned effective date | Y | Y (pre-implementing) |
| actual_effective_date | DATE | nullable; set at implementing state | N | system |
| training_required | BOOLEAN | triggers SM-8 assignment on release | Y | Y (pre-approved) |
| sap_change_number | VARCHAR(50) | nullable; integration with ERP change ID | N | Y |
| tenant_id | UUID | | Y | N |
| created_at | TIMESTAMPTZ | | Y | N |

### 2.13 ECO Affected Item (sub-record)

| Field | Type | Semantics |
|---|---|---|
| affected_id | UUID | PK |
| eco_id | FK → ECO | |
| object_type | ENUM | ITEM\|ITEM_REVISION\|BOM\|ROUTING\|SPEC\|DRAWING\|DOCUMENT\|FMEA |
| object_id | UUID | FK to the appropriate object |
| change_type | ENUM | ADD\|MODIFY\|OBSOLETE\|REWORK_DISPOSITION |
| from_revision | VARCHAR(20) | nullable (obsolete; new items) |
| to_revision | VARCHAR(20) | nullable (obsolete) |
| impact_notes | TEXT | |
| verified_by | USER_ID | nullable; set at SM-7 `verified` state |
| verified_at | TIMESTAMPTZ | nullable |

### 2.14 DFMEA (Design FMEA)

Per AIAG-VDA FMEA Handbook 2019. Structure: System → Subsystem → Component → Failure Mode.

| Field | Type | Semantics |
|---|---|---|
| dfmea_id | UUID | PK |
| item_id | FK → Item | item being analyzed |
| item_revision_id | FK → Item Revision | revision under analysis |
| title | VARCHAR(300) | |
| fmea_number | VARCHAR(50) | unique per tenant |
| status | ENUM | draft\|in_review\|released\|superseded |
| team_members | USER_ID[] | cross-functional team |
| created_at | TIMESTAMPTZ | |
| eco_id | FK → ECO | ECO that last released this DFMEA |

DFMEA Row (sub-record): row_id, dfmea_id (FK), structure_element (TEXT — system/subsystem/
component path), failure_mode (TEXT), failure_effect (TEXT), severity (1-10), classification
(ENUM: SAFETY_CC\|HIGH_IMPACT\|SIGNIFICANT\|OTHER), failure_cause (TEXT), prevention_control
(TEXT), occurrence (1-10), detection_control (TEXT), detection (1-10),
action_priority (ENUM: H\|M\|L — per AIAG-VDA 2019 lookup table; not RPN),
responsible_person (USER_ID), target_completion_date (DATE), completion_evidence (TEXT),
revised_occurrence (INTEGER), revised_detection (INTEGER), revised_action_priority (ENUM).

### 2.15 PFMEA (Process FMEA)

Same structure as DFMEA but analysis subject is the manufacturing process (Routing Operation),
not the product design.

Entity: pfmea_id, item_id (FK), routing_id (FK), operation_id (FK → Routing Operation),
title, fmea_number, status, team_members, created_at, eco_id.

PFMEA Row: identical field set to DFMEA Row. Additionally: control_plan_link (FK → Control Plan
in C7 when created), statistical_control_required (BOOLEAN, drives SPC in C6).

### 2.16 PFD (Process Flow Diagram)

High-level diagram linking process steps to PFMEA rows and Control Plan.

Fields: pfd_id, item_id (FK), routing_id (FK), title, version, status (draft|released|superseded),
pfmea_id (FK), diagram_file_ref (VARCHAR 500, DMS reference to the diagram file), eco_id (FK).

PFD Step (sub-record): step_id, pfd_id (FK), step_sequence, step_label (VARCHAR 200),
input_characteristics (TEXT), output_characteristics (TEXT), pfmea_row_id (FK → PFMEA Row,
nullable), control_method (TEXT), inspection_gate (BOOLEAN).

### 2.17 HARA / ASIL (Auto E/E — J2 pack)

Hazard Analysis and Risk Assessment per ISO 26262. Links to item (vehicle-level function).

Fields: hara_id, item_id (FK), vehicle_function (TEXT), hazard_description (TEXT),
operating_scenario (TEXT), severity_class (ENUM: S0\|S1\|S2\|S3),
exposure_class (ENUM: E0\|E1\|E2\|E3\|E4),
controllability_class (ENUM: C0\|C1\|C2\|C3),
asil_level (ENUM: QM\|A\|B\|C\|D — computed per ISO 26262 Table 4),
safety_goal (TEXT), safe_state (TEXT), ftti_ms (INTEGER — fault tolerant time interval),
decomposition_note (TEXT), status (draft|reviewed|approved), eco_id (FK).

### 2.18 FMECA (Aero — J3 pack, per ARP 4761)

Failure Mode, Effects, and Criticality Analysis for aerospace items. Distinct from
AIAG-VDA DFMEA in criticality classification method.

Fields: fmeca_id, item_id (FK), item_revision_id (FK), arp_revision (VARCHAR 10 e.g. "ARP4761"),
title, fmeca_number, status, created_at, eco_id.

FMECA Row (sub-record): row_id, fmeca_id (FK), function (TEXT), failure_mode (TEXT),
local_effect (TEXT), next_higher_effect (TEXT), end_effect (TEXT),
failure_classification (ENUM: CAT_I\|CAT_II\|CAT_III\|CAT_IV per ARP 4761 §7.3),
failure_rate_per_1e9_hours (DECIMAL 12,6), probability_loss_of_function (DECIMAL 10,8),
compensating_provision (TEXT), critical_item_flag (BOOLEAN), safety_critical_function (TEXT).

### 2.19 System Development Data (ARP 4754A — J3 pack)

Aircraft/system-level development assurance per ARP 4754A.

Fields: sdd_id, item_id (FK), arp4754a_revision (VARCHAR 10), development_assurance_level
(ENUM: DAL_A\|DAL_B\|DAL_C\|DAL_D\|DAL_E), system_function (TEXT), allocated_requirements_ref
(VARCHAR 200 — link to requirements management tool), verification_plan_ref (VARCHAR 200),
derived_requirements_justification (TEXT), status (draft|in_review|approved), eco_id (FK).

### 2.20 DHF (Design History File — MD pack, J4)

Governed by 21 CFR 820.30(j) and ISO 13485 §7.3.10. Aggregate container for all design
control records for a device family.

Fields: dhf_id, item_family_id (FK → Item Family), device_name (VARCHAR 200),
device_identifier (VARCHAR 100 — product model or catalog number),
status (draft|active|closed), created_by (USER_ID), created_at (TIMESTAMPTZ),
current_design_input_revision (VARCHAR 20), current_design_output_revision (VARCHAR 20),
last_design_review_date (DATE), last_design_review_by (USER_ID),
verification_complete (BOOLEAN), validation_complete (BOOLEAN),
transfer_to_production_date (DATE, nullable), eco_id (FK → last ECO affecting DHF).

DHF Index Entry (sub-record): entry_id, dhf_id (FK), record_type (ENUM: DESIGN_INPUT|DESIGN_OUTPUT|REVIEW_MINUTES|VERIFICATION_REPORT|VALIDATION_REPORT|RISK_FILE|USABILITY_REPORT|CHANGE_RECORD), document_id (FK → Controlled Document, C7), description (TEXT), version (VARCHAR 20), effective_date (DATE).

### 2.21 DMR (Device Master Record — MD pack, J4)

Per 21 CFR 820.181. Reference document pointing to all production records for a device type.

Fields: dmr_id, item_id (FK → Item, FINISHED_GOOD), item_revision_id (FK), device_name (VARCHAR 200), version (VARCHAR 20), status (draft|released|superseded), released_by (USER_ID), released_at (TIMESTAMPTZ), eco_id (FK).

DMR Index Entry (sub-record): entry_id, dmr_id (FK), record_type (ENUM: DEVICE_SPECIFICATIONS|PRODUCTION_PROCESS_SPEC|QUALITY_ASSURANCE_PROCEDURES|PACKAGING_LABELING_SPEC|INSTALLATION_METHODS|SERVICING_PROCEDURES), document_id (FK → Controlled Document), version (VARCHAR 20), effective_date (DATE).

### 2.22 SOUP / OTSS Register (MD pack — J4, per IEC 62304)

Software Of Unknown Provenance / Off-The-Shelf Software register.

| Field | Type | Semantics |
|---|---|---|
| soup_id | UUID | PK |
| item_id | FK → Item | device this SOUP is embedded in |
| software_name | VARCHAR(200) | |
| vendor | VARCHAR(200) | |
| version | VARCHAR(50) | specific version evaluated |
| software_class | ENUM per IEC 62304 §4.3 | CLASS_A\|CLASS_B\|CLASS_C |
| soup_risk_level | ENUM | ACCEPTABLE\|ACCEPTABLE_WITH_MITIGATIONS\|UNACCEPTABLE |
| anomaly_list_reference | VARCHAR(500) | vendor-published anomaly list URL or doc ref |
| regression_test_plan_ref | VARCHAR(500) | reference to test plan in DMS |
| last_reviewed_date | DATE | |
| status | ENUM | active\|deprecated\|replaced |
| replacement_soup_id | FK → soup_id | nullable |

### 2.23 PCCP (Predetermined Change Control Plan — MD AI, per FDA AI/ML Guidance 2023 + L3 §6)

Required for AI/ML-enabled devices that anticipate post-market modifications.

Fields: pccp_id, item_id (FK), device_name (VARCHAR 200), fda_submission_ref (VARCHAR 100),
change_description (TEXT), performance_goal (TEXT), methodology (TEXT),
boundary_conditions (TEXT), performance_monitoring_protocol (TEXT),
reversion_criteria (TEXT), status (draft|under_review|fda_cleared|active|superseded),
eco_id (FK).

### 2.24 Cyber Threat Model + SBOM (per FDA 21 CMR §524b; IEC 81001-5-1; I7)

| Field | Type | Semantics |
|---|---|---|
| ctm_id | UUID | PK |
| item_id | FK → Item | device or system |
| threat_model_ref | VARCHAR(500) | STRIDE/PASTA model file in DMS |
| sbom_format | ENUM | SPDX\|CYCLONEDX\|SWID |
| sbom_ref | VARCHAR(500) | SBOM file location in DMS |
| sbom_generated_at | TIMESTAMPTZ | |
| known_vulnerabilities | INTEGER | CVE count from last SBOM scan |
| last_scan_date | DATE | |
| patch_status | ENUM | CURRENT\|PATCH_AVAILABLE\|DEFERRED_ACCEPTED\|CRITICAL_OPEN |
| post_market_surveillance_due | DATE | |
| status | ENUM | draft\|current\|under_remediation\|archived |

### 2.25 DO-178C SCI — Software Configuration Item (J3 Aero)

Per DO-178C / RTCA DO-178C 2012. One SCI record per software component developed to
a specific DAL.

Fields: sci_id, item_id (FK), software_name (VARCHAR 200), dal_level
(ENUM: DAL_A\|DAL_B\|DAL_C\|DAL_D\|DAL_E), version (VARCHAR 50),
planning_ref (VARCHAR 500 — PSAC document in DMS),
review_ref (VARCHAR 500 — SCI review checklist), test_coverage_pct (DECIMAL 5,2),
mc_dc_required (BOOLEAN — DAL A requires MC/DC coverage),
status (planning|development|verification|final|released), eco_id (FK).

### 2.26 DO-254 HCI — Hardware Configuration Item (J3 Aero)

Per DO-254 2000. Airborne electronic hardware development assurance.

Fields: hci_id, item_id (FK), hardware_name (VARCHAR 200), dal_level
(ENUM: DAL_A\|DAL_B\|DAL_C\|DAL_D\|DAL_E), version (VARCHAR 50),
phac_ref (VARCHAR 500 — PHAC document), design_assurance_approach (TEXT),
tool_qualification_required (BOOLEAN), status (planning|design|verification|final|released),
eco_id (FK).

### 2.27 Counterfeit Risk Assessment per Item (J3 Aero — per AS5553 / AS6174)

| Field | Type | Semantics |
|---|---|---|
| cra_id | UUID | PK |
| item_id | FK → Item | |
| assessment_date | DATE | |
| risk_level | ENUM | LOW\|MEDIUM\|HIGH\|CRITICAL |
| risk_factors | TEXT | factors driving the rating |
| approved_sources | FK[] → Supplier | list of approved suppliers per AS5553 |
| test_requirements | TEXT | required inspection / test per risk level |
| documentation_required | TEXT | CoC, C-TPAT, CCAP, etc. |
| review_due_date | DATE | next scheduled review |
| reviewed_by | USER_ID | |

### 2.28 System Development Data — ARP 4754A (see §2.19 above)

Already enumerated at §2.19. Duplicated here as placeholder to confirm all 28 families
are accounted for in the root catalog per M3.

---

## 3. State Machine — SM-7 Document/ECO Lifecycle (full transition table)

Owner: Document Control Lead (ECO: Engineering Lead). Tier: T-3 (human authority mandatory;
banned decision BD-5: ECO approval cannot be automated). Evidence: EC-2 (e-signature) at
approve; EC-10 (document issuance) at release; EC-16 (ECO record) at every transition.

| # | Source | Event | Guard | Target | Side Effect | Evidence |
|---|---|---|---|---|---|---|
| 1 | draft | submit_for_impact | initiator; required fields complete | impact_analysis | Notify affected domain leads | EC-16 |
| 2 | impact_analysis | complete_impact | Engineering Lead; all affected items enumerated in ECO Affected Items; feasibility confirmed | impact_analyzed | Impact analysis report generated | EC-16 |
| 3 | impact_analyzed | submit_for_review | Engineering Lead | in_review | Multi-party review workflow triggered; assignments to Engineering + Quality + Production + Doc Control | EC-16 |
| 4 | in_review | approve | all required reviewers approved; e-sig captured per reviewer | approved | Implementation plan confirmed; training flag evaluated | EC-2 + EC-16 |
| 5 | in_review | reject | any required reviewer rejects with documented reason | rejected | Initiator notified; ECO may be revised and re-submitted (creates revision) | EC-16 |
| 6 | approved | start_implementation | Engineering Lead; implementation_date reached or expedited approval | implementing | Affected items/documents unlocked for change; change tasks dispatched | EC-16 |
| 7 | implementing | verification_complete | Engineering Lead + Quality Engineer; all ECO Affected Items verified (tests run, inspections passed) | verified | E-sig on verification completion | EC-2 + EC-16 |
| 8 | verified | close | Engineering Lead; all affected documents released; training assignments created if training_required=true | closed | New item/BOM/routing/spec revisions go effective; SM-8 training assignments sent | EC-16 + EC-10 |
| 9 | closed | - (terminal) | - | - | Audit trail frozen | - |
| 10 | any (pre-approved) | withdraw | initiator; ECO not yet approved | withdrawn | Resources released; no changes enacted | EC-16 |
| 11 | rejected | revise | initiator | draft | New revision number; prior revision record retained | EC-16 |

Hard couplings: SM-7 gates SM-1 release (doc effectivity). SM-7 close triggers SM-8
training assignments (if training_required=true). SM-7 close releases new BOM/Routing revisions
to C3 MRP.

---

## 4. Capabilities

### CAP-C2-01 — Item Master Lifecycle with Per-Pack Overlays

**Purpose.** Maintain the authoritative record for every item. Govern lifecycle states.
Apply pack-specific fields (UDI for MD; GTIN/SSCC for Pharma+Food; counterfeit_risk for Aero).

**Lifecycle.** New item introduction (NII) workflow (per D3). Item created in_development.
Qualification evidence attached (first article, initial inspection, approval from Quality).
Status → qualified. Engineering Lead activates to active. Restriction applied (supply
constraint or regulatory hold; Engineering Lead; reason required). Retirement requires
zero-pending-orders check (API call to C1/C4) + zero-on-hand check (C5) + ECO required.

**Integration with SM-7.** New item creation, revision, and retirement all require ECO.

**Wave target.** L4 W0.5 (master data ratification load); L5 W2 (full mutation via ECO).

**Acceptance evidence.** Item retirement blocked when open SOs or non-zero inventory exist.
UDI-DI field populated for all MD-regulated items before first DHF entry. Counterfeit risk
field populated for all Aero items before first production release.

### CAP-C2-02 — Item Revision Management

**Purpose.** Version-control item specifications. Govern which revision is effective at
any date. Propagate revision changes through ECO.

**Lifecycle.** Revision draft created under ECO. Review by Engineering + Quality. Released
via SM-7 close. Effectivity_date governs activation. Prior revision superseded at new
revision effectivity_date. Obsolete when all production and SO references have aged out of
retention window.

**Effectivity rules.** At any given date, exactly one item revision is `released` and
`effective` for production. Date-overlap between revisions is a validation error blocked at SM-7
close. SO lines lock to item_revision_id at SO release event, not at order entry — ensuring
engineering does not need to update open orders for minor revisions.

**Wave target.** L4 W1 (read revision history); L5 W3 (full revision mutation via ECO).

**Acceptance evidence.** Revision history queryable with effectivity windows. Production job
traceable to specific revision used at job release time. Date-overlap validation tested: attempt
to release overlapping revision → rejected with Problem Detail.

### CAP-C2-03 — BOM Authoring with Multi-Level and Effectivity

**Purpose.** Author multi-level BOMs version-bound to item revisions. Support alternates,
phantom components, and scrap factors.

**Lifecycle.** BOM drafted under ECO. Components added (each with operation_sequence linking
to routing). Alternate groups defined. Reviewed by Planning (capacity feasibility) and
Procurement (supplier exists for each purchased component). Released via SM-7 close.

**Multi-level traversal.** API supports depth-first BOM explosion to any level. Phantom
components are exploded through (not kitted). Alternate groups resolved per MRP availability
logic in C3.

**Wave target.** L4 W2 (read/export BOM); L5 W3 (author + release via ECO).

**Acceptance evidence.** Multi-level BOM explosion tested to depth ≥ 6. Alternate component
resolution verified in C3 MRP scenario. Phantom BOM explosion does not create inventory
reservation for phantom items.

### CAP-C2-04 — Routing Authoring (per ISA-88, per Work Center)

**Purpose.** Author the sequence of manufacturing operations per item revision. Reference
ISA-88 hierarchy levels. Assign work centers. Specify standard times and yield expectations.

**Lifecycle.** Routing drafted under ECO. Operations sequenced and assigned to work centers.
Standard times validated against historical actuals from C6 (if available). Routing reviewed
by Planning (capacity) and Production. Released via SM-7 close. Active routing consumed by
C3 finite scheduling and C6 job execution.

**ISA-88 alignment.** Operation isa88_phase field maps to: PROCESS_CELL (area-level grouping),
UNIT (a single machine or station), EQUIPMENT_MODULE (a functional sub-unit), or
CONTROL_MODULE (a PLC/SCADA control point). This mapping enables MES-level routing dispatch
in C6 without requiring a separate ISA-88 configuration step.

**Wave target.** L4 W2; L5 W3.

**Acceptance evidence.** Routing consumed by C3 capacity planning without manual mapping.
Standard time changes trigger C3 schedule re-evaluation within 1 planning cycle.

### CAP-C2-05 — Spec Authoring and Revision (per ECO)

**Purpose.** Author and version-control item specifications (dimensional, material, functional,
safety). Govern via ECO. Link to drawing and FMEA control characteristics.

**Lifecycle.** Spec drafted. Linked to item and drawing revision. Published via SM-7 ECO.
Superseded when new revision released. Key characteristics (KC) flagged on Spec rows trigger
SPC in C6 and mandatory measurement in C7 inspection.

**Wave target.** L4 W3; L5 W3.

**Acceptance evidence.** KC flag on Spec row propagates to C7 Control Plan check items
automatically. Spec revision cross-reference resolves in item record.

### CAP-C2-06 — ECO Workflow (SM-7, per BD-5)

**Purpose.** Govern any controlled change to item, revision, BOM, routing, spec, drawing, or
document. Enforce multi-party approval, impact analysis, and traceable release.

**Lifecycle.** Per SM-7 full transition table (§3). Key gates: impact_analysis_complete
(all affected objects enumerated), multi-party approval (Engineering + Quality + Production +
Doc Control e-signatures), verification_complete, effective release.

**Banned decision BD-5.** ECO approval cannot be automated, even for low-priority ECOs.
At minimum one human approval (Engineering Lead + Quality Engineer co-sign) required at
approved transition. Automation may pre-populate the impact analysis; it may not approve.

**Wave target.** L4 W3; L5 W3.

**Acceptance evidence.** ECO with all required approvals signed. ECO rejected by one reviewer:
confirm entire ECO returns to in_review, not partially approved. BD-5 test: attempt automated
ECO approval via API → 403 Forbidden with Problem Detail citing BD-5.

### CAP-C2-07 — DFMEA Authoring (per AIAG-VDA FMEA Handbook 2019)

**Purpose.** Identify potential product design failure modes, their effects, and action
priorities. Replace legacy RPN-based severity × occurrence × detection with AIAG-VDA 2019
Action Priority (AP) lookup.

**Action Priority computation.** AP is not arithmetic RPN. Per AIAG-VDA 2019 Table AP-1:
  - Severity 9-10 + any occurrence ≥ 2 + any detection → AP = H
  - Severity 1-8 + occurrence 6-10 + detection 7-10 → AP = H
  - See table for full AP-M and AP-L conditions.
  System reads the lookup table from a configuration data fixture (not hardcoded) to support
  future AIAG-VDA revision updates.

**Lifecycle.** DFMEA drafted by cross-functional team including Engineering, Quality, and
Customer Representative when available. Released via ECO. Updated when field NC data reveals
a previously unidentified failure mode (trigger: NC root cause ≠ any existing DFMEA failure
mode → DFMEA review task created).

**Wave target.** L4 W6; L5 W6.

**Acceptance evidence.** AP computed correctly for all severity/occurrence/detection
combinations. NC-to-DFMEA gap trigger tested: NC with novel root cause → DFMEA review task
auto-created. AIAG-VDA AP lookup table updatable without code change.

### CAP-C2-08 — PFMEA Authoring (per AIAG-VDA FMEA Handbook 2019)

**Purpose.** Identify potential manufacturing process failure modes. Link to Control Plan
in C7. Drive SPC gate configuration in C6.

**Lifecycle.** PFMEA drafted alongside PFD and Control Plan. One PFMEA row per (operation,
failure mode) pair. Statistical_control_required=true rows trigger SPC control chart
configuration in C6 Shopfloor. Released via ECO.

**Control Plan linkage.** At PFMEA row creation, if control_type = PREVENTION and method
involves measurement, a Control Plan check item is auto-created in C7 (or flagged for Quality
Engineer to confirm). This linkage is advisory, not autonomous; Quality Engineer must confirm.

**Wave target.** L4 W6; L5 W6.

**Acceptance evidence.** PFMEA → Control Plan linkage produces Control Plan check items.
SPC-required rows appear in C6 SPC configuration queue. Linkage advisory test: auto-created
check item requires Quality Engineer confirmation before active.

### CAP-C2-09 — HARA and ASIL Assignment (per ISO 26262 — J2 Automotive E/E)

**Purpose.** Perform Hazard Analysis and Risk Assessment for automotive electrical/electronic
items per ISO 26262. Compute ASIL level. Define safety goals and fault tolerant time interval.

**Lifecycle.** HARA conducted by Safety Engineer with System Engineer. Each hazardous event
analyzed for severity (S), exposure (E), controllability (C). ASIL computed per ISO 26262
Table 4 (lookup, not arithmetic). Safety goals defined per ASIL level. ASIL D and C items
require DHF-equivalent design control traceability (safety case).

**ASIL decomposition.** When ASIL B or higher decomposed between redundant channels, system
records decomposition_note and assigns ASIL to each channel separately. Decomposition must
be reviewed by Safety Engineer.

**Wave target.** L4 W6; L5 W8. (J2 Auto pack only.)

**Acceptance evidence.** ASIL lookup table matches ISO 26262 Part 3 Table 4. ASIL D item
requires safety case traceability to verified design outputs. Decomposition record preserves
channel ASIL independently.

### CAP-C2-10 — DHF and DMR (per 21 CFR 820.30 and ISO 13485 §7.3 — J4 MD pack)

**Purpose.** Maintain the Design History File (DHF) as the aggregate of all design control
records for a device family. Maintain the Device Master Record (DMR) as the reference to all
production specifications.

**DHF completeness gate.** Before SM-7 close on an ECO affecting a device design, system
checks DHF for: (a) design input record exists and approved; (b) design output record exists
and verified; (c) design review minutes filed; (d) verification report filed; (e) validation
report filed; (f) risk file (ISO 14971) current. Any missing entry blocks ECO close with
Problem Detail citing the missing record type.

**DMR release.** DMR released when all DHF index entries are in status `released`. Subsequent
changes require ECO and produce new DMR revision.

**Wave target.** L4 W6; L5 W8. (J4 MD pack only.)

**Acceptance evidence.** DHF completeness gate tested: ECO close blocked when validation
report missing. DMR version cross-reference correct to device production batch records.

### CAP-C2-11 — IEC 62304 Software Lifecycle (MD pack — J4)

**Purpose.** Govern software development lifecycle for software-containing medical devices
per IEC 62304 and FDA software guidance (2005 + 2023 AI/ML draft).

**Class assignment.** Software Class (A/B/C) assigned per IEC 62304 §4.3. Class C (injury
possible from failure) requires: software requirements specification, software architectural
design, detailed design, unit verification, integration testing, system testing. Classes A and B
have reduced requirements.

**SOUP management.** Each SOUP item in the register (§2.22) must have: anomaly list evaluated;
regression tests defined; risk mitigation documented if anomalies present.

**PCCP.** For AI/ML-based software (L3 classification), a PCCP (§2.23) must be filed with
FDA before market submission and maintained current as algorithms update.

**Wave target.** L4 W7; L5 W8. (J4 MD pack only.)

**Acceptance evidence.** Class C software item: all 6 lifecycle activities documented in DHF
before device transfer to production. SOUP with open anomalies: verify risk mitigation is
documented. PCCP present for all AI/ML-enabled devices.

### CAP-C2-12 — DO-178C / DO-254 Lifecycle (J3 Aerospace)

**Purpose.** Govern airborne software (DO-178C) and hardware (DO-254) development assurance
for aerospace items.

**DAL-driven planning.** SCI record (§2.25) and HCI record (§2.26) created per item per
DAL level. DAL A software requires: PSAC, SRS, SDD, source code, executable object code,
unit test, integration test, system test, MC/DC coverage, code review, tool qualification
(if tools affect outputs). System checks that all required lifecycle data objects (LDOs) per
DO-178C Table A-1 are linked to the SCI before DO-178C status = released.

**Wave target.** L4 W7; L5 W8. (J3 Aero pack only.)

**Acceptance evidence.** DAL A SCI requires MC/DC test evidence: system blocks release
without it. Tool qualification flag: when tool_qualification_required=true, qualification
evidence doc must exist in DHF before SCI release.

### CAP-C2-13 — ARP 4754A / 4761 Safety Case (J3 Aerospace)

**Purpose.** Maintain aircraft system-level safety case per ARP 4754A (development assurance)
and ARP 4761 (safety assessment: FHA, PSSA, SSA, FMECA).

**Lifecycle.** System function defined. DAL assigned per ARP 4754A §5. FHA (functional
hazard assessment) conducted → hazard classification. PSSA (preliminary system safety
assessment) allocates safety requirements to subsystems. SSA (system safety assessment)
verifies requirements met. FMECA (§2.18) performed per ARP 4761 §7.3. Safety case document
assembled and reviewed per DO-178C / DO-254 joint review.

**Wave target.** L4 W7; L5 W8. (J3 Aero pack only.)

**Acceptance evidence.** FMECA criticality categories cross-referenced to PSSA failure
condition classification. Safety case document linked to SCI/HCI records in DHF equivalent.

### CAP-C2-14 — Cyber Threat Model per Device (per FDA 21 CMR §524b + IEC 81001-5-1)

**Purpose.** Maintain a current software bill of materials (SBOM) and threat model for
network-connected medical devices (J4) and cyber-critical systems (I7).

**Lifecycle.** SBOM generated at each software build (SPDX or CycloneDX format). Threat
model conducted per STRIDE methodology. CVE scan run against SBOM monthly (automated via
I7 integration). Vulnerabilities classified by CVSS score. Critical vulnerabilities (CVSS ≥ 9)
require patch plan within 30 days (FDA Refuse-to-Accept criterion).

**Wave target.** L4 W7; L5 W8.

**Acceptance evidence.** SBOM scan for a test item with known CVE: CVE appears in known_vulnerabilities count. CVSS ≥ 9 vulnerability: patch_status = CRITICAL_OPEN; alert to Engineering + Quality Lead within 24h.

### CAP-C2-15 — Counterfeit Avoidance per AS5553 / AS6174 (J3 Aerospace)

**Purpose.** Prevent procurement of counterfeit electronic components per AS5553 / AS6174.
Maintain Counterfeit Risk Assessment per item. Enforce sourcing controls.

**Lifecycle.** Risk assessment (§2.27) conducted per item at qualification. Risk level HIGH/
CRITICAL: procurement from approved_sources list only; CoC from original manufacturer required
at PREC (C4); independent test per IDEA-STD-1010B if suspected counterfeit. Risk re-assessed
annually or when supplier changes.

**Integration.** At PO creation (C4), item.counterfeit_risk drives: approved_sources validation
(PO supplier must be in approved_sources), CoC document requirement flag on PREC record.

**Wave target.** L4 W6; L5 W8. (J3 Aero pack only.)

**Acceptance evidence.** PO for HIGH-risk item from non-approved supplier → PO blocked with
Problem Detail citing AS5553 §5.2.2. PREC for HIGH-risk item without CoC → receipt blocked.

---

## 5. Workflows the Domain Participates In

Primary participant:
- D3 Plan to Produce (BOM + Routing drive MRP; Item Master drives material planning)
- D7 Document to Release (ECO governs controlled document lifecycle; SM-7)

Supporting participant:
- D1 Order to Cash (item_revision_id on SO line; item status gates SO creation)
- D2 Procurement to Pay (BOM components drive PO; approved sources per CRA)
- D4 Receive to Inspect (item spec and drawing used for incoming inspection criteria)
- D5 Inspect to Disposition (FMEA failure modes drive Control Plan check items)
- D6 NC to CAPA (NC root cause triggers DFMEA/PFMEA review)
- D14 Validate to Qualify (IQ/OQ/PQ protocols reference routing and item specifications)

---

## 6. APIs the Domain Exposes (per E4)

```
Item Master API          GET /items/{id}; POST /items; PATCH /items/{id}/status;
                         GET /items/{id}/revisions; GET /items/{id}/bom;
                         GET /items/{id}/routing

Item Revision API        GET /item-revisions/{id}; GET /items/{id}/revisions/effective
                         (at_date query param)

BOM API                  GET /boms/{id}; GET /boms/{id}/explode
                         (depth=N, as_of_date query params);
                         POST /boms; PATCH /boms/{id}/components

Routing API              GET /routings/{id}; POST /routings;
                         GET /routings/{id}/operations

ECO API                  POST /ecos; GET /ecos/{id};
                         POST /ecos/{id}/submit; POST /ecos/{id}/approve
                         (requires e-sig token); POST /ecos/{id}/close;
                         GET /ecos/{id}/affected-items

FMEA API (DFMEA+PFMEA)   POST /fmeas; GET /fmeas/{id}; POST /fmeas/{id}/rows;
                         GET /fmeas/{id}/action-priorities;
                         GET /items/{id}/fmea-gap (NC-sourced gap check)

Drawing API              GET /drawings/{id}; GET /drawings/{id}/viewer-url
                         (short-lived signed URL from PLM integration)

Spec API                 GET /specs/{id}; POST /specs; GET /specs/{id}/revisions

DHF API (MD pack)        GET /dhfs/{id}; GET /dhfs/{id}/completeness-check;
                         POST /dhfs/{id}/index-entries

SBOM API (Cyber)         GET /items/{id}/sbom; GET /items/{id}/vulnerabilities;
                         POST /items/{id}/sbom/scan (trigger async scan)
```

All endpoints: Idempotency-Key header. Rate limit: 300 req/min (FMEA explosion up to 60 req/min).
SLO: BOM explosion p99 < 3 s for depth ≤ 10 and item count ≤ 500. RFC 9457 on all 4xx.
RBAC: Engineering role = full; Quality role = FMEA + Spec; Read-only = GET; Production = Routing
read; Regulatory = DHF/DMR/SOUP read.

---

## 7. Frontend Surfaces (per F4 + F5)

```
Item Master Workspace        Projection: items by status, by family, by type.
                              GTIN search. UDI search (MD).

Item Master Record Shell     Authoritative: item detail; BOM tab; Routing tab; FMEA tab;
                              Spec tab; Drawing tab; ECO history; Lot history link;
                              Pack-specific: DHF link (MD), CRA (Aero), SBOM (Cyber).

BOM Workspace                Projection: BOM tree visualization; where-used reverse lookup.

BOM Record Shell             Authoritative: BOM header; component grid; alternate groups;
                              effectivity dates; ECO trail.

Routing Workspace            Projection: routing by item; operation standard time vs actual.

Routing Record Shell         Authoritative: operation sequence; work center assignments;
                              work instruction links; yield per operation.

ECO Workspace                Projection: open ECOs by status; in_review awaiting my approval;
                              overdue implementation.

ECO Record Shell             Authoritative: ECO header; affected items table; impact analysis;
                              approval chain with e-sig status; verification checklist.

FMEA Workspace               Projection: FMEAs by item/process; AP heat map by severity.

FMEA Record Shell            Authoritative: FMEA rows with AP; action plan status;
                              NC-sourced gaps flagged.

DHF Record Shell (MD)        Authoritative: DHF index; completeness gauge; design review
                              history; transfer-to-production gate status.

SCI/HCI Record Shell (Aero)  Authoritative: DAL level; lifecycle data object checklist;
                              MC/DC coverage (DAL A); tool qualification status.

SBOM Workspace (Cyber)       Projection: all items with CVEs; CVSS ≥ 9 priority queue.
```

---

## 8. Cross-Cutting Concerns Instantiation

```
C1 Audit Chain      Every ECO transition, every BOM/Routing/Spec release, every FMEA
                    row modification logged with actor, timestamp, before/after value.

C2 E-signature      ECO approval requires e-sig from each approver (Engineering + Quality
                    + Production + Doc Control). FMEA release requires Quality Engineer
                    e-sig. DHF entry release requires Regulatory Affairs e-sig.

C8 Observability    BOM explosion time monitored; SLO breach alert when p99 > 3 s.
                    ECO approval cycle time tracked per ECO type.

C10 Retention       ECO and FMEA records retained per H5 regulated_root class (≥ product
                    lifetime + 10 years for MD; ≥ 15 years for Aero).

C11 AI Advisory     AI may suggest FMEA failure modes from prior NC root cause patterns.
                    AI may populate BOM alternate suggestions from historical procurement.
                    In both cases: human owner (Engineering Lead or Quality Engineer)
                    must confirm before any record is created. Per L1 banned decisions:
                    AI does not autonomously create or approve ECOs or FMEA rows.
```

---

## 9. Wave Assignments

```
Item Master + Item Family        L4 W0.5;  L5 W2
Item Revision + Item Spec        L4 W1;    L5 W3
BOM + BOM Component              L4 W2;    L5 W3
Routing + Operations + Steps     L4 W2;    L5 W3
ECO + ECO Affected Item          L4 W3;    L5 W3
Drawing + Drawing Revision       L4 W3;    L5 W3
Spec + Spec Revision             L4 W3;    L5 W3
DFMEA + PFMEA                    L4 W6;    L5 W6
PFD                              L4 W6;    L5 W10
HARA / ASIL (J2 Auto)            L4 W6;    L5 W8
FMECA (J3 Aero)                  L4 W7;    L5 W8
DHF + DMR (J4 MD)                L4 W6;    L5 W8
SOUP Register (J4 MD)            L4 W7;    L5 W8
PCCP (J4 MD AI)                  L4 W8;    L5 W9
Cyber Threat Model + SBOM        L4 W7;    L5 W8
DO-178C SCI (J3 Aero)            L4 W7;    L5 W8
DO-254 HCI (J3 Aero)             L4 W7;    L5 W8
Counterfeit Risk Assessment      L4 W6;    L5 W8
ARP 4754A SDD (J3 Aero)          L4 W7;    L5 W8
```

---

## 10. Standards Governing This Domain (clause-level)

```
ISO 9001:2015      §8.3 (design and development): §8.3.2 planning, §8.3.3 inputs,
                   §8.3.4 controls, §8.3.5 outputs, §8.3.6 changes

ISO 13485:2016     §7.3 design and development for medical devices: §7.3.2 planning,
                   §7.3.3 inputs, §7.3.5 review, §7.3.6 verification, §7.3.7 validation,
                   §7.3.9 changes; §7.3.10 design transfer (DHF)

21 CFR Part 820    §820.30 design controls: (a) general, (b) design and development
                   planning, (c) design input, (d) design output, (e) design review,
                   (f) design verification, (g) design validation, (h) design transfer,
                   (i) design changes, (j) design history file
                   §820.181 device master record; §820.182 device history record

IATF 16949:2016    §8.3 design and development: §8.3.3.1 product design inputs,
                   §8.3.3.2 manufacturing process design input, §8.3.3.3 special
                   characteristics, §8.3.5.2 manufacturing process design output

AIAG-VDA FMEA      2019 edition: Step 1-7 approach; AP lookup table; MSR FMEA

AIAG APQP          2nd Edition: Phase 1-5; input/output deliverables per phase

AIAG PPAP          4th Edition: 18 elements; submission levels 1-5

AS9100D            §8.3 design and development; §8.3.4.1 first article inspection reference

AS9145             APQP for Aerospace (APQP4AERO); correlates to AIAG APQP

ISO 14971:2019     §4 risk management process; §5 risk analysis; §6 risk evaluation;
                   §7 risk control; §8 residual risk evaluation; §9 overall residual risk

IEC 62304:2006+A1  §4.3 software safety classification; §5 software development process;
                   §6 software maintenance; §7 software risk management;
                   §8 software configuration management; §9 software problem resolution

DO-178C / RTCA     Table A-1 (software lifecycle data per DAL); §6 software planning;
DO-178C 2012       §11 additional considerations; MC/DC coverage (DAL A)

DO-254 / RTCA      §4 hardware design life cycle; §10 COTS usage; §11 tool assessment
DO-254 2000

ARP 4754A          §5 development assurance levels; §6 safety requirements; §7 process
                   assurance; §8 aircraft-level safety assessment

ARP 4761           §7 FMEA; §7.3 criticality analysis (FMECA); §7.4 FHA; §7.5 PSSA

ISO 26262-3:2018   §6 hazard analysis and risk assessment (HARA); §7 functional safety
                   concept; Table 4 ASIL determination

IEC 81001-5-1:2021 Health software cybersecurity lifecycle; threat modeling; SBOM

AS5553B:2019       §5 risk-based approach; §6 approved sources; counterfeit avoidance

AS6174B:2017       Counterfeit detection; test methods; §5.2 documentation requirements

ICH Q12:2019       Technology and process changes; PACMP (precedes PCCP concept for pharma)

ICH Q14:2023       Analytical procedure development (relevant to C2 test method specs)
```

---

## 11. Boundary with Adjacent Domains

- **D-01 Commercial**: SO line references item_id + item_revision_id from C2.
  Customer-required revisions and customer-specific variants authored here. ECO changes
  trigger customer notification when CSR requires advance notice per CAP-C1-10.

- **D-03 Planning**: BOM and Routing are primary inputs to MRP. Effectivity dates on
  BOM revisions drive when new component requirements appear in MRP demand.
  Routing standard times drive capacity planning.

- **D-04 Procurement**: BOM components drive planned purchase orders. Approved sources
  list (CRA) drives supplier selection in C4 for counterfeit-sensitive items.
  Incoming inspection criteria reference item spec from C2.

- **D-06 Shopfloor/MES**: Routing operations consumed by C6 job execution. Work
  instructions per operation link to controlled documents in C7. ISA-88 phase mapping
  enables C6 recipe execution without separate mapping.

- **D-07 Quality**: FMEA failure modes are the source for Control Plan check items in
  C7. Key characteristics (KC) from Spec trigger SPC in C6. NC root cause analysis
  in C7 triggers FMEA review in C2.

- **D-09 Maintenance**: Equipment families in routing operations drive calibration and
  preventive maintenance scheduling in C9. Routing changes that add new equipment families
  trigger maintenance planning update request.

- **D-08 Traceability**: Item revision is the anchor for every genealogy record. Lot
  record (C5) carries item_revision_id at creation, enabling traceability to exact
  specification in force at production time.

---

## 12. Per-Pack Overlays

### J1 — Pharma

- item.gtin required for all drug products before first batch release.
- Item Spec must include analytical method reference (ICH Q14) for each active pharmaceutical
  ingredient (API) per FDA 21 CFR 211.68.
- SOUP register: for drug calculation software (e.g. weight-based dosing), IEC 62304 Class C
  treatment required even if not classified as medical device.
- ECO for specification change: requires FDA Prior Approval Supplement or Annual Report
  filing per 21 CFR 314.70; filing reference stored in eco.regulatory_submission_ref field.

### J2 — Automotive

- DFMEA per AIAG-VDA 2019 mandatory for all finished goods before PPAP submission.
- PFMEA per AIAG-VDA 2019 mandatory before first production part approval.
- PFD mandatory; linked to both PFMEA and Control Plan.
- APQP phase gate (SM-APQP): item transitions from in_development to qualified only after
  Phase 3 (Product and Process Design Development) APQP gate review.
- HARA / ASIL: required for all items containing automotive E/E per ISO 26262.
- Special characteristics (CC/SC) flagged on Spec and FMEA rows must appear in Control Plan
  and be monitored with SPC in C6.

### J3 — Aerospace

- All safety-critical items: FMECA (§2.18) and ARP 4754A SDD (§2.19) required before FAI.
- DO-178C SCI and DO-254 HCI records required for all airborne software/hardware items.
  DAL level assigned at item qualification; cannot be downgraded without safety case review.
- Counterfeit Risk Assessment (§2.27) required for all electronic components before first PO.
  HIGH/CRITICAL risk items: procurement from approved_sources list only (AS5553 §6.5).
- ITAR control: item.itar_controlled flag (additional field, J3 extension). When true:
  export control review required before item data shared with non-US persons; ECO approvals
  require compliance officer review.
- AS9102 FAI: Routing Operation designated as FAI gate (critical_op=true + fai_required=true
  extension field) must have FAI completion record (SM-FAI = approved) before first production
  shipment in C1.

### J4 — Medical Device

- DHF (§2.20) required for all finished good device families before FDA 510(k)/PMA submission
  or EU MDR technical file.
- DHF completeness gate (CAP-C2-10): 6 record types must all be present before ECO close
  for any design change affecting the device.
- SOUP register (§2.22): all OTS software used in the device must be evaluated; unknown
  provenance disqualifies the software for Class C use.
- PCCP (§2.23): required for any AI/ML-enabled SaMD; must be pre-approved by FDA before
  algorithm update shipped.
- Cyber Threat Model: required per FDA 2023 final guidance 21 CMR §524b; must be refreshed
  annually or on any security-relevant BOM change.
- UDI-DI on all implantables and Class II/III active devices before first production lot
  (FDA 21 CFR 830; EU MDR Annex VI).

### J5 — Food & Beverage

- Item spec must include allergen declaration (Regulation (EU) 1169/2011; FDA FSMA Part 117).
- item.allergen_flags populated before item_status = active.
- BOM component allergen cross-contamination analysis: if child component has allergen flags
  not in parent item.allergen_flags, a cross-contamination risk review is triggered.
- HACCP plan reference: item_spec for food-contact items links to HACCP plan document (C7
  Controlled Document) specifying CCPs and critical limits.
- Shelf-life spec: shelf_life_days required for all food products; drives FEFO allocation
  in C5 and expiry date enforcement at shipment.

---

## 13. Failure Modes Catalog

| Failure | Trigger | Impact | Recovery |
|---|---|---|---|
| BOM effectivity gap | New revision effective before old revision superseded | MRP consumes wrong BOM | Validation at SM-7 close: date-overlap between revisions blocked |
| ECO approved without all required e-signatures | Workflow configuration gap | Non-compliant change record | BD-5 API enforcement: POST /ecos/{id}/approve returns 403 if approver set incomplete |
| FMEA AP not updated after NC root cause | NC closed without FMEA review | Unknown failure mode in production | Auto-task: NC root cause ≠ any PFMEA failure mode → FMEA review task created, assigned to Quality Engineer |
| Phantom BOM component creates inventory reservation | MRP treats phantom as real | False material shortage | Item.item_type = PHANTOM: MRP explodes through, does not generate reservation; validated at BOM component create |
| DHF incomplete at ECO close | Medical device design change | Regulatory non-compliance | DHF completeness gate (CAP-C2-10) blocks ECO close; Problem Detail lists missing record types |
| SOUP anomaly list not current | Vendor publishes new anomaly list; HESEM not notified | IEC 62304 compliance gap | Quarterly SOUP review task auto-created per soup.last_reviewed_date + 90d |
| SBOM CVE critical unpatched | New CVE published for component in SBOM | FDA cybersecurity non-compliance | Daily CVE scan; CVSS ≥ 9 → alert within 24h; ctm.patch_status = CRITICAL_OPEN; escalated to Engineering Lead |
| Routing standard time drift | Actuals diverge from standards by > 20% | Capacity plan inaccurate | C6 actual time data feeds monthly routing review; alert when (actual − standard) / standard > 20% for ≥ 3 consecutive lots |

---

## 14. KPIs

| KPI | Formula | Target | Measurement |
|---|---|---|---|
| ECO Cycle Time | median(eco.closed_at − eco.created_at) | < 10 business days (NORMAL); < 3 days (URGENT) | Per ECO priority class; rolling 90d |
| FMEA AP-H Closure Rate | closed AP-H actions / total AP-H actions in period | 100% closed by target_completion_date | Monthly; any open overdue AP-H action triggers alert to Engineering Lead |
| BOM Accuracy | (production orders with zero BOM-driven material shortages) / total orders | ≥ 97% | Per C6 production execution; material shortage event logged per order |
| First-Pass ECO Approval | ECOs approved without rejection / total ECOs submitted | ≥ 80% | Monthly; rejections analyzed by reason_category |
| Item Revision Compliance | (production lots traceable to specific item_revision_id) / total lots | 100% | Per C5 lot creation; item_revision_id required field |
| NC-to-FMEA Review Closure | FMEA review tasks created from NC gaps and closed within 30d / total | ≥ 90% | Per auto-created review tasks; rolling 90d |
| DHF Completeness at Transfer | device families with DHF = 100% complete at transfer_to_production | 100% | Per DHF completeness gate pass/fail log |
| SBOM Currency | items with last_scan_date < 30 days / total cyber-tracked items | 100% | Daily; items with scan gap > 30d flagged |

---

## 15. RACI — Key Process Steps

| Step | Engineering Lead | Quality Engineer | Production Lead | Doc Control | Regulatory Affairs |
|---|---|---|---|---|---|
| Item introduction (NII) | A/R | C | C | C | I |
| BOM + Routing authoring | A/R | C | C | − | − |
| ECO initiation + impact | R | C | C | C | I (regulated) |
| ECO multi-party approval | A | R | R | R | R (regulated items) |
| DFMEA/PFMEA authoring | C | A/R | C | − | − |
| DHF entry + completeness | C | C | − | C | A/R |
| SOUP review | C | C | − | − | A/R |
| PCCP maintenance (MD AI) | C | C | − | − | A/R |
| Cyber threat model update | A/R | C | − | − | C (MD) |
| Counterfeit risk assessment | A/R | C | − | − | − |

---

## 16. Decision Phrase

```
S2-01_C1_C2_COMMERCIAL_ENGINEERING_DEEP_UPGRADE_COMPLETE
```

After emit: load `S2-02_C3_C4_PLANNING_PROCUREMENT.md` next.

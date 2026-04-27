# M3 — Root Catalog (V10)

```
chapter_id:     M3
version:        V10
chapter_purpose: complete catalog of all authoritative roots; every root
                 listed with owning domain, state machine, frontend
                 pattern, banned-decision linkage, primary evidence
                 classes, retention class, and pack instantiation
owner_role:     Plan Editor with Domain Leads (one per domain)
cross_refs:     M2 (domain ownership); M4 (state machines); H4 (evidence
                classes EC-1..EC-38); H5 (retention classes); L1 (BD-N);
                Part F (patterns); Part J (pack overlays)
```

An authoritative root is the single unit of ownership for a regulated
decision in HESEM. It is the entity whose lifecycle is governed by a
state machine, whose mutations are captured in the OTG audit chain, and
which appears in the M3 root catalog. Every entity that must be audited,
validated, or traceable in HESEM is anchored to exactly one root in this
catalog.

The root catalog is HESEM's fundamental contribution to regulated manufacturing
data integrity. In most ERP and MES platforms, there is no explicit catalog
of which entities own regulated decisions, which have audit chains, or which
generate evidence. The result is audit trail gaps and validation failures:
an inspector asks "show me all the changes made to this batch record and who
authorized them" and the system cannot produce a complete, cryptographically
verified answer. HESEM's root catalog combined with the OTG audit chain
(B6) and evidence taxonomy (H4) ensures that every question an auditor can
ask has a complete, traceable answer. The catalog is not documentation —
it is an operational specification that drives code, tests, and compliance
posture simultaneously.

The V10 catalog covers 273 root entries across 15 domain sections plus
cross-pack artifacts. Not all roots are instantiated for all tenants: pack-
specific roots (J1-J5 columns) are activated per tenant's provisioned packs.
The 18 Wave 1 roots are the first deployment cohort, verified by the HMV4
Playwright test suite. All remaining roots are implemented in production
behind feature flags, wave-gated per ADR-0005, and promoted as each wave
delivers its domain stream targets.

The catalog must be updated whenever a root is added, modified (SM change,
BD linkage change, EC change, retention class change), deprecated, or
retired. The governance process for each of these triggers is defined in
§31. The catalog is version-controlled in the repository; changes are
reviewed by the CTO and Compliance Lead before merge. The catalog version
number matches the HESEM wave plan version (M3 V10 = Wave Plan V10).

Per-root attributes (columns in catalog tables):
- **ID**: Stable identifier used in code, tests, and cross-references
- **Canonical name**: Display name; authoritative vocabulary (per M1)
- **Domain**: Owning bounded context (per M2)
- **SM**: State machine identifier (per M4); `-` means no lifecycle SM
- **Pattern**: Primary frontend pattern (per Part F)
- **BD**: Banned decisions that touch this root (per L1)
- **EC**: Primary evidence classes generated (per H4)
- **Ret**: Retention class (per H5)
- **Pack**: Pack instantiation or overlay (base = all packs)

---

## 1. Wave 1 roots — 18 HMV4 program roots

The 18 Wave 1 roots are the foundation of the HMV4 frontend prototype
program. Each has a dedicated Playwright E2E test suite and fixture data.

```
ID      CANONICAL NAME                 DOMAIN       SM      PAT   BD      EC              RET
DISP    Dispatch Board                 Shopfloor    -       WS    -       EC-3,EC-4       regulated_root
NQCASE  Nonconformance Case            Quality      SM-6    AR    BD-2    EC-13,EC-14,    regulated_root
                                                                          EC-2
TRAIN   Training Matrix                Workforce    -       WS    -       EC-11           regulated_root
CAPA    CAPA Record                    Quality      SM-6    AR    BD-3    EC-14,EC-2      regulated_root
CDOC    Controlled Document            Quality      SM-7    AR    BD-4    EC-10,EC-2      regulated_root
INSP    Inspection                     Quality      SM-4/5  AR    -       EC-18,EC-2      regulated_root
BREL    Batch Release                  Quality      SM-10   AR    BD-1    EC-19,EC-2,     regulated_root
                                                                          EC-1
ECO     Engineering Change Order       Engineering  SM-7    AR    BD-5    EC-16,EC-2      regulated_root
JO      Job Order                      Shopfloor    SM-1    AR    -       EC-4            regulated_root
SO      Sales Order                    Commercial   SM-1    AR    -       EC-4            regulated_root
WO      Work Order                     Shopfloor    SM-3    AR    -       EC-4,EC-3       regulated_root
CPO     Customer Purchase Order        Commercial   SM-1    AR    -       EC-4            regulated_root
PO      Purchase Order                 Procurement  SM-2    AR    -       EC-4,EC-2       regulated_root
QUO     Quote                          Commercial   -       AR    -       EC-4            regulated_root
PREC    Procurement Receipt            Procurement  SM-4    AR    -       EC-4,EC-18      regulated_root
LOT     Lot                            Inventory    -       AR    -       EC-4            regulated_root
IREV    Inspection Review              Quality      SM-5    AR    -       EC-18,EC-2      regulated_root
MWO     Maintenance Work Order         Maintenance  SM-9    AR    -       EC-4,EC-12      regulated_root
```

---

## 2. Commercial domain roots (C1)

```
ID              CANONICAL NAME                   SM     PAT   BD   EC           RET
SO              Sales Order                      SM-1   AR    -    EC-4         standard
CPO             Customer Purchase Order          SM-1   AR    -    EC-4         standard
QUO             Quote                            -      AR    -    EC-4         standard
CUST-FORE       Customer Order Forecast          -      AR    -    EC-4         standard
CUST-SCHED      Customer Order Schedule          -      AR    -    EC-4         standard
CUST            Customer (master)                -      AR    -    EC-4         standard
CUST-SITE       Customer Site                    -      AR    -    EC-4         standard
CUST-CONTACT    Customer Contact                 -      AR    -    EC-4         standard
PRICE-CAT       Pricing Catalog                  -      AR    -    -            standard
PRICE-OVR       Pricing Override                 -      AR    -    EC-4         standard
CUST-CONTRACT   Customer Contract                -      AR    -    EC-4         standard
CUST-MSA        Customer Master Service Agmt     -      AR    -    EC-4         legal_hold
CSR             Customer Specific Requirement    -      AR    -    EC-16        regulated_root
RMA             Return Material Authorization    -      AR    -    EC-4         standard
SALES-FORE      Sales Forecast                   -      AR    -    -            standard
DEMAND-PLAN     Demand Plan                      -      AR    -    -            standard
ORDER-HOLD      Order Hold                       -      AR    -    EC-4         standard
```

---

## 3. Engineering domain roots (C2)

```
ID              CANONICAL NAME                   SM     PAT   BD   EC           RET
ITEM            Item (master)                    -      AR    -    EC-16        regulated_root
ITEM-FAM        Item Family                      -      AR    -    EC-16        regulated_root
ITEM-SPEC       Item Specification               -      AR    BD-5 EC-16,EC-2   regulated_root
BOM             Bill of Materials                -      AR    BD-5 EC-16,EC-2   regulated_root
BOM-COMP        BOM Component                    -      sub   -    EC-16        regulated_root
ROUTING         Routing                          -      AR    BD-5 EC-16,EC-2   regulated_root
ROUTING-OP      Routing Operation                -      sub   -    EC-16        regulated_root
OP-STEP         Operation Step                   -      sub   -    EC-16        regulated_root
DRAWING         Engineering Drawing              SM-7   AR    BD-5 EC-16,EC-2   regulated_root
DRAWING-REV     Drawing Revision                 -      sub   -    EC-16        regulated_root
ECO             Engineering Change Order         SM-7   AR    BD-5 EC-16,EC-2   regulated_root
ECO-ITEM        ECO Affected Item                -      sub   -    EC-16        regulated_root
SPEC            Specification                    SM-7   AR    BD-5 EC-16,EC-2   regulated_root
SPEC-REV        Specification Revision           -      sub   -    EC-16        regulated_root
DFMEA           Design FMEA                      -      AR    -    EC-16,EC-2   regulated_root  J2
PFMEA           Process FMEA                     -      AR    -    EC-16,EC-2   regulated_root  J2
PFD             Process Flow Diagram             -      AR    -    EC-16        regulated_root  J2
DHF             Design History File              SM-DHF AR    BD-5 EC-16,EC-2   regulated_root  J4
DMR             Device Master Record             -      AR    BD-5 EC-16        regulated_root  J4
ARP4754         ARP 4754A System Development     -      AR    -    EC-16        regulated_root  J3
HARA            Hazard Analysis / ASIL           -      AR    -    EC-16,EC-2   regulated_root  J2
CYBER-MODEL     Cyber Threat Model               -      AR    -    EC-16,EC-2   regulated_root  J4
SBOM            Software Bill of Materials       -      AR    -    EC-16        regulated_root  J4
SOUP-REG        SOUP / OTSS Register             -      AR    -    EC-16        regulated_root  J4
PCCP            Predet. Change Control Plan      -      AR    -    EC-16,EC-2   regulated_root  J4
DO178-SCI       DO-178C Software Config Item     -      AR    -    EC-16        regulated_root  J3
DO254-HCI       DO-254 Hardware Config Item      -      AR    -    EC-16        regulated_root  J3
```

---

## 4. Planning domain roots (C3)

```
ID              CANONICAL NAME                   SM          PAT   BD   EC     RET
MPS             Master Production Schedule       -           AR    -    -      standard
MRP-ACTION      MRP Action                       -           AR    -    -      standard
DEMAND          Demand Record                    -           AR    -    -      standard
SUPPLY-PLAN     Supply Plan                      -           AR    -    -      standard
CAP-PLAN        Capacity Plan                    -           AR    -    -      standard
PROD-SCHED      Production Schedule              -           AR    -    -      standard
APQP-PROJ       APQP Project                     SM-APQP     AR    -    EC-16  regulated_root  J2
APQP-PHASE      APQP Phase Decision              -           sub   -    EC-16  regulated_root  J2
AS9145-APQP     AS9145 APQP Project              SM-AS9145   AR    -    EC-16  regulated_root  J3
PROD-TRIAL      Production Trial Run             -           AR    -    EC-4   regulated_root  J2
ANNUAL-LAYOUT   Annual Layout Inspection         -           AR    -    EC-18  regulated_root  J2
```

---

## 5. Procurement domain roots (C4)

```
ID              CANONICAL NAME                   SM          PAT   BD   EC           RET
PO              Purchase Order                   SM-2        AR    -    EC-4,EC-2    standard
PO-LINE         PO Line Item                     -           sub   -    EC-4         standard
SUPPLIER        Supplier (master)                -           AR    -    EC-4         regulated_root
SUPP-SITE       Supplier Site                    -           AR    -    EC-4         regulated_root
SUPP-CONTACT    Supplier Contact                 -           AR    -    -            standard
SUPP-QUAL       Supplier Qualification           SM-SUP      AR    BD-7 EC-4,EC-2    regulated_root
SUPP-SCORE      Supplier Scorecard               -           AR    -    EC-4         standard
SCAR            Supplier Corrective Action       -           AR    -    EC-14        regulated_root
RTV             Return to Vendor                 -           AR    -    EC-4         standard
PREC            Procurement Receipt              SM-4        AR    -    EC-4,EC-18   regulated_root
PSW             Part Submission Warrant          -           AR    -    EC-4         regulated_root  J2
PPAP-SUB        PPAP Submission                  SM-PPAP     AR    -    EC-4,EC-16   regulated_root  J2
ISIR            Initial Sample Inspection        -           AR    -    EC-18        regulated_root  J2
FSVP-VERIFY     FSVP Verification Activity       -           AR    -    EC-18,EC-2   regulated_root  J5
NADCAP-CERT     NADCAP Cert Tracking             -           AR    -    EC-4         regulated_root  J3
COUNT-RISK      Counterfeit Risk Assessment      -           AR    -    EC-4,EC-2    regulated_root  J3
COUNT-INV       Counterfeit Investigation        -           AR    BD-22 EC-14,EC-2  regulated_root  J3
GIDEP-SUB       GIDEP Submission                 -           AR    BD-22 EC-4        regulated_root  J3
QPL-QML         QPL / QML Registry               -           AR    -    EC-4         regulated_root  J3
```

---

## 6. Inventory domain roots (C5)

```
ID              CANONICAL NAME                   SM          PAT   BD   EC           RET
LOT             Lot                              -           AR    -    EC-4         regulated_root
SERIAL          Serial Number                    -           AR    -    EC-4         regulated_root
BIN             Bin / Location                   -           AR    -    -            standard
STOCK-MOVE      Stock Movement                   -           AR    -    EC-4         regulated_root
ADJUSTMENT      Inventory Adjustment             -           AR    -    EC-4         regulated_root
CYCLE-COUNT     Cycle Count                      -           AR    -    EC-4         standard
CYCLE-VAR       Cycle Count Variance             -           AR    -    EC-4         standard
LOT-HOLD        Lot Hold                         SM-HOLD     AR    -    EC-4,EC-2    regulated_root
DSCSA-TXN       DSCSA Transaction                -           AR    -    EC-4         regulated_root  J1
DSCSA-UNIT      DSCSA Serialized Unit            -           AR    -    EC-4         regulated_root  J1
EU-FMD-DECOM    EU FMD Decommissioning Event     -           AR    -    EC-4         regulated_root  J1
FSMA-KDE        FSMA §204 KDE/CTE                -           AR    -    EC-4         regulated_root  J5
MATERIAL-TRACE  Material Traceability Chain      -           AR    -    EC-4         regulated_root  J3
ITAR-ITEM       ITAR Item Control                -           AR    BD-24 EC-4,EC-2   regulated_root  J3
EAR-CLASS       EAR Item Classification          -           AR    -    EC-4         regulated_root  J3
```

---

## 7. Shopfloor / MES domain roots (C6)

```
ID              CANONICAL NAME                   SM          PAT   BD   EC           RET
WO              Work Order                       SM-3        AR    -    EC-4,EC-3    regulated_root
WO-OP           WO Operation                     -           sub   -    EC-3,EC-4    regulated_root
WO-STEP         WO Step                          -           sub   -    EC-3         regulated_root
OPERATION       Operation (master)               -           AR    -    EC-16        regulated_root
YIELD           Yield Record                     -           AR    -    EC-4,EC-3    regulated_root
SPC-CHART       SPC Chart (master)               -           AR    -    EC-4         regulated_root
SPC-SAMPLE      SPC Sample                       -           sub   -    EC-4         regulated_root
FPI             First-Piece Inspection           -           AR    -    EC-18        regulated_root
EDGE-GW         Edge Gateway                     -           AR    -    EC-4         standard
EDGE-SITE       Edge Gateway Site                -           AR    -    EC-4         standard
SCADA-CONN      SCADA Connection                 -           AR    -    EC-4         standard
WORKCELL        Workcell                         -           AR    -    EC-4         standard
WORKCELL-ST     Workcell State                   -           sub   -    EC-4         standard
EBR             Electronic Batch Record          SM-EBR      AR    BD-9 EC-4,EC-1,   regulated_root  J1
                                                                        EC-2
CLEAN-VAL       Cleaning Validation Cycle        -           AR    -    EC-4,EC-2    regulated_root  J1
EM-RUN          Environmental Monitoring Run     -           AR    -    EC-4,EC-18   regulated_root  J1
MEDIA-FILL      Media Fill Run                   -           AR    -    EC-4,EC-18   regulated_root  J1
LPA-RUN         Layered Process Audit Run        -           AR    -    EC-4,EC-12   regulated_root  J2
LPA-PLAN        LPA Plan                         -           AR    -    EC-16        regulated_root  J2
FAI             First Article Inspection         -           AR    -    EC-18,EC-2   regulated_root  J3
SLL-PART        Service-Life-Limited Part        -           AR    -    EC-4         regulated_root  J3
ENG-MAINT       Engine Maintenance Record        -           AR    -    EC-4,EC-12   regulated_root  J3
HACCP-PLAN      HACCP Plan                       -           AR    -    EC-16,EC-2   regulated_root  J5
CCP-MON         CCP Monitoring Record            SM-CCP      AR    -    EC-4,EC-18   regulated_root  J5
ALLERGEN-CP     Allergen Control Plan            -           AR    -    EC-16        regulated_root  J5
SANITATION      Sanitation Record                -           AR    -    EC-4         regulated_root  J5
FOOD-DEFENSE    Food Defense Plan                -           AR    -    EC-16        regulated_root  J5
PROC-AUTH       Process Authority Letter         -           AR    -    EC-4,EC-16   regulated_root  J5
```

---

## 8. Quality / eQMS domain roots (C7)

```
ID              CANONICAL NAME                   SM          PAT   BD   EC           RET
NQCASE          Nonconformance Case              SM-6        AR    BD-2  EC-13,EC-14  regulated_root
                                                                         EC-2
CAPA            CAPA Record                      SM-6        AR    BD-3  EC-14,EC-2   regulated_root
8D-INV          8D Investigation                 -           AR    -     EC-14,EC-2   regulated_root  J2
AUDIT-FIND      Audit Finding                    SM-12       AR    -     EC-12        regulated_root
AUDIT-PLAN      Audit Plan                       -           AR    -     EC-12        regulated_root
AUDIT-RUN       Audit Run                        SM-12       AR    -     EC-12,EC-2   regulated_root
CDOC            Controlled Document              SM-7        AR    BD-4  EC-10,EC-2   regulated_root
CDOC-EFF        Document Effectivity             -           sub   -     EC-10        regulated_root
INSP            Inspection                       SM-4/5      AR    -     EC-18,EC-2   regulated_root
INSP-PLAN       Inspection Plan                  -           AR    -     EC-18        regulated_root
INSP-SAMPLE     Inspection Sample Plan           -           AR    -     EC-18        regulated_root
DISPOSITION     Disposition                      SM-5        AR    BD-2  EC-13,EC-2   regulated_root
BREL            Batch Release                    SM-10       AR    BD-1  EC-19,EC-1,  regulated_root
                                                                         EC-2
QP-DECL         QP Declaration                   -           AR    BD-9  EC-1,EC-2    regulated_root  J1
PRRC-DECL       PRRC Declaration                 -           AR    BD-15 EC-1,EC-2    regulated_root  J4
APR             Annual Product Review            SM-APR      AR    BD-9  EC-20,EC-2   regulated_root  J1
STAB-STUDY      Stability Study                  SM-STAB     AR    -     EC-4,EC-18   regulated_root  J1
DEVIATION       Deviation                        SM-DEV      AR    -     EC-13,EC-14  regulated_root  J1
                                                                         EC-2
VIG-REPORT      Vigilance Report                 SM-VIG      AR    BD-15 EC-13,EC-2   regulated_root  J4
PSUR            Periodic Safety Update Report    SM-PSUR     AR    BD-15 EC-20,EC-2   regulated_root  J4
PMS-PLAN        PMS Plan                         -           AR    -     EC-20        regulated_root  J4
PMS-REPORT      PMS Report                       -           AR    BD-15 EC-20,EC-2   regulated_root  J4
CER             Clinical Evaluation Report       -           AR    BD-15 EC-20,EC-2   regulated_root  J4
ICSR            Individual Case Safety Report    SM-ICSR     AR    -     EC-13,EC-2   regulated_root  J1
RM-FILE         Risk Management File             SM-RM       AR    -     EC-17,EC-2   regulated_root  J4
RISK-POLICY     Risk Acceptability Policy        -           AR    -     EC-17        regulated_root
RISK-RECORD     Risk Record                      SM-RR       AR    -     EC-17,EC-2   regulated_root
CMPLT           Customer Complaint               SM-CMPLT    AR    -     EC-13,EC-14  regulated_root
RECALL          Recall Decision                  SM-11       AR    BD-8  EC-13,EC-2   regulated_root
FSCA            Field Safety Corrective Action   SM-FSCA     AR    BD-15 EC-13,EC-14  regulated_root  J4
                                                                         EC-2
FAR             Field Alert Report               -           AR    -     EC-13        regulated_root  J1
RFR-SUB         Reportable Food Registry Sub.    -           AR    -     EC-13        regulated_root  J5
MOCK-RECALL     Mock Recall Run                  -           AR    -     EC-12,EC-2   regulated_root  J5
VMP             Validation Master Plan           -           AR    -     EC-10        regulated_root
VAL-PACK        Validation Pack                  SM-14       AR    -     EC-15,EC-2   regulated_root
CLEAN-VAL-QA    Cleaning Validation (Quality)    -           AR    -     EC-15,EC-18  regulated_root  J1
IREV            Inspection Review                SM-5        AR    -     EC-18,EC-2   regulated_root
```

---

## 9. Traceability domain roots (C8)

```
ID              CANONICAL NAME                   SM     PAT   BD   EC           RET
LOT-GEN         Lot Genealogy Chain              -       AR    -    EC-4         regulated_root
LOT-GEN-SNAP    Genealogy Snapshot               -       AR    -    EC-4         regulated_root
SERIAL-TRACE    Serial Number (trace view)       -       AR    -    EC-4         regulated_root
UDI             Unique Device Identifier         -       AR    -    EC-4         regulated_root  J4
DSCSA-SU-T      DSCSA Serialized Unit (Trace)    -       AR    -    EC-4         regulated_root  J1
EU-FMD-PACK     EU FMD Pack-Level                -       AR    -    EC-4         regulated_root  J1
FSMA-LOT        FSMA §204 Lot Traceability       -       AR    -    EC-4         regulated_root  J5
```

---

## 10. Maintenance domain roots (C9)

```
ID              CANONICAL NAME                   SM     PAT   BD   EC           RET
ASSET           Asset (master)                   -       AR    -    EC-4         regulated_root
ASSET-CLASS     Asset Class                      -       AR    -    EC-4         standard
PM-PLAN         PM Plan                          -       AR    -    EC-4         regulated_root
PM-CYCLE        PM Cycle                         -       AR    -    EC-4         regulated_root
MWO             Maintenance Work Order           SM-9    AR    -    EC-4,EC-12   regulated_root
CALIBRATION     Calibration Record               -       AR    -    EC-4,EC-12   regulated_root
CALIB-MASTER    Calibration Master               -       AR    -    EC-4         regulated_root
EQUIP-QUAL      Equipment Qualification          -       AR    -    EC-15,EC-2   regulated_root
SPARE-PART      Spare Part                       -       AR    -    EC-4         standard
ASSET-STATE     Asset State                      -       sub   -    EC-4         regulated_root
TOOLING         Tooling Record                   -       AR    -    EC-4         standard
SB-COMPLY       Service Bulletin Compliance      -       AR    BD-25 EC-4,EC-12  regulated_root  J3
AD-COMPLY       Airworthiness Directive Comply   -       AR    BD-25 EC-4,EC-12  regulated_root  J3
PAH-RECORD      Production Approval Holder       -       AR    -    EC-4         regulated_root  J3
```

---

## 11. Workforce domain roots (C10)

```
ID              CANONICAL NAME                   SM     PAT   BD   EC           RET
PERSON          Person (master)                  -       AR    -    EC-11        regulated_root
SKILL           Skill (master)                   -       AR    -    EC-11        regulated_root
TRAIN-PLAN      Training Plan                    -       AR    -    EC-11        regulated_root
TRAIN-RECORD    Training Record                  SM-8    AR    BD-6 EC-11,EC-2   regulated_root
COMPETENCY      Competency Assessment            -       AR    BD-6 EC-11,EC-2   regulated_root
ASEPTIC-QUAL    Aseptic Personnel Qualification  -       AR    BD-6 EC-11,EC-2   regulated_root  J1
HACCP-TEAM      HACCP Team Charter               -       AR    -    EC-11,EC-16  regulated_root  J5
PCQI-RECORD     PCQI Record                      -       AR    -    EC-11        regulated_root  J5
ITAR-PERSON     ITAR Person-of-Record            -       AR    BD-24 EC-11,EC-2  regulated_root  J3
SCHEDULE        Work Schedule                    -       AR    -    -            standard
SHIFT           Shift                            -       AR    -    -            standard
ROLE            Role (master)                    -       AR    -    EC-11        regulated_root
```

---

## 12. Finance domain roots (C11)

```
ID              CANONICAL NAME                   SM     PAT   BD   EC   RET
COST-CENTER     Cost Center                      -       AR    -    -    standard
GL-ACCOUNT      GL Account                       -       AR    -    -    financial_7yr
GL-POSTING      GL Posting                       -       AR    -    -    financial_7yr
COST-ROLL       Cost Roll                        -       AR    -    -    financial_7yr
STD-COST        Standard Cost                    -       AR    -    -    financial_7yr
COPQ            Cost of Poor Quality             -       AR    -    -    standard
```

---

## 13. Integration domain roots (C12)

```
ID              CANONICAL NAME                   SM     PAT   BD   EC           RET
CONNECTOR       Connector (master)               -       AR    -    EC-4         standard
SUBSCRIPTION    Event Subscription               -       AR    -    EC-4         standard
INT-EVENT       Integration Event                -       sub   -    EC-8         standard
SUB-PROC        Sub-Processor Record             -       AR    BD-31 EC-4,EC-2   regulated_root
DPA             Data Processing Agreement        -       AR    BD-31 EC-4,EC-2   legal_hold
EDI-TXN         EDI Transaction                  -       AR    -    EC-4         standard  J2
DSCSA-PARTNER   DSCSA Trading Partner            -       AR    -    EC-4         regulated_root  J1
EUDAMED-ACCT    EUDAMED Registration Account     -       AR    -    EC-4         regulated_root  J4
GUDID-ACCT      GUDID Account                    -       AR    -    EC-4         regulated_root  J4
CMMC-ARTIFACT   CMMC Assessment Record           -       AR    -    EC-4         regulated_root  J3
GIDEP-IFACE     GIDEP Interface Record           -       AR    BD-22 EC-4        regulated_root  J3
```

---

## 14. Analytics / AI domain roots (C13)

```
ID              CANONICAL NAME                   SM      PAT   BD   EC           RET
KPI-SNAPSHOT    KPI Snapshot                     -        AR    -    -            standard
AI-SCORE        AI Score                         -        AR    -    EC-4         standard
ADVISORY        AI Advisory                      -        AR    -    EC-4,EC-2    regulated_root
AI-MODEL        AI Model (production)            SM-AI    AR    BD-36 EC-4,EC-2   regulated_root
MODEL-VER       AI Model Version                 -        AR    -    EC-4         regulated_root
TRAIN-CORPUS    Training Corpus Reference        -        AR    BD-36 EC-4        regulated_root
OVERRIDE-REC    Override Record                  -        AR    -    EC-2         regulated_root
BD-ATTEMPT      Banned-Decision Attempt Log      -        AR    -    EC-2         regulated_root
DRIFT-EVENT     Drift Event                      -        AR    -    EC-4         standard
RETRAIN-DEC     Retraining Decision              -        AR    BD-36 EC-4,EC-2   regulated_root
REDTEAM-RPT     Red-Team Report                  -        AR    -    EC-4,EC-2    regulated_root
SUBPROC-SEC     Sub-Processor Security Event     -        AR    -    EC-4,EC-2    regulated_root
AI-GOV-ENTRY    Governance Ledger Entry          -        AR    -    EC-4,EC-2    regulated_root
```

---

## 15. Core Platform domain roots (C14)

```
ID              CANONICAL NAME                   SM     PAT   BD   EC           RET
TENANT          Tenant                           -       AR    BD-33 EC-4,EC-2   regulated_root
TENANT-REG      Tenant Regulatory Profile        -       AR    -    EC-4         regulated_root
TENANT-ONBOARD  Tenant Onboarding Project        -       AR    BD-33 EC-4,EC-2   regulated_root
TENANT-OFFBOARD Tenant Offboarding Project       -       AR    BD-33 EC-4,EC-2   regulated_root
SUBPROC-LIST    Sub-Processor List               -       AR    BD-31 EC-4        regulated_root
REGION-PIN      Region Pinning Record            -       AR    BD-32 EC-4,EC-2   regulated_root
ROLE-MASTER     Role (master)                    -       AR    -    EC-11        regulated_root
IDENTITY        Identity (user account)          -       AR    -    EC-11,EC-2   regulated_root
AUTH-EVENT      Auth Event (login/logout)        -       AR    -    EC-11        regulated_root
AUDIT-EVENT     Audit Event                      -       AR    -    EC-4         regulated_root
AUDIT-ANCHOR    Audit Chain Anchor               -       AR    BD-35 EC-4        regulated_root
PSEUDO-KEY      Pseudonymization Key             -       AR    BD-31 EC-2        regulated_root
HOLD-RECORD     Legal Hold Record                -       AR    -    EC-4,EC-2    legal_hold
RETEN-CLASS     Retention Class Definition       -       AR    BD-34 EC-4        regulated_root
BANNED-DEC-SRF  Banned-Decision Surface          -       AR    BD-36 EC-4,EC-2   regulated_root
DPA-CORE        DPA (Core tenant contract)       -       AR    BD-31 EC-4,EC-2   legal_hold
ROPA            Record of Processing Activities  -       AR    -    EC-4,EC-2    regulated_root
DPIA            Data Protection Impact Assess.   -       AR    -    EC-4,EC-2    regulated_root
PRIVACY-REQ     Privacy Subject Request          -       AR    BD-31 EC-4,EC-2   regulated_root
```

---

## 16. Cross-pack regulated artifacts

These roots exist across multiple packs and are governed by cross-pack
evidence and retention rules:

```
ID              CANONICAL NAME                   SM     PAT   BD   EC           RET
VAL-PACK-CP     Validation Pack (cross-pack)     SM-14   AR    BD-36 EC-15,EC-2  regulated_root
AUDIT-ANCHOR-CP Audit Chain Anchor (cross-pack)  -       AR    BD-35 EC-4        regulated_root
WORM-LOCK       WORM Storage Lock Record         -       AR    -    EC-4         regulated_root
PSEUDO-KEY-CP   Pseudonymization Key (cross)     -       AR    BD-31 EC-2        regulated_root
SUBPROC-LIST-CP Sub-Processor List (cross-pack)  -       AR    BD-31 EC-4        regulated_root
DPA-CP          DPA (per tenant)                 -       AR    BD-31 EC-4,EC-2   legal_hold
REGION-PIN-CP   Region Pinning Record (cross)    -       AR    BD-32 EC-4,EC-2   regulated_root
CVLP            Customer Validation Leverage Pk  -       AR    -    EC-15,EC-2   regulated_root
ISO-CERT        ISO Certification                -       AR    -    EC-4         regulated_root
SOC2-REPORT     SOC 2 Report                     -       AR    -    EC-4         regulated_root
NB-CERT         Notified Body Certification      -       AR    BD-15 EC-4,EC-2   regulated_root  J4
ITAR-ACCESS     ITAR Access Grant                -       AR    BD-24 EC-4,EC-2   regulated_root  J3
EAR-ITEM-CP     EAR Item Classification (cross)  -       AR    -    EC-4         regulated_root  J3
```

---

## 17. Root count summary

```
SECTION                           ROOT COUNT
Wave 1 roots (HMV4)               18
Commercial (C1)                   17
Engineering (C2)                  28
Planning (C3)                     11
Procurement (C4)                  19
Inventory (C5)                    15
Shopfloor / MES (C6)              30
Quality / eQMS (C7)               39
Traceability (C8)                 7
Maintenance (C9)                  14
Workforce (C10)                   12
Finance (C11)                     6
Integration (C12)                 11
Analytics / AI (C13)              13
Core Platform (C14)               19
Cross-pack artifacts              14
                                  ─────
TOTAL                             273 roots cataloged

Note: Wave 1 roots also appear in their domain sections; the 18
Wave 1 roots are a subset of the domain catalogs, not additional.
Unique roots: approximately 195 when Wave 1 duplicates removed.
Cross-pack artifacts partially overlap domain catalogs (Core
Platform) — unique cross-pack-only artifacts: 8.
```

---

## 18. Retention class definitions (per H5)

```
CLASS NAME          DESCRIPTION                   MINIMUM RETENTION
regulated_root      Root entity in regulated       Per H5 class R-5:
                    manufacturing domain           15 years (GxP);
                                                   10 years (MD);
                                                   30 years (Implant)
legal_hold          Documents with legal or        Indefinite during hold;
                    contractual retention          per legal counsel
                    obligation
financial_7yr       Financial records              7 years (most
                                                   jurisdictions)
standard            Non-regulated operational      3-7 years (per
                    records                        business need)
```

The `regulated_root` class is the default for any root that touches
a regulated workflow. Retention class assignment is BD-34 and requires
Compliance Lead sign-off.

---

## 19. Root quality gates

For any new root added to the catalog, the following gates must pass:

```
GATE                     REQUIREMENT
Domain assignment         Root assigned to exactly one domain; confirmed
                          by Domain Lead + CTO
State machine             SM assigned (if root has lifecycle states) or
                          justified absence of SM with reason
Pattern assignment        One of DL, ML, WS, AR, AC, ERD, NRD, SFW;
                          AR required for all regulated roots
BD linkage                All BD-N boundaries that this root touches
                          identified; triple-defense test written per L1 §3
Evidence class            Minimum one EC assigned for all regulated roots;
                          EC validated against H4 taxonomy
Retention class           Class assigned; BD-34 process completed if new
                          class required; Compliance Lead sign-off
Fixture created           Fixture data in tests/fixtures/ for HMV4 pre-
                          production mode (if Wave 1 root)
Playwright test           E2E test covering AR pattern render, mutation,
                          audit trail assertion (if Wave 1 root)
Cross-ref updated         M3 catalog entry created; M2 domain model
                          updated if new root adds to domain list
```

---

## 20. Wave 1 root detailed specifications

Each Wave 1 root has a Playwright E2E test suite, fixture data, and an AR
(Authoritative Record shell) pattern implementation. This section provides
the regulatory and functional rationale for each root's presence in Wave 1.

### 20.1 DISP — Dispatch Board

The Dispatch Board is a Workspace Projection (WS) root that presents the
daily shopfloor work queue to production supervisors and operators. It is
not itself a regulated root in the sense of owning a decision, but it
generates EC-3 (operation log) and EC-4 (transaction record) events as
operators interact with it. The DISP root is the entry point for the
Shopfloor domain in HMV4 and demonstrates the WS pattern for real-time
multi-entity views.

From a compliance perspective, Dispatch Board interactions must be
audited: who dispatched which WO, at what time, for which workcell.
A dispatch action that assigns a WO to an unqualified operator (training
status checked via Workforce domain CDC) must be blocked. The DISP pattern
is the first demonstration of cross-domain access control in the HMV4
prototype.

### 20.2 NQCASE — Nonconformance Case

The NQCASE root is the most regulated root in Wave 1. It represents a
formal nonconformance event — a deviation from a specification that must
be investigated, dispositioned (BD-2), and potentially escalated to CAPA
(BD-3). The NQCASE root triggers the SM-6 state machine (Opened →
Under Investigation → Disposition Decision → Closed or Escalated to CAPA).

Every NQCASE generates at minimum EC-13 (quality decision record), EC-14
(corrective action chain), and EC-2 (override record when AI advisory is
not accepted). In Pharma J1 tenants, an NQCASE may escalate to a Deviation
(SM-DEV) or trigger a batch rejection that feeds into the APR (SM-APR).
The NQCASE is the anchor for the eQMS quality loop: NC → CAPA → effectiveness
review → closure.

### 20.3 TRAIN — Training Matrix

The Training Matrix is a Workspace Projection showing the qualification
status of all operators against all required competencies. It is read-only
for supervisors (they see gaps and due dates) and triggers Training Record
creation workflows. A training gap that affects a currently dispatched WO
operation must surface in DISP (cross-domain signal via Workforce CDC).

Training Records (TRAIN-RECORD) are BD-6 roots: a human must certify
operator qualification; AI may advise on competency gaps but may not
autonomously qualify an operator. The Training Matrix is Wave 1 because
most regulated customers in all five verticals require it from day one
of deployment.

### 20.4 CAPA — Corrective and Preventive Action Record

CAPA is the regulated anchor for quality improvement. A CAPA root may be
created standalone (from trend analysis) or escalated from NQCASE. It
has its own SM-6 lifecycle (CAPA uses the same state machine as NC, with
additional steps for root cause analysis, action plan, implementation, and
effectiveness review). CAPA closure is BD-3: a human Quality Lead must
determine and certify effectiveness before closure.

CAPA generates EC-14 (corrective action chain) and EC-2 (override records
throughout the investigation). In regulated environments, open CAPAs are
one of the primary audit findings — a customer can be cited for a CAPA that
has been open beyond its committed due date. HESEM's CAPA root tracks
commitment dates, escalates overdue items, and generates the CAPA
effectiveness evidence that auditors inspect.

### 20.5 CDOC — Controlled Document

Controlled documents (SOPs, work instructions, forms, policies) are the
backbone of a regulated quality management system. The CDOC root governs
the lifecycle of each document version through SM-7: Draft → Review →
Approval → Released → Effective → Superseded → Obsolete. Document release
is BD-4: a human approver with appropriate authority must sign.

CDOC generates EC-10 (controlled document record) and EC-2 (e-signature
records). A released SOP linked to a WO operation (via ROUTING-OP) means
the operator must confirm they have read the effective version before
proceeding — this is the point-of-use SOP display model. In Pharma J1,
document control is one of the top 5 FDA 483 observation categories.

### 20.6 INSP — Inspection

The Inspection root captures the results of incoming (receiving), in-process,
or final inspection of a lot or product. It is governed by SM-4 (Inspection
Plan lifecycle) and SM-5 (Disposition lifecycle). An inspection result may
confirm acceptance or trigger a Disposition decision (BD-2). Inspection
results generate EC-18 (measurement result) and EC-2 (override records
when AI pass/fail prediction is overridden by inspector).

In Pharma J1, in-process inspection results feed into the Electronic Batch
Record (EBR). In MD J4, inspection results are part of the Device History
Record evidence chain. In Food J5, inspection at CCP monitoring points
generates CCP-MON records. The INSP root is shared across all five packs
with pack-specific attribute extensions.

### 20.7 BREL — Batch Release

Batch Release is the most legally significant root in Wave 1. It represents
the authorized release of a production batch for distribution. BD-1 is
absolute: no AI system may autonomously execute a batch release. The human
decision (by a QP in Pharma EU, a quality manager in other sectors) is
recorded with full e-signature (EC-1), evidence pack reference (EC-19),
and override record if the AI advisory recommended rejection but the human
released (EC-2).

BREL uses SM-10 and generates the most comprehensive evidence set:
EC-19 (batch release record) + EC-1 (e-signature chain) + EC-2 (override
records if any advisory was not accepted). In Pharma J1, BREL requires
the QP Declaration (QP-DECL root) as a prerequisite. In Auto J2, batch
release triggers the PPAP approval evidence chain.

### 20.8 ECO — Engineering Change Order

The ECO root governs changes to the engineering master data: BOMs, Routings,
Specifications, Drawings. An ECO must be approved (BD-5) before the change
becomes effective in production. In regulated environments (MD J4, Pharma J1),
ECO approval may trigger re-validation requirements — a change to a validated
process specification requires the CS-B Validation team to assess the
impact on existing validation evidence.

ECO generates EC-16 (engineering change record) and EC-2 (e-signature on
approval). The ECO root is the gateway between Engineering changes and
Production: no component, routing, or specification change may propagate
to active WOs until the ECO is approved and effectivity is set.

### 20.9 JO, SO, WO, CPO — Transactional Order Roots

The four order roots (Job Order, Sales Order, Work Order, Customer PO)
share SM-1 (Sales Order lifecycle) or SM-3 (Work Order lifecycle) and
represent the transactional backbone of the ERP. While not themselves
regulated decisions, they generate EC-4 (transaction record) events and
are the anchor for traceability: a lot is received against a PO, consumed
against a WO, and shipped against a SO. The lot-to-SO traceability chain
is the basis for recall notification.

### 20.10 PO, PREC — Procurement Order and Receipt

The PO (Purchase Order) and PREC (Procurement Receipt) roots govern the
procurement-to-pay workflow. PREC triggers the Incoming Quality Control
process: when material is received, an Inspection root may be created to
inspect the lot before it enters stock. In Pharma J1, incoming material
inspection is a GxP requirement. In Food J5, supplier verification (FSVP)
evidence must be filed before material from a foreign supplier enters production.

### 20.11 LOT — Lot

The Lot root is the primary traceability unit in HESEM. Every quantity of
material that enters the system (via PREC), is produced (via WO), or is
consumed (via WO operation) generates lot events. Lots accumulate genealogy
chains: the finished product lot's genealogy traces back through all input
material lots (and their supplier lots if DSCSA is active). Lot genealogy
is the foundation of recall — "which customers received product from lots
that used this suspect input" is answered by traversing the genealogy graph.

### 20.12 IREV — Inspection Review

The Inspection Review root is the quality decision record following in-process
inspection review — a second-level review of inspection results before
disposition. It sits in the transition between SM-4 (Inspection) and SM-5
(Disposition). IREV is separated from INSP because the inspection reviewer
may be a different person from the inspector, and the review decision may
differ from the inspection result.

### 20.13 MWO — Maintenance Work Order

The Maintenance Work Order governs planned and unplanned maintenance
activities on assets. MWO closure requires confirmation that the asset
was returned to calibrated, qualified condition. In Aero J3, MWO closure
for flight-critical equipment requires sign-off by a certified Aviation
Maintenance Technician. In Pharma J1, MWO closure for production equipment
may trigger re-qualification assessment by the Validation team.

---

## 21. Key regulated root deep-dive: evidence chain examples

The following examples show how evidence classes accumulate on key roots
during a complete regulated workflow:

### 21.1 Pharma Batch Release evidence chain

```
ROOT SEQUENCE:            EVIDENCE GENERATED
EBR root (SM-EBR):        EC-4 (batch transaction)
                          EC-1 (operator e-signatures on each step)
                          EC-3 (operation log per MES step)
                          EC-2 (overrides of AI yield advisory)

INSP root (in-process):   EC-18 (in-process measurement results)
                          EC-2 (inspector override of AI out-of-spec flag)

QP-DECL root:             EC-1 (QP electronic signature; BD-9)
                          EC-2 (if AI had recommended rejection)

BREL root (SM-10):        EC-19 (batch release record)
                          EC-1 (QP and Quality Manager e-signatures)
                          EC-2 (all AI overrides during review)
                          EC-4 (lot disposition to RELEASED state)

APR contribution:         All above evidence is aggregated into the
                          Annual Product Review (SM-APR) at year-end
                          per EU GMP Chapter 1 §1.8.

RETENTION:                All evidence retained 15 years (GxP class R-5
                          per H5) from date of batch release.
```

### 21.2 Medical Device CAPA + FSCA evidence chain

```
ROOT SEQUENCE:            EVIDENCE GENERATED
NQCASE root (SM-6):       EC-13 (quality decision record)
                          EC-2 (NC disposition decision; BD-2)

CAPA root (SM-6):         EC-14 (corrective action chain)
                          EC-2 (root cause determination; effectiveness
                          review; BD-3 at closure)

VIG-REPORT root (SM-VIG): EC-13 (vigilance event report to competent
                          authority; BD-15)
                          EC-2 (PRRC declaration; BD-15)

FSCA root (SM-FSCA):      EC-13 (field safety notice)
                          EC-14 (corrective action details)
                          EC-2 (PRRC sign-off; BD-15)

RECALL root (SM-11):      EC-13 (recall decision record; BD-8)
                          EC-4 (lot traceability: which serialized units
                          affected; GUDID/EUDAMED notification)
                          EC-2 (override of AI scope recommendation)

RETENTION:                All evidence retained 10 years post last
                          manufacturing date (EU MDR Article 10(8);
                          ISO 13485:2016 §4.2.5).
```

---

## 22. Pack root activation policy

Pack-specific roots are activated at the tenant level when a pack is
provisioned. The activation process is governed by BD-33 (tenant
provisioning) and executed by the Core Platform team.

```
ACTIVATION PROCESS:
  1. Sales Order or Pilot Agreement specifies pack(s) purchased
     (J1, J2, J3, J4, J5 — any combination).
  2. Tenant Onboarding Project (TENANT-ONBOARD root) created by
     Customer Success team.
  3. Core Platform team updates Tenant Regulatory Profile
     (TENANT-REG root): pack_ids[] = [J1], [J1, J4], etc.
  4. Feature flag service evaluates pack_ids at request time;
     pack-specific routes, roots, and UI elements become visible.
  5. Pack-specific state machines are loaded for the tenant.
  6. Pack-specific validation pack template (VAL-PACK root) is
     provisioned for CS-B Validation team's CVLP delivery.
  7. Pack-specific evidence class schemas (EC extensions) are
     registered for the tenant in the audit chain anchor service.

DEACTIVATION:
  A pack cannot be deactivated if there are open roots in that pack's
  catalog (e.g., open EBR records in J1). Deactivation requires:
  - All open regulated roots closed or formally superseded
  - Evidence exported per H5 retention requirements
  - BD-33 (tenant modification) approval
  - CS-B Validation team sign-off on evidence completeness
```

---

## 23. Root versioning and schema evolution

Roots evolve as regulatory requirements change or new HESEM capabilities
are added. Root schema evolution follows a stricter policy than standard
database migrations because historical root records must remain queryable
and auditable under the schema that was in effect when they were created.

```
ROOT SCHEMA EVOLUTION RULES:

R-SCHEMA-1: Additive changes only without a version bump
  New optional columns may be added to a root's table without a
  version bump. All prior records remain valid (new column = NULL).
  Example: Adding serialization_scheme to LOT root when DSCSA
  activation is extended to a new pharmaceutical pack tenant.

R-SCHEMA-2: Breaking changes require root schema version increment
  If a column is renamed, removed, or changes type in a way that
  affects historical records, the root schema version increments.
  Version N records remain readable; version N+1 records use the
  new schema. The API exposes both versions during transition window.

R-SCHEMA-3: State machine changes require governance review
  Any change to a state machine (new states, removed transitions,
  new guard conditions) must be reviewed by the domain lead + Quality
  Lead (if the SM touches a BD-N boundary) + Compliance Lead (if
  the SM change affects regulatory evidence generation).
  A frozen ADR (ADR-0006 or domain-specific) must be updated.

R-SCHEMA-4: Evidence class changes require H4 chapter update
  If a root's evidence class set changes (new EC added; EC removed),
  H4 must be updated and Compliance Lead must confirm the change
  does not reduce evidence for any currently audited tenant.

R-SCHEMA-5: Retention class changes are BD-34
  If a root's retention class changes, the BD-34 process (Compliance
  Lead sign-off) is required before the migration is applied.
```

---

## 24. Root cross-reference index (key linkages)

The following table shows the primary cross-root linkages that enforce
regulated workflow integrity. These are soft references (by ID) through
ACL translation, not database foreign keys.

```
SOURCE ROOT    LINKS TO           RELATIONSHIP
NQCASE         CAPA               Escalation: NC may generate CAPA
NQCASE         DISPOSITION        NC investigation produces a disposition
NQCASE         LOT                NC found on a specific lot
CAPA           CDOC               CAPA may revise a controlled document
CAPA           TRAIN-RECORD       CAPA may require retraining of operators
BREL           EBR                Batch release certifies a completed EBR
BREL           INSP               Batch release references all in-process
                                  inspections for the batch
BREL           QP-DECL            Batch release requires QP declaration (J1)
BREL           LOT                Batch release transitions lot to RELEASED
WO             LOT                WO consumes input lots; produces output lot
WO             CDOC               WO operation links to effective SOP revision
WO             TRAIN-RECORD       WO dispatch checks operator qualification
WO             INSP               WO may trigger in-process inspection
ECO            BOM                ECO changes a BOM revision
ECO            ROUTING            ECO changes a Routing revision
ECO            CDOC               ECO may revise a controlled document
ECO            VAL-PACK           ECO with validation impact triggers CVLP
SUPPLIER-QUAL  SUPP-SCORE         Qualification feeds scorecard
SCAR           CAPA               Supplier SCAR may escalate to internal CAPA
RECALL         LOT-GEN            Recall uses genealogy to find affected lots
RECALL         CUST               Recall generates customer notification
VIG-REPORT     NQCASE             Vigilance triggered by NC or complaint
VIG-REPORT     FSCA               Vigilance may escalate to FSCA (J4)
PSUR           APR                PSUR (J4) and APR (J1) both aggregate
                                  periodic quality data
CALIBRATION    ASSET              Calibration records are per-asset
MWO            ASSET              Maintenance work done on specific asset
TRAIN-RECORD   PERSON             Training record certifies a person
TRAIN-RECORD   CDOC               Training record may link to SOP studied
AI-MODEL       RETRAIN-DEC        Model retirement/update governed by BD-36
ADVISORY        OVERRIDE-REC      Every advisory that is overridden generates
                                  an override record
BD-ATTEMPT     BANNED-DEC-SRF    Every BD boundary attempt logged on surface
```

---

## 25. Root failure modes and governance mitigations

```
FM-M3-01: Orphaned root (root with no domain team owner)
  Risk: Root mutations are not monitored; evidence generation lapses.
  Detection: Monthly audit of domain ownership table vs root catalog.
  Mitigation: Every root in M3 has an owning domain and owning team
  (per K5 team structure). Domain lead is responsible for all roots
  in their domain. Orphan check is part of wave delivery gate.

FM-M3-02: Root grows beyond domain boundary (cognitive overload)
  Risk: A root accumulates relationships to so many other domains that
  one team cannot understand its full behavior.
  Detection: Root cross-reference count > 8 outbound links.
  Mitigation: Domain decomposition review: consider splitting root
  into two roots in separate contexts (per M2 §2.2 bounded context rules).

FM-M3-03: State machine gap (regulated transition with no SM)
  Risk: A root that requires a documented lifecycle has no SM, creating
  an audit gap where state transitions are not explicitly governed.
  Detection: Regulated root in catalog with SM = "-" reviewed quarterly.
  Mitigation: Every root that owns a BD-N boundary must have an SM or
  must document why no SM is needed (justified exemption signed by CTO).

FM-M3-04: Evidence class assignment missing for regulated root
  Risk: A regulated root generates no classified evidence, creating a
  gap in the EC-1..EC-38 evidence chain for audits.
  Detection: Root quality gate (§19): EC column must be non-empty for
  all regulated roots.
  Mitigation: Domain lead + Compliance Lead review EC assignment at
  root creation. H4 updated if new EC class is needed.

FM-M3-05: Pack root active for wrong tenant type
  Risk: A J1 Pharma-only root (e.g., QP-DECL) is visible or writable
  for a J2 Auto tenant, creating confusion and potential data error.
  Detection: Integration test: tenant with only J2 pack activated
  cannot create QP-DECL records (API returns 403; UI hides it).
  Mitigation: Pack activation policy (§22) enforced at feature flag
  evaluation and API authorization layer.

FM-M3-06: Retention class incorrect for a root
  Risk: A root's data is deleted (by automated retention cleanup) before
  regulatory minimum retention is satisfied.
  Detection: Annual retention class audit (per H5 governance).
  Mitigation: BD-34 process requires Compliance Lead to confirm class
  before assignment. Retention cleanup jobs operate on explicit class
  tags, not assumptions.
```

---

## 26. Decision phrase

```
M3_ROOT_CATALOG_V10_LOCKED
S4-14_M1_M2_M3_DEEP_UPGRADE_COMPLETE
NEXT: S4-15_M4_M5_M6.md
```

## 27. Root API surface — standard endpoint convention

Every authoritative root in the catalog must expose a consistent set of
API endpoints per the Part E API framework. The endpoint convention for
a root with ID `{ROOT}` in domain `{domain}` is:

```
LIST:      GET    /api/v1/{domain}/{root_plural}
           Returns paginated list with ICP filter + sort parameters.
           Response: {data: [{root_summary}], meta: {pagination, filters}}

DETAIL:    GET    /api/v1/{domain}/{root_plural}/{id}
           Returns full root record including audit chain reference.
           Response: {data: {root_full}, audit: {chain_id, last_event}}

CREATE:    POST   /api/v1/{domain}/{root_plural}
           Creates root in initial state. Idempotency-Key header required.
           Response: {data: {root_created}, audit_event_id}

MUTATE:    PATCH  /api/v1/{domain}/{root_plural}/{id}/state
           State transition. Body: {transition, justification, e_sig?}
           Validates SM guard conditions; emits audit event; returns new state.
           For BD-N transitions: requires human-authority token in header.

ACTION:    POST   /api/v1/{domain}/{root_plural}/{id}/{action}
           Non-state-transition mutation (add component, attach file, etc.)
           Idempotency-Key header required.

HISTORY:   GET    /api/v1/{domain}/{root_plural}/{id}/history
           Returns paginated audit chain events for this root.
           Used for: audit pack assembly; QBR evidence; regulatory inspection.

EVIDENCE:  GET    /api/v1/{domain}/{root_plural}/{id}/evidence
           Returns assembled evidence package per H4 for this root.
           Format: JSON (for display) or PDF (for download to auditor).

EXAMPLES:
  GET    /api/v1/quality/nonconformances              (NQCASE list)
  GET    /api/v1/quality/nonconformances/{id}         (NQCASE detail)
  POST   /api/v1/quality/nonconformances              (create NQCASE)
  PATCH  /api/v1/quality/nonconformances/{id}/state   (NC → disposition)
  GET    /api/v1/quality/nonconformances/{id}/history (audit chain)
  GET    /api/v1/quality/nonconformances/{id}/evidence (evidence pack)
  POST   /api/v1/inventory/lots/{id}/holds            (cross-domain action)
```

For roots with per-pack API extensions (e.g., EBR in J1 Pharma):

```
PACK ENDPOINT CONVENTION:
  Base endpoints remain in owning domain namespace.
  Pack-specific fields returned based on tenant's pack_ids.
  Pack-specific actions use query parameter pack context:
    POST /api/v1/quality/batch-releases/{id}/qp-declaration
    (only valid for J1 Pharma tenants; 403 for others)
  Pack-specific list filters extended via pack_context query parameter.
```

---

## 28. Regulatory mandate per root category

The following table maps HESEM root categories to the specific regulatory
citations that mandate their existence for each pack. This mapping is
used by the Compliance Lead to validate that the root catalog fully covers
HESEM's regulatory obligations per customer tier.

```
ROOT CATEGORY           J1 PHARMA              J2 AUTO              J3 AERO
NC/CAPA (NQCASE, CAPA)  21 CFR Part 211.192;   IATF 16949 §10.2;   AS9100 §10.2;
                        EU GMP Chapter 8;       VDA 8D procedure     AS9145
                        ICH Q10 §3.2.4

Batch Release (BREL)    21 CFR Part 211.68;    Not regulated at     AS9100 §8.6
                        EU Annex 16;           this level
                        EU GMP Chapter 1 §1.4

Document Control (CDOC) 21 CFR Part 211.68;    IATF 16949 §7.5;    AS9100 §7.5;
                        EU Annex 11 §7;        AIAG APQP            DO-178C DM-1
                        ICH Q10

Training (TRAIN)        21 CFR Part 211.68;    IATF 16949 §7.2;    AS9100 §7.2;
                        EU GMP Chapter 2 §2.8  AIAG Core Tools      DCAS training

Supplier Qual (SUPP)    21 CFR Part 211.84;    IATF 16949 §8.4;    AS9100 §8.4;
                        EU GMP Chapter 7        VDA Q-standards      NADCAP special
                                                                     processes

Inspection (INSP)       21 CFR Part 211.84;    IATF 16949 §8.6;    AS9100 §8.6;
                        EU GMP Chapter 4        AIAG PPAP            AS9102 FAI

Lot Genealogy (LOT-GEN) DSCSA §582;            Customer recall       AS9100 §8.4.3
                        EU FMD Art. 4           traceability         ITAR §125.4

Risk Record (RISK-REC)  ICH Q9; EU GMP          FMEA in IATF         ARP 4761; MIL-
                        Annex 20               §8.3.3               STD-882E

ROOT CATEGORY           J4 MED DEVICE          J5 FOOD              BASE (ALL)
NC/CAPA                 21 CFR Part 820.100;   FSMA Part 117;       ISO 9001 §10.2
                        ISO 13485 §8.5.2;      GFSI benchmarks
                        EU MDR Art. 83

Batch Release           21 CFR Part 820.80;    SQF code §5;         ISO 9001 §8.6
                        ISO 13485 §8.2.6;      BRCGS §7.7
                        EU MDR Art. 10(9)

Document Control        21 CFR Part 820.40;    FSMA Part 117;       ISO 9001 §7.5
                        IEC 62304 §5.1.8;      SQF code §2
                        EU MDR Annex IX

Training                21 CFR Part 820.25;    FSMA PCQI             ISO 9001 §7.2
                        ISO 13485 §6.2         requirement

Supplier Qual           21 CFR Part 820.50;    FSMA FSVP;           ISO 9001 §8.4
                        ISO 13485 §7.4;        GFSI supplier
                        EU MDR Art. 10(1)       management

Inspection              21 CFR Part 820.80;    HACCP CCP             ISO 9001 §8.6
                        ISO 13485 §8.2.6;       monitoring
                        EU MDR §8.4

Vigilance / PSUR        EU MDR Art. 87;        Reportable Food       —
                        21 CFR Part 803;        Registry (FSMA)
                        ISO 13485 §8.2.3

FSCA                    EU MDR Art. 83;        FSMA recall            —
                        21 CFR Part 806;        notification
                        ISO 13485 §8.5.3
```

---

## 29. Root data quality requirements

For each regulated root, the following data quality requirements are
enforced at the API layer and tested in E2E test suites:

```
REQUIREMENT              ENFORCEMENT MECHANISM          APPLIES TO
Non-null required fields  API validation (400 if         All roots
                         missing); database NOT NULL
                         constraint

Audit event on creation  OTG anchor service; tested      All regulated roots
                         via Playwright assertion that    (§19 gate)
                         audit_event_id returned

State machine guard      SM service validates transition; All roots with SM;
compliance               400 if guard fails with reason  tested per transition

Idempotency              Idempotency-Key header; Redis    All CREATE and
                         dedup; 200 returned if duplicate ACTION endpoints

BD-N triple defense      UI (advisory-only label);        All BD-N boundaries
                         API (human-authority token);     (per L1 §3)
                         Audit (event emitted even if
                         rejected)

Tenant isolation         Row-level security or schema     All roots in all
                         isolation; test: tenant A        domains
                         cannot read tenant B's records

E-signature completeness For BD-N transitions requiring   BREL (BD-1),
                         e-sig: meaning + date +          NQCASE-DISP (BD-2),
                         signatory ID all required        CAPA-CLOSE (BD-3),
                         (400 if any missing)             CDOC-RELEASE (BD-4),
                                                          QP-DECL (BD-9), etc.

Evidence class emission  At each regulated state          All regulated roots
                         transition, the corresponding   with EC assignments
                         EC record is created in the
                         evidence store

Pack context validation  API returns 403 if pack-         All pack-specific
                         specific endpoint is called      roots (J1..J5)
                         without tenant having that
                         pack activated
```

---

## 30. Root lifecycle operational monitoring

In production, the health of the root catalog is monitored via a set of
operational metrics that surface in the platform observability stack (per I3)
and are reported in the monthly board package (per K5 §10.3).

### 30.1 Per-root operational metrics

```
METRIC                       MEASUREMENT             TARGET
Root creation rate           Roots created per day   Trend stable;
                             per domain               no unexpected spikes
                             (new records in          or drops
                             each root table)

State machine velocity       Average time in each    NQCASE open:
                             state per root type      < 30 days (Pro);
                             (identifies stuck        < 14 days (Enterprise)
                             records; audit risk      CAPA open: < 60 days
                             if records stale)

BD boundary encounter rate   BD-N token presented    > 90% of BD encounters
                             per day by boundary      result in human decision
                             type; override rate      within 24h (not deferred)

Evidence class emission lag  Time from root           < 1 minute P95 from
                             state transition to      state transition to
                             EC record created        EC record persisted

Orphan record count          Roots in non-terminal    Zero (auto-alert if
                             state with no            any regulated root
                             activity > SLA           has no activity >
                             threshold                30 days)

Audit chain completeness     % of regulated roots     100% (any root with
                             with audit events        zero audit events is
                             for every state          a critical alert)
                             transition

Cross-root link validity     Soft reference IDs       < 0.1% orphan rate;
                             resolving vs total        nightly validation job
```

### 30.2 Root aging alerts

Roots in regulated workflows that remain open beyond defined SLA thresholds
generate automatic alerts to the CSM (for customer-facing impact) and to
the domain lead (for operational action):

```
ROOT TYPE          OPEN > THRESHOLD   ALERT LEVEL   ACTION
NQCASE             30 days            AMBER          CSM notified;
                                                    customer QBR agenda
NQCASE             60 days            RED            VP CS + domain lead;
                                                    escalation plan
CAPA               60 days            AMBER          Quality team alert
CAPA               90 days            RED            VP CS + Compliance Lead
CDOC (in review)   14 days            AMBER          Document approver reminder
SUPP-QUAL          90 days            AMBER          Procurement team alert
  (in progress)
EBR (open)         3 days             AMBER          Shopfloor + Quality
  (J1 Pharma)      (batch cycle time)               immediate escalation
MWO (overdue PM)   PM due date        AMBER          Maintenance team alert
                   exceeded
TRAINING-RECORD    Training due       AMBER          Supervisor + HR alert
  (gap)            date exceeded
```

### 30.3 Root volume forecasting

As HESEM tenants grow, root volume grows with them. The platform team
uses root volume metrics to plan capacity (per I5 and I6):

```
TENANT TYPE          ROOT GROWTH RATE       CAPACITY PLANNING RULE
Core (SME)           ~500 new roots/month   Shared cluster sufficient
                     (all types combined)   through 200 Core tenants
Pro (mid-market)     ~5,000 roots/month     Shared cluster; per-tenant
                     per tenant             storage budget enforced
Enterprise           ~50,000 roots/month    Dedicated database per tenant;
                     per tenant             storage autoscale per I5
Sovereign            ~100,000+ roots/month  Dedicated infrastructure;
                     per tenant             capacity modeled at contract

HIGH-VOLUME ROOTS:   AUDIT-EVENT, AUTH-EVENT, ADVISORY, SPC-SAMPLE,
                     WO-STEP, EM-RUN (Pharma), CCP-MON (Food)
                     These roots are generated at machine rate and
                     require partitioned tables (by tenant_id + year)
                     from Phase 3 (Series A+) onwards.
```

---

## 31. Root catalog maintenance and governance

The M3 root catalog is a living document with a defined governance process
for adding, modifying, or retiring roots.

```
TRIGGER                      PROCESS
New pack feature adds root   Pack Lead proposes root; Domain Lead reviews;
                             CTO + Compliance Lead approve; M3 updated;
                             H4 updated (EC assignment); H5 updated
                             (retention class); API endpoint added;
                             Playwright test written; wave delivery gate
                             requires all these steps complete

Regulatory change mandates   Compliance Lead identifies gap; creates RFC
new root                     (per M2 §2.2 RFC process); emergency wave
                             inclusion if regulatory deadline imminent;
                             standard wave process otherwise

Root deprecation             Root must be in terminal state for all
                             existing tenant records; new-record creation
                             disabled (feature flag); historical records
                             remain readable per retention class;
                             migration to replacement root (if any)
                             guided by CS-B Validation team;
                             M3 entry marked deprecated with date

Root retirement (after       After retention period expires for all
  deprecation period)        historical records: storage cleanup per H5;
                             M3 entry archived (not deleted from catalog;
                             catalog is itself a regulated document);
                             audit chain anchor for retired root retained
                             for cryptographic verification of historical
                             chain integrity

Root ownership change        Domain restructuring may move a root from
  (domain boundary change)   one domain to another; requires CTO approval;
                             migration plan (data stays; schema namespace
                             changes); API endpoint prefix updated with
                             redirect from old prefix; ACL in consuming
                             domains updated; M2 domain model updated;
                             M3 domain column updated
```

---

## 20. Decision phrase (canonical — see §26 for M3 phrase)

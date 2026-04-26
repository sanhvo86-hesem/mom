# M3 — Root Catalog

```
chapter_purpose: every authoritative root listed once with owner,
                 state machine, evidence classes, retention class,
                 banned-decision linkage; provides reverse-lookup
                 from name to home chapter
owner_role:      Plan Editor with Domain Leads
```

The catalog of all authoritative roots. A root is the unit of
ownership for regulated decision and the unit of mutation governed
by audit chain + OTG. Every entity that mutates through the system
is rooted somewhere here.

Per-root attributes:
- ID + canonical name
- Owning domain (per Part C)
- State machine (per M4) where applicable
- Pattern (per Part F)
- Banned decisions touched (per L1)
- Primary evidence classes (per H4)
- Retention class (per H5)
- Pack instantiation (per Part J)

---

## 1. Wave 1 roots (18) — HMV4 program

```
ID      NAME                       DOMAIN     SM      PATTERN  BD     EVIDENCE              RETENTION
DISP    Dispatch Board              Shopfloor  -       WS       -      EC-3+EC-4              regulated_root
NQCASE  Nonconformance Case         Quality    SM-6    AR       BD-2   EC-13+EC-14+EC-2       regulated_root
TRAIN   Training Matrix             Workforce  -       WS       -      EC-11                  regulated_root
CAPA    CAPA                        Quality    SM-6    AR       BD-3   EC-14+EC-2             regulated_root
CDOC    Controlled Document         Quality    SM-7    AR       BD-4   EC-10+EC-2             regulated_root
INSP    Inspection                  Quality    SM-4/5  AR       -      EC-18+EC-2             regulated_root
BREL    Batch Release               Quality    SM-10   AR       BD-1   EC-19+EC-2+EC-1        regulated_root
ECO     Engineering Change Order    Engineering SM-7   AR       BD-5   EC-16+EC-2             regulated_root
JO      Job Order                   Shopfloor  SM-1    AR       -      EC-4                   regulated_root
SO      Sales Order                 Commercial SM-1    AR       -      EC-4                   regulated_root
WO      Work Order                  Shopfloor  SM-3    AR       -      EC-4+EC-3              regulated_root
CPO     Customer PO                 Commercial SM-1    AR       -      EC-4                   regulated_root
PO      Purchase Order              Procurement SM-2   AR       -      EC-4+EC-2              regulated_root
QUO     Quote                       Commercial -       AR       -      EC-4                   regulated_root
PREC    Procurement Receipt         Procurement SM-4   AR       -      EC-4+EC-18             regulated_root
LOT     Lot                          Inventory  -       AR       -      EC-4                   regulated_root
IREV    Inspection Review            Quality    SM-5    AR       -      EC-18+EC-2             regulated_root
MWO     Maintenance Work Order       Maintenance SM-9   AR       -      EC-4+EC-12             regulated_root
```

---

## 2. Commercial roots (C1)

```
SO         Sales Order              SM-1    AR
CPO        Customer PO              SM-1    AR
QUO        Quote                    -       AR
Customer Order Forecast              -       AR
Customer Order Schedule              -       AR
Customer                              -       AR (master data)
Customer Site                          -       AR
Customer Contact                        -       AR
Pricing Catalog                          -       AR
Pricing Override                          -       AR
Customer Contract                          -       AR
Customer Master Service Agreement          -       AR
Customer Specific Requirement (CSR)        -       AR (parameterized)
RMA (Return Material Authorization)        -       AR
Sales Forecast                              -       AR
Demand Plan                                -       AR
Order Hold (Credit / Engineering / Quality) -       AR
```

---

## 3. Engineering roots (C2)

```
Item                                -       AR (master data)
Item Family                          -       AR
Item Spec                             -       AR
BOM (Bill of Materials)               -       AR
BOM Component                          -       sub-record
Routing                                -       AR
Routing Operation                      -       sub-record
Operation Step                          -       sub-record
Drawing                                 -       AR
Drawing Revision                          -       sub-record
ECO                                       SM-7    AR
ECO Affected Item                          -       sub-record
Spec                                       -       AR
Spec Revision                              -       sub-record
DFMEA                                       -       AR (Auto pack)
PFMEA                                       -       AR (Auto pack)
PFD (Process Flow Diagram)                  -       AR (Auto pack)
DHF (Design History File)                    SM-DHF  AR (MD pack)
DMR                                            -       AR (MD pack)
ARP 4754A System Development                 -       AR (Aero pack)
HARA / ASIL                                    -       AR (Auto E/E)
Cyber Threat Model                              -       AR (cross pack)
SBOM                                            -       AR
SOUP / OTSS Register                            -       AR (MD pack)
Predetermined Change Control Plan (PCCP)        -       AR (MD AI pack)
```

---

## 4. Planning roots (C3)

```
MPS Schedule                          -       AR
MRP Action                              -       AR
Demand                                   -       AR
Supply Plan                                -       AR
Schedule                                    -       AR
Capacity Plan                                -       AR
APQP Project (Auto pack)                       SM-APQP AR
APQP Phase Decision                              -       sub-record
AS9145 APQP Project (Aero pack)                  -       AR
Production Trial Run                              -       AR
Annual Layout Inspection                          -       AR
```

---

## 5. Procurement roots (C4)

```
PO                                     SM-2    AR
PO Line Item                              -       sub-record
Supplier                                  -       AR (master)
Supplier Site                             -       AR
Supplier Contact                          -       AR
Supplier Qualification                    SM-SUP  AR (BD-7)
Supplier Scorecard                         -       AR
SCAR (Supplier Corrective Action)           -       AR
RTV (Return to Vendor)                       -       AR
PREC (Procurement Receipt)                    SM-4    AR
PSW (Part Submission Warrant; Auto)            -       AR
PPAP Submission (Auto)                          SM-PPAP AR
ISIR (Initial Sample Inspection; Auto)          -       AR
FSVP Verification Activity (Food)               -       AR
NADCAP Cert Tracking (Aero)                     -       AR
```

---

## 6. Inventory roots (C5)

```
Item                                  -       AR (cross-domain master)
Lot                                     -       AR
Serial                                   -       AR
Bin / Location                            -       AR
Stock Move                                 -       AR
Adjustment                                  -       AR
Cycle Count                                  -       AR
Cycle Count Variance                          -       AR
DSCSA Transaction (Pharma)                     -       AR
DSCSA Serialized Unit (Pharma)                 -       AR
EU FMD Decommissioning Event (Pharma)          -       AR
FSMA §204 KDE/CTE (Food)                       -       AR
Material Traceability Chain (Aero)             -       AR
ITAR Item Control (Aero)                       -       AR
EAR Classification (Aero)                       -       AR
```

---

## 7. Shopfloor / MES roots (C6)

```
WO                                  SM-3    AR
WO Operation                           -       sub-record
WO Step                                 -       sub-record
Operation                                -       AR
Yield Record                              -       AR
SPC Chart                                  -       AR
SPC Sample                                  -       sub-record
First-Piece Inspection                       -       AR (cross to Quality)
Edge Gateway                                  -       AR
Edge Gateway Site                              -       AR
SCADA Connection                                -       AR
Workcell                                          -       AR
Workcell State                                    -       sub-record
EBR (Pharma)                                       SM-10   AR
Cleaning Validation Cycle (Pharma)                  -       AR
EM Run (Pharma sterile)                              -       AR
Media Fill Run (Pharma)                              -       AR
Layered Process Audit Run (Auto)                      -       AR
LPA Plan (Auto)                                        -       AR
First Article Inspection (AS9102; Aero)                 -       AR
Service-Life-Limited Part Record (Aero)                  -       AR
Engine Maintenance Record (Aero Part 145)                  -       AR
HACCP Plan (Food)                                            -       AR
CCP Monitoring Record (Food)                                  -       AR
Allergen Control Plan (Food)                                  -       AR
Sanitation Record (Food)                                       -       AR
Food Defense Plan (Food)                                       -       AR
Process Authority Letter (Food LACF)                            -       AR
```

---

## 8. Quality / eQMS roots (C7)

```
NC (Nonconformance Case)               SM-6    AR (BD-2)
CAPA                                     SM-6    AR (BD-3)
8D Investigation                           -       AR (Auto pack overlay)
Audit Finding                                SM-12   AR (BD-12 audit close)
Audit Plan                                    -       AR
Audit Run                                      -       AR
Doc Review                                      -       AR
Doc Effectivity                                  -       sub-record
Inspection                                       SM-4/5  AR
Inspection Plan                                   -       AR
Inspection Sample Plan                            -       AR
Disposition                                       SM-5    AR (BD-2)
Batch Release                                       SM-10   AR (BD-1)
QP Declaration (Pharma)                              -       AR (BD-9)
PRRC Decision (MD)                                    -       AR (BD-15)
APR (Pharma)                                          -       AR (BD-9)
Stability Study (Pharma)                              SM-STAB AR
Deviation (Pharma)                                     SM-DEV  AR
Vigilance Report (MD)                                   SM-VIG  AR (BD-15)
PSUR (MD)                                                SM-PSUR AR
PMS Plan + Report (MD)                                    -       AR
Clinical Evaluation Report (MD)                            -       AR
ICSR (Pharma)                                              SM-ICSR AR
Risk Management File (per ISO 14971)                        SM-RM   AR
Risk Acceptability Policy                                    -       AR (per tenant)
Risk Record (per H9)                                          SM-RR   AR
Customer Complaint                                              SM-CMPLT AR
Recall Decision                                                  SM-11   AR (BD-8)
Field Safety Corrective Action (MD)                                SM-FSCA AR
Field Alert Report (Pharma)                                          -       AR
Reportable Food Registry Submission (Food)                            -       AR
Mock Recall Run (Food)                                                  -       AR
Validation Master Plan                                                    -       AR
Validation Pack (per H2 §7)                                                SM-14   AR
Cleaning Validation                                                          -       AR (Pharma)
```

---

## 9. Traceability roots (C8)

```
Lot Genealogy Chain                  -       AR
Serial                                 -       AR
UDI (MD)                                -       AR
Genealogy Snapshot                       -       AR
DSCSA Serialized Unit (Pharma)            -       AR
EU FMD Pack-Level (Pharma)                  -       AR
FSMA §204 Lot (Food)                          -       AR
```

---

## 10. Maintenance roots (C9)

```
Asset                                 -       AR (master)
Asset Class                              -       AR
PM Plan                                   -       AR
PM Cycle                                    -       AR
MWO (Maintenance Work Order)                  SM-9    AR
Calibration Record                              -       AR
Calibration Master                                 -       AR
Equipment Qualification (IQ/OQ/PQ)                  -       AR
Spare Part                                            -       AR (cross to Inventory)
Asset State                                            -       sub-record
Tooling Record                                          -       AR
Service Bulletin Compliance (Aero)                      -       AR (BD-25)
Airworthiness Directive Compliance (Aero)                -       AR
```

---

## 11. Workforce roots (C10)

```
Person                                 -       AR (cross-domain master)
Skill                                    -       AR
Training Plan                              -       AR
Training Record                              -       AR (BD-6)
Competency Assessment                          -       AR
Aseptic Personnel Qualification (Pharma)         -       AR
HACCP Team Charter (Food)                          -       AR
PCQI Record (Food)                                  -       AR
ITAR Person-of-Record (Aero)                          -       AR (BD-24)
Schedule                                                -       AR
Shift                                                     -       AR
Role                                                       -       AR (cross to Core)
```

---

## 12. Finance roots (C11)

```
Cost Center                            -       AR
GL Account                                -       AR
GL Posting                                  -       AR
Cost Roll                                    -       AR
Standard Cost                                  -       AR
COPQ (Cost of Poor Quality)                      -       AR
```

---

## 13. Integration roots (C12)

```
Connector                              -       AR
Subscription                              -       AR
Event                                       -       sub-record
Sub-Processor Record                          -       AR (BD-31)
DPA (Data Processing Agreement)                  -       AR
EDI Transaction (Auto pack overlay)                 -       AR
DSCSA Trading Partner (Pharma)                        -       AR
EUDAMED / GUDID Account (MD)                            -       AR
```

---

## 14. Analytics / AI roots (C13)

```
KPI Snapshot                            -       AR
Score                                    -       AR
Advisory                                 -       AR (per L2)
Model (per L3 §3 model card)              SM-AI   AR (BD-36)
Model Version                              -       AR
Training Corpus Reference                    -       AR
Override Record                                -       AR (per L1)
Banned-Decision Attempt Log                       -       AR
Drift Event                                          -       AR
Retraining Decision                                    -       AR
Red-Team Report                                          -       AR
Sub-Processor Security Event                              -       AR
```

---

## 15. Core platform roots (C14)

```
Tenant                                -       AR (BD-33)
Tenant Regulatory Profile                -       AR
Sub-Processor List                        -       AR
Region Pinning Record                       -       AR (BD-32)
Role                                          -       AR
Identity                                       -       AR
Auth Event                                       -       AR
Audit Event                                        -       AR
Audit Anchor                                        -       AR
Pseudonymization Key                                  -       AR
Hold Record (legal hold per H5)                          -       AR
Retention Class                                            -       AR (BD-34)
Banned-Decision Surface                                       -       AR (BD-36)
DPA + Sub-Processor List                                        -       AR
ROPA (per GDPR)                                                  -       AR
DPIA                                                                -       AR
Privacy Subject Request                                              -       AR
Tenant Onboarding Project                                              -       AR
Tenant Offboarding Project                                              -       AR
```

---

## 16. Aerospace-specific (J3 overlay; cross-cuts)

```
NADCAP Special Process Cert            -       AR
Counterfeit Risk Assessment              -       AR
Counterfeit Investigation                  -       AR
GIDEP Submission                              -       AR (BD-22)
ITAR Access Grant                              -       AR (BD-24)
EAR Item Classification                          -       AR
CMMC Assessment Record                            -       AR
DO-178C Software Configuration Item                -       AR
DO-254 Hardware Configuration Item                  -       AR
QPL / QML Registry                                    -       AR
Production Approval Holder Record                       -       AR
```

---

## 17. Cross-pack regulated artifacts

```
Validation Pack (per H2 §7)             SM-14   AR (BD-36)
Audit Chain Anchor                         -       AR (BD-35)
WORM Storage Lock                            -       AR
Pseudonymization Key                            -       AR
Sub-Processor List                                -       AR (BD-31)
DPA (per tenant)                                    -       AR
Region Pinning Record                                -       AR (BD-32)
Customer Validation Leverage Pack                      -       AR
ISO Cert (27001 / 13485 / 9001 / etc.)                  -       AR
SOC 2 Report                                              -       AR
NB Cert (MD MDR / IVDR)                                     -       AR
```

---

## 18. Decision phrase

```
M3_ROOT_CATALOG_BASELINE_LOCKED
NEXT: M4_STATE_MACHINE_DIRECTORY.md
```

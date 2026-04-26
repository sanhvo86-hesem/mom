# D4 — Receive to Inspect

```
workflow_id:    D4
workflow_name:  Receive to Inspect
owner_role:     Logistics Lead with Quality Lead
participants:   Procurement, Inventory, Quality, Engineering (spec),
                Compliance (regulated material)
state_machines: SM-2 Procurement (parent); SM-4 Inspection Receipt
                (primary); SM-5 Disposition; SM-6 NC/CAPA (when
                SCAR); SM-9 Maintenance (calibration currency)
```

D4 is the discipline that prevents non-conforming material from
entering production. It begins at the dock and ends when material is
"available" or definitively dispositioned out (return / scrap /
concession-released).

---

## 1. Purpose and boundary

```
IN SCOPE                              OUT OF SCOPE / HANDED OFF
Physical receipt + count               PO issuance (D2)
Lot / serial / CofA capture            Disposition decision-tree (D5)
Sampling per inspection plan           SCAR cycle (D6)
IQC test execution                     Payment + invoice (D2)
Pass/fail decision per characteristic
Quarantine state management
Counterfeit screen (Aero)
FSVP receiving verification (Food)
Cold-chain integrity check (Pharma /
 Food)
```

---

## 2. Trigger catalog

```
SUPPLIER PHYSICAL DELIVERY            standard
INTER-COMPANY TRANSFER                  receiving from sister site
RETURN FROM CUSTOMER (RMA)              D1 reverse path (different
                                        inspection)
CONSIGNMENT RESTOCK                       supplier re-stocks customer-
                                        owned consigned inventory
DROP-SHIP (ARRIVING AT END CUSTOMER)     receipt evidence relayed
                                        to HESEM tenant
TOOL / GAUGE CALIBRATION RETURN           per D9
PILOT / NPI SAMPLE                          per Engineering NPI
RECALL-TRIGGER RETURN                       return-from-field per D12
ITAR-CONTROLLED RECEIPT                     per J3
DSCSA-COMPLIANT RECEIPT (Pharma)            TI/TH/TS verified at receipt
SERIALIZED RECEIPT (UDI per MD; lot +       per pack
   serial Pharma; serialized Aero
   service-life)
COLD-CHAIN-CRITICAL RECEIPT                  Pharma + Food
HAZARDOUS / DANGEROUS GOODS                  per UN/IMDG/ADR; segregated
NADCAP-CERT-PROCESS RETURN                   Aero (post-process service)
MATERIAL FROM SUB-PROCESSOR (DPA)             per L2 §8 + I8
```

---

## 3. State machine SM-4 Inspection Receipt

```
STATES                          EVENTS / GUARDS               EVIDENCE
expected                        ASN ingested                    EC-22
arrived                          receive_at_dock (qty +          EC-4 + EC-3
                                 condition + lot capture)
quarantined                      sample_drawn                    EC-4 + EC-18
                                 (per plan; per AQL or per
                                 risk-based)
inspecting                       per-characteristic measurement   EC-18 + EC-3
                                 (instrument calibrated;
                                 inspector qualified)
inspection_complete              all-pass | partial-fail |        EC-18 + EC-2
                                 critical-fail                    (signature)
released                         move-to-available (cascade C5)   EC-4
held                             investigation in progress        EC-4
disposition (cascade SM-5)       accept / reject / rework /       EC-13 + EC-2
                                 RTV / concession / scrap         (sig)

HARD COUPLINGS
  SM-2 → SM-4 (PO drives expected receipt)
  SM-4 → SM-5 (disposition)
  SM-7 → SM-4 (effective spec gates inspection)
  SM-9 → SM-4 (calibration currency required)
  SM-8 → SM-4 (inspector qualified)
  SM-4 → C5 (inventory state)
  SM-4 → C8 (lot genealogy initial edge)
SOFT COUPLINGS
  SM-4 → C4 supplier scorecard
  SM-4 → SM-13 (risk file update for material risk)
```

---

## 4. Step substance

### Step 1 — Physical receipt

```
SUBSTANCE                       carrier delivers; receiving
                                operator verifies vs PO + ASN +
                                packing list; counts; physical
                                condition assessed (visual + temp
                                + humidity sensor where applic);
                                hazardous-material handling
                                checked; ITAR-controlled
                                segregation
EVIDENCE                        receipt_event (EC-4); telemetry
                                (EC-3) for sensor data;
                                photo evidence (EC-22) where
                                damage observed
DECISION POINTS                 P1.1 partial-receipt acceptance
                                (some lines)
                                P1.2 over-shipment handling
                                P1.3 damage refusal at dock
                                P1.4 cold-chain violation handling
                                (Pharma / Food specific)
                                P1.5 emergency expedite path
EDGE CASES                       container damage; unauthorized
                                early ship; lost shipment;
                                quantity over PO; mis-shipment;
                                ASN missing; cold-chain alarm
                                breach (sensor data); ITAR
                                mis-handled at carrier
```

### Step 2 — Receipt record

```
SUBSTANCE                       receipt entered; PO referenced;
                                lot / serial captured (per
                                regulated tenant: 100% lot
                                capture; serialized per UDI /
                                DSCSA / FMD where applic);
                                CofA / CoC attached; counterfeit
                                screen at receipt (Aero per AS5553
                                / 6174); FSVP receiving
                                verification (Food); UDI scanned
                                (MD); §204 KDE captured (Food
                                high-risk); identity test (Pharma
                                API); allergen confirmation (Food)
EVIDENCE                        receipt_record (EC-4);
                                cofa_attachment (EC-22); UDI / lot
                                / serial captured; counterfeit
                                screen result (EC-18 sub Aero);
                                FSVP record (EC-18 sub Food);
                                DSCSA TI/TH/TS event (Pharma)
EDGE CASES                       supplier missed CofA; mismatched
                                lot vs ASN; UDI not scannable
                                (manual entry); identity test
                                fails; counterfeit indicator
                                triggered; cold-chain sensor
                                showed excursion
```

### Step 3 — Inspection plan selection

```
SUBSTANCE                       Item Master determines applicable
                                plan; per supplier overrides
                                (CSR, qualification status);
                                per-pack overlay (Pharma per
                                ICH Q6 / Q7; MD per ISO 13485;
                                Auto per CSR); sampling level
                                per AQL or risk-based; equipment
                                + qualification of inspector
                                identified
EVIDENCE                        plan_resolution (EC-22)
DECISION POINTS                 P3.1 reduced inspection (qualified
                                supplier; trend OK)
                                P3.2 normal inspection
                                P3.3 tightened inspection
                                (recent fail trend or first-batch)
                                P3.4 100% inspection (critical
                                characteristic)
                                P3.5 third-party lab where
                                required
EDGE CASES                       plan revision newer than
                                last-applied; per-CSR override
                                differs from baseline; emergency
                                bypass with explicit signoff
```

### Step 4 — Sampling

```
SUBSTANCE                       sampling per AQL (auto +
                                MIL-STD-1916) or per Pharma ICH
                                Q6 or per ISO 2859; sample
                                identifier per piece;
                                chain-of-custody (regulated);
                                per pack: cold-chain preserved
                                during sampling
EVIDENCE                        sample_record (EC-18 + EC-22)
DECISION POINTS                 P4.1 destructive vs non-
                                destructive
                                P4.2 sample expansion when
                                near-limit
                                P4.3 retest after fail
EDGE CASES                       sample lost / contaminated;
                                sample fails first time (per H8
                                if pattern); rare-failure-mode
                                detection requires expanded
                                sample
```

### Step 5 — Inspection execution

```
SUBSTANCE                       per-characteristic measurement;
                                per-characteristic spec compared;
                                instrument calibration current
                                (gate); inspector qualified
                                (gate); per Pharma identity test +
                                impurity per ICH Q3; per Food
                                allergen verification;
                                per Aero counterfeit verification;
                                per Auto special characteristic
                                CC/SC/KPC/KCC SPC monitor;
                                per MD biocompatibility evidence
                                (where new lot)
EVIDENCE                        per-characteristic results
                                (EC-18); SPC sample (EC-3);
                                photos / scans (EC-22);
                                inspector sig (EC-2)
DECISION POINTS                 P5.1 OOS handling per Pharma
                                FDA OOS guidance (full
                                investigation per SM-DEV)
                                P5.2 borderline-fail retest
                                P5.3 instrument recheck
                                P5.4 pause inspection for
                                instrument recalibration
EDGE CASES                       instrument calibration just
                                expired; instrument fail mid-
                                inspection; inspector
                                qualification just expired;
                                method-deviation discovered
                                (per H8); fraud detection
                                (data integrity)
```

### Step 6 — Inspection decision

```
ALL PASS                         lot moves to released (cascade
                                Step 7); supplier scorecard
                                positively updated
SOME FAIL WITHIN AQL              accept with documentation
                                (per plan AQL allowance)
AQL BREACHED                     fail per plan; SCAR cycle
                                (per H8); per pack notification
                                window (per H1 §3); supplier
                                scorecard negatively updated
CRITICAL DEFECT                   100% inspection extended OR
                                full rejection; per regulated
                                pack: SEV per impact
EVIDENCE                          inspection_decision (EC-18 +
                                EC-2 sig)
```

### Step 7 — Disposition (cascade SM-5)

Per D5 detailed.

### Step 8 — Material available + downstream

```
SUBSTANCE                       on accept: lot transitions to
                                "available" in inventory;
                                visible to MRP / D3; cold-chain
                                continued; for regulated lot:
                                effective until expiry date;
                                lot genealogy propagates
EVIDENCE                        availability_event (EC-4);
                                cross-reference to D3
EDGE CASES                       lot effectively dies in storage
                                (expired before consumption);
                                FEFO triggered later
```

---

## 5. Branches

```
STANDARD INCOMING                §4 default
DISTRIBUTOR-IN-WAREHOUSE          per AS9120B Aero
SAMPLE / NPI RECEIPT               smaller sample plan; segregated
RETURN FROM CUSTOMER (RMA)         different decision tree;
                                  customer-side corrupt-evidence
                                  consideration
SERVICE COMPONENT RETURN (Aero)     post-NADCAP service receipt
COLD-CHAIN URGENT (Pharma sterile)  expedited; cold-chain integrity
                                  primary
DSCSA-COMPLIANT (Pharma)            TI/TH/TS exchanged + verified
ITAR-CONTROLLED RECEIPT (Aero)      person-of-record screened
SUSPECT-COUNTERFEIT (Aero)          detailed forensic per AS5553/
                                  6174; quarantine extended
DESTRUCTIVE-TEST RECEIPT             specialty plan
PILOT-LOT QUALIFICATION              per Engineering qualification
                                  protocol
COMMINGLED RECEIPT (multi-PO        special handling
   single shipment)
DROP-SHIP RECEIPT-AT-CUSTOMER       per pack arrangement
SUB-PROCESSOR FABRICATION            with DPA evidence (per L2 §8)
HAZARDOUS-MATERIALS                  per IMDG / UN regulation
ALLERGEN-SEGREGATED (Food)            per allergen plan
EXCIPIENT / API RECEIPT (Pharma)      per ICH Q7 §16
SINGLE-USE DEVICE (MD)                per ISO 11607 + ISO 10993
```

---

## 6. Cross-domain footprint

```
PROCUREMENT (C4)                supplier + PO context
INVENTORY (C5)                    quarantine + available
QUALITY (C7)                      IQC + SCAR
TRACEABILITY (C8)                 lot genealogy initial edge
ENGINEERING (C2)                  spec applied
MAINTENANCE (C9)                   calibration of test instruments
WORKFORCE (C10)                    inspector qualification
ANALYTICS / AI (C13)               supplier scorecard; AI-18
                                  counterfeit indicator (Aero)
INTEGRATION (C12)                  ASN / EDI / DSCSA / EUDAMED
```

---

## 7. Pack overlays

```
PHARMA (J1)                      identity test on every API/excipient;
                                 ICH Q3 impurity check; cold-chain
                                 + temperature record at receipt;
                                 DSCSA TI/TH/TS at receipt
AUTO (J2)                        per-CSR inspection plan; SPC
                                 monitoring of special characteristics;
                                 PPAP-on-file gate
AERO (J3)                        AS5553 / AS6174 counterfeit screen;
                                 GIDEP cross-check; AS9120B
                                 traceability for distributors;
                                 per-NADCAP service verification
MD (J4)                          UDI scan; ISO 10993 biocompatibility
                                 evidence; ISO 11607 sterile barrier
                                 integrity; SOUP register update
FOOD (J5)                        FSVP receipt verification; allergen
                                 verification; cold-chain at receipt;
                                 §204 KDE/CTE captured; sanitary
                                 transport check (FSMA Part 1.900)
```

---

## 8. KPIs

```
- Receipt SLA adherence (carrier-promised vs actual)
- Receipt accuracy (qty / item / condition)
- Inspection cycle time
- IQC pass rate (per supplier; per item)
- AQL breach rate
- SCAR cycle time
- Cold-chain excursion rate (Pharma / Food)
- Counterfeit screen positives (Aero target zero)
- DSCSA suspect handling SLA (Pharma)
- §204 KDE completeness rate (Food)
- Inspector / instrument utilization
- Supplier scorecard delta per period
```

---

## 9. Failure modes + recovery

```
FM1   Wrong item delivered
      Recovery: receipt rejected at dock or held;
              SCAR; replacement; H8 systemic if pattern

FM2   Quantity short
      Recovery: partial receipt; expedite remainder; H8
              if pattern with supplier

FM3   Cold-chain excursion
      Recovery: integrity assessment; possible total reject;
              H8 + supplier audit (H3); regulatory exposure
              per pack (H1 §3 for Pharma); insurance

FM4   Counterfeit confirmed (Aero)
      Recovery: per J3 §10 FM7; SEV-1 per H1 §3; GIDEP
              60-day window; trace-forward per D11

FM5   FSVP receipt verification skipped (Food)
      Recovery: receipt blocked; FSVP completion; H8 systemic

FM6   Identity test fails (Pharma API/excipient)
      Recovery: SEV-2; quarantine extended; investigate;
              SCAR; H1 §3 if patient impact

FM7   Calibration just expired during inspection
      Recovery: invalidate inspection; recalibrate; re-inspect;
              H8 CAPA on calibration cycle discipline

FM8   Inspector qualification just expired
      Recovery: hand-off to qualified backup; if none,
              schedule slip; H8 via D8

FM9   ASN / DSCSA TI absent
      Recovery: reject delivery; per H1 §3 reporting;
              supplier-relationship review

FM10  Suspect data integrity (manual entry suspicious)
      Recovery: SEV-2 per data integrity; investigation;
              H8 systemic; possibly L4 red-team if AI was
              advisory in entry

FM11  RMA from customer with quality cause
      Recovery: per D12 entry; potentially recall scope
              widens
```

---

## 10. Roles and authority (RACI)

```
ACTION              REC  QC  QM  PROC  ENG  COMP  SUP  TENANT
Physical receipt    A    -   -   -     -    -     -    -
Receipt record      A    C   -   C     -    -     -    -
Plan selection      C    R   A   -     R    -     -    -
Sampling            C    R   A   -     -    -     -    -
Inspection          -    R   A   -     -    -     -    -
Decision            -    R   A   -     -    -     -    -
Disposition reg     -    -   A   C     -    A     -    -
                                                  (BD-2)
SCAR open           C    R   A   R     -    -     R    -
Cold-chain breach   R    R   A   C     -    A(reg) -    -
Counterfeit confirm C    R   A   R     -    A     -    A
                                                  (Aero)
```

---

## 11. Cross-references

- D2 (Procurement to Pay) — parent
- D5 (Inspect to Disposition) — disposition decision-tree
- D6 (NC to CAPA) — SCAR
- D11 (Release to Trace) — lot genealogy
- C2 (Engineering) — spec
- C4 (Procurement) — supplier
- C5 (Inventory) — quarantine + available
- C7 (Quality) — IQC discipline
- C8 (Traceability) — initial genealogy edge
- C9 (Maintenance) — calibration
- E3 + E5 + E18-equivalent — APIs
- F4 + F5 — UI surfaces
- H1 §3 — DSCSA + counterfeit + cold-chain notification
- H4 — EC-18 inspection_record
- H8 — SCAR
- J1..J5 — pack overlays
- L1 — BD-2 (regulated disposition)
- L2 — AI-18 counterfeit (Aero)
- M3 — root catalog (PREC, Lot, Inspection)
- M4 — SM-4

---

## 12. Decision phrase

```
D4_RECEIVE_TO_INSPECT_BASELINE_LOCKED
NEXT: D5_INSPECT_TO_DISPOSITION.md
```

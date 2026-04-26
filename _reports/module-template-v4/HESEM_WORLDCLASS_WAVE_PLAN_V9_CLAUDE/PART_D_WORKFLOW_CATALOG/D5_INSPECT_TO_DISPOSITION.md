# D5 — Inspect to Disposition

```
workflow_id:    D5
workflow_name:  Inspect to Disposition
owner_role:     Quality Lead
participants:   Production, Engineering, Logistics, Procurement (SCAR),
                Compliance (regulated material), MRB (multi-party)
state_machines: SM-4 Inspection (parent); SM-5 Disposition (primary;
                BD-2 banned for AI); SM-6 NC/CAPA cascade
```

D5 is where Quality finding meets Operations action. Every regulated
disposition is human-authority (BD-2 banned for AI per L1). The
discipline ensures that no nonconforming material progresses unless
the cause has been understood and the action recorded.

---

## 1. Purpose and boundary

```
IN SCOPE                              OUT OF SCOPE / HANDED OFF
Inspection result classification       Inspection execution (D4 / D3
Standard accept path                    in-process)
Standard fail path                       SCAR cycle (D6)
MRB (Material Review Board) path        recall workflow (D12)
Disposition decision                     Concession addendum to CDOC
Concession path with CDOC linkage         (D7)
Rework routing
Scrap / return-to-vendor (RTV)
NC opening (cascade D6)
Lot status transitions
Genealogy update
```

---

## 2. Trigger catalog

```
IQC RESULT (incoming)                  per D4
IPQC RESULT (in-process)                per D3
FQC RESULT (final / outgoing)            per D3
RECALL TRACE-FORWARD HIT                  per D12
CUSTOMER COMPLAINT INVESTIGATION          per D12
INTERNAL DEVIATION (Pharma SM-DEV)        per J1
HACCP CCP EXCURSION (Food)                 per J5
COUNTERFEIT CONFIRMED (Aero)              per J3
COLD-CHAIN BREACH                          per Pharma / Food
ENVIRONMENTAL EXCURSION (Pharma            per J1 sterile
   sterile)
SUPPLIER-INITIATED HOLD (e.g.,             per supplier alert
   supplier discovered post-ship issue)
RETURN FROM CUSTOMER (RMA)                 per D1 reverse
NEAR-EXPIRY MATERIAL HANDLING               per FEFO + pack
POST-RECALL TRACE                            per D12
HOLD-FOR-VALIDATION (qualification          per H2
   lot)
PROVENANCE ANOMALY (DSCSA suspect            per Pharma DSCSA
   product)
ITAR ACCESS GAP DISCOVERED                    per Aero
```

---

## 3. State machine SM-5 Disposition

```
STATES                          EVENTS / GUARDS              EVIDENCE
inspection_result_avail         classify (per §4 step 2)      EC-18 + EC-22
standard_accept                  release-from-quarantine       EC-4
standard_fail                    open_NC + decide-route        EC-13 + EC-4
mrb_review                       multi-party-discussion +      EC-13 + EC-2
                                signoffs                       (multi-sig)
disposition_decided             accept | concession |          EC-13 + EC-2
                                rework | rtv | scrap
disposition_executed             physical action complete       EC-4 + EC-22
                                                              (logistics)
closed                           (terminal)                     -

HARD COUPLINGS
  SM-4 → SM-5 (inspection feeds disposition)
  SM-5 → SM-6 (failed disposition opens NC if not yet)
  SM-5 → SM-7 (concession-release may require CDOC addendum)
  SM-5 → C5 (lot status)
  SM-5 → C8 (genealogy edge update)
SOFT COUPLINGS
  SM-5 → SM-13 (risk register update if pattern)
  SM-5 → SM-12 (audit finding when systemic)
  SM-5 → C4 (supplier scorecard via SCAR)
```

---

## 4. Step substance

### Step 1 — Inspection results available

```
SUBSTANCE                       inspection result complete (D4 /
                                D3); per characteristic recorded;
                                CofA verified; per pack overlay
                                evidence (counterfeit screen,
                                identity test, etc.)
EVIDENCE                        inspection_record (EC-18) +
                                inspector signature (EC-2)
```

### Step 2 — Classification (standard vs borderline)

```
LOGIC                           ALL pass within tolerance →
                                Standard Accept (Step 3)
                                Clear failure outside any tolerance
                                → Standard Fail (Step 4)
                                Borderline (within retest range,
                                near-AQL boundary, conflicting
                                CofA, partial fail) → MRB (Step 5)
                                Critical defect (per pack rule) →
                                escalate to MRB regardless
EVIDENCE                        classification_decision (EC-22)
DECISION POINTS                 P2.1 borderline retest vs MRB
                                P2.2 critical-characteristic
                                automatic-MRB
                                P2.3 supplier-trend driven path
EDGE CASES                       inspection borderline because
                                instrument calibration drifted;
                                inspector training gap (IPQC was
                                wrong); environmental change
                                affecting sample
```

### Step 3 — Standard Accept

```
SUBSTANCE                       lot quarantine cleared; status
                                "available"; visible to MRP /
                                downstream; supplier scorecard
                                positive update
EVIDENCE                        accept_record (EC-13 + EC-2)
EDGE CASES                       accept-then-discover later
                                (recall scope), see D12
```

### Step 4 — Standard Fail

```
SUBSTANCE                       NC opened (cascade SM-6);
                                disposition decision tree:
                                  SCRAP — destroy; cost write-off
                                  REWORK — in-house or supplier;
                                    routing modified
                                  RTV — return to vendor; SCAR
                                  CONCESSION — release with
                                    documented exception
                                                   (Step 6)
                                Quality Manager approves; for
                                regulated tenant: + Quality Lead
                                / QP / PRRC; AI cannot
                                autonomously commit (BD-2);
                                supplier scorecard negative
                                update
EVIDENCE                        nc_record (EC-13);
                                disposition_decision (EC-13 +
                                EC-2 multi-sig per pack);
                                physical-action_record (EC-4)
DECISION POINTS                 P4.1 in-house rework feasibility
                                P4.2 supplier rework + return
                                cycle
                                P4.3 SCRAP cost recovery from
                                supplier per agreement
                                P4.4 customer-impact assessment
                                (if material was tied to specific
                                customer order)
EDGE CASES                       material partially used before
                                fail discovered (genealogy
                                trace-forward); customer-promised
                                shipment date risk; recall
                                consideration
```

### Step 5 — MRB (Material Review Board)

```
SUBSTANCE                       multi-party meeting (sync or
                                async-with-quorum):
                                  Quality presents findings
                                  Engineering assesses impact
                                  (form / fit / function;
                                  per ISO 14971 risk for MD;
                                  per ICH Q9 for Pharma)
                                  Production assesses recovery
                                  Compliance (regulated): FDA /
                                  EMA / NB implication
                                  Customer (if customer-
                                  specified): impact + concession-
                                  acceptance posture
                                  AI advisory available (advisory
                                  only; cannot commit per BD-2)
                                Decision recorded with multi-party
                                e-signature (regulated tenant:
                                Quality Lead + Engineering Lead +
                                Compliance Lead [+ QP/PRRC for
                                pack]).
EVIDENCE                        MRB_record (EC-13) + multi-sig
                                (EC-2)
DECISION POINTS                 P5.1 ACCEPT-AS-IS (deviation
                                impact assessed and acceptable;
                                rare for regulated)
                                P5.2 ACCEPT-WITH-CONCESSION
                                (Step 6)
                                P5.3 REWORK
                                P5.4 REJECT
                                P5.5 ESCALATE (VP Quality / CEO
                                if cross-cutting)
EDGE CASES                       MRB cannot reach quorum;
                                conflicting expert opinions;
                                customer concession-acceptance
                                pending; regulator pre-clearance
                                required (Pharma sterile);
                                schedule pressure pushing MRB
                                shortcut (anti-pattern; H8 trigger)
```

### Step 6 — Concession path

```
SUBSTANCE                       material released "as-is" with
                                documented deviation; concession
                                addendum to CDOC (per D7);
                                max-quantity + max-period boundary
                                per concession; per-shipment
                                concession label (Pharma / MD)
EVIDENCE                        concession_addendum (EC-10) +
                                multi-sig + concession-flag in
                                lot genealogy (per D11)
ANTI-PATTERN                    repeated concessions on same
                                defect mode → systemic CAPA per
                                H8 §8; concession should be the
                                exception, not the policy
COUPLINGS                        per pack: concession may require
                                customer notification; per
                                regulated tenant: regulator
                                notification per H1 §3 in some
                                jurisdictions
```

### Step 7 — Disposition action (physical)

```
SUBSTANCE                       Production / Logistics executes:
                                  scrap → physical destruction +
                                    record-of-destruction
                                    (regulated: chain-of-custody;
                                    DSCSA / FMD / ITAR specific
                                    destruction process)
                                  rework → MWO if equipment;
                                    operation routing if material;
                                    re-inspection cycle
                                  RTV → ship back; SCAR opened;
                                    credit memo cycle
                                  concession-release →
                                    "available" with concession
                                    flag
EVIDENCE                        action_record (EC-4); per pack:
                                destruction certificate (EC-22)
EDGE CASES                       partial scrap (some salvage);
                                rework discovers more issues;
                                RTV refused by supplier;
                                concession quantity exceeded
                                (re-MRB required)
```

### Step 8 — Closure + downstream

```
SUBSTANCE                       inspection record terminal state;
                                NC (if opened) flows to D6 cycle;
                                SCAR (if supplier) flows to D6;
                                lot status finalized
EVIDENCE                        closure_record + cross-references
EDGE CASES                       NC closure waits on CAPA
                                effectiveness (per H8 §6);
                                customer notification window
                                (per H1 §3)
```

---

## 5. Branches

```
ACCEPT (clean)                   §4 Step 3
ACCEPT (concession)              Step 6 (regulated additional
                                signoff + customer awareness)
REJECT (scrap)                   Step 7 destruction
REJECT (RTV)                     Step 7 return + SCAR
REWORK (in-house)                Step 7 routing modification
REWORK (supplier)                ship-back + SCAR with rework
                                clause
DISPOSITION-PARTIAL              some lot accepted, rest rejected
                                (split-decision; rare)
ESCALATE                         pack-specific MRB → senior
                                MRB / FDA / EMA pre-clearance
                                / customer board
QUARANTINE-EXTENDED               investigation continues; lot
                                cannot release; H8 if pattern
RECALL CONSIDERATION              when shipped lots affected
                                (cascade D12)
```

---

## 6. Cross-domain footprint

```
QUALITY (C7)                    primary
INVENTORY (C5)                    lot status / movement
SHOPFLOOR (C6)                    rework execution
PROCUREMENT (C4)                  SCAR
ENGINEERING (C2)                  impact assessment
TRACEABILITY (C8)                 genealogy update + flag
MAINTENANCE (C9)                   rework equipment if applic
WORKFORCE (C10)                    qualified inspector / MRB
                                  members
COMPLIANCE (C7 sub)                 regulated decision authority
ANALYTICS / AI (C13)                 AI-13 RCA assist (advisory);
                                  AI-09 anomaly detection
                                  (advisory)
INTEGRATION (C12)                   customer notification (where
                                  applicable)
```

---

## 7. Pack overlays

```
PHARMA (J1)                      SM-DEV deviation lifecycle;
                                 OOS investigation per FDA OOS
                                 guidance; QP-equivalent signoff;
                                 batch-impact assessment cascade
                                 to D10
AUTO (J2)                        per-CSR rework rules;
                                 8D problem-solving; PFMEA
                                 update on systemic issue
AERO (J3)                        AS9100D nonconforming product
                                 §8.7; counterfeit confirmed
                                 quarantine extends; ITAR-
                                 controlled disposal
MD (J4)                          ISO 13485 §8.3; risk file update;
                                 vigilance reportability
                                 assessment
FOOD (J5)                        Process Authority approval for
                                 LACF / acidified rework;
                                 allergen verification post-
                                 cleanup; FSMA recall
                                 consideration
```

---

## 8. KPIs

```
- Disposition cycle time (inspection → action complete)
- MRB invocation rate
- MRB cycle time
- Concession rate (target downward; pattern detection)
- Concession-release-then-recall events (target zero)
- Scrap rate per item / per supplier
- Rework cycle time + cost
- RTV cycle time
- SCAR opened per supplier per period
- AI advisory acceptance rate (for AI-13 / AI-09 in this flow)
- Borderline-classification rate (could indicate process drift)
- AQL breach rate
- Cross-tenant disposition pattern (vendor-side learning)
```

---

## 9. Failure modes + recovery

```
FM1   Borderline disposition repeatedly without MRB
      Recovery: H3 audit catches pattern; H8 systemic CAPA
              on classification discipline

FM2   Concession overused
      Recovery: per H8 §8 systemic; pattern detection in
              dashboard; Compliance Lead intervention

FM3   AI advisory closes a regulated disposition (BD-2 attempt)
      Recovery: per L1 §4 triple defense; SEV-1; H8 systemic

FM4   MRB unable to reach quorum
      Recovery: per H7 escalation path; senior leadership
              decision; H8 systemic on quorum availability

FM5   Disposition action fails (e.g., destruction not verified)
      Recovery: chain-of-custody investigation; H8 systemic;
              data integrity SEV per finding

FM6   SCAR forgotten on supplier-fault
      Recovery: H6 surfaces; H8 CAPA on SCAR discipline

FM7   Concession addendum not added to CDOC
      Recovery: per D7 effectivity check; H8 CAPA

FM8   Released-then-recall lot
      Recovery: per D12; lot-trace forward; customer
              notification per DPA + per H1 §3; H8 systemic
              on disposition discipline

FM9   Counterfeit confirmed in already-released lot (Aero)
      Recovery: per J3 §10; SEV-1; trace forward; GIDEP

FM10  Customer concession-acceptance withdrawn after action
      Recovery: per CSR; renegotiate or re-disposition;
              H8 systemic if pattern
```

---

## 10. Roles and authority (RACI)

```
ACTION                  QC  QM  ENG  PROC  PROD  LOG  COMP  CUST  QP/PRRC
Classify                R   A   -    -     -     -    -     -     -
Standard accept         R   A   -    -     -     C    -     -     -
Standard fail           R   A   C    R(SCAR) C   -    C     -     -
MRB                     R   A   A    A(SCAR) A   -    A    A(if
                                                          cust-spec)
                                                          (BD-2)  C
Concession (BD-2 reg)   C   A   C    -     -     -    A    A    A(reg)
Disposition action      -   A   -    -     R     R    -     -     -
SCAR open                R   A   -    A     -     -    -     -     -
NC open                  R   A   C    C     -     -    -     -     -
Recall consideration    R   A   C    -     -     -    A     R     A
                                                          (per
                                                          D12)
```

---

## 11. Cross-references

- D4 (Receive to Inspect) — IQC source
- D3 (Plan to Produce) — IPQC + FQC source
- D6 (NC to CAPA) — NC + SCAR cycle
- D7 (Document to Release) — concession addendum to CDOC
- D11 (Release to Trace) — genealogy + concession flag
- D12 (Complaint to Recall) — recall consideration
- C7 (Quality) — primary domain
- E3 + E5 + E7 — APIs (workflow + workspace + e-sig)
- F4 + F5 + F6 — UI (workspace + record + action console)
- H1 §3 — regulator notification windows
- H4 — disposition_record (EC-13)
- H8 — CAPA cascade
- H9 — risk file impact
- L1 — BD-2 (regulated disposition)
- L2 — AI-09 anomaly + AI-13 RCA (advisory)
- M3 — root catalog (Disposition, NC)
- M4 — SM-5

---

## 12. Decision phrase

```
D5_INSPECT_TO_DISPOSITION_BASELINE_LOCKED
NEXT: D6_NC_TO_CAPA.md
```

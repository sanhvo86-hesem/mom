# D11 — Release to Trace

```
workflow_id:    D11
workflow_name:  Release to Trace
owner_role:     Quality Lead with Logistics Lead
participants:   Commercial, Compliance, Vertical Pack Lead, Customer
                Service, Customs / Trade
state_machines: SM-1 Order (shipment leg); SM-2 Material; cascade
                from SM-10 Batch Release for regulated; SM-DSCSA
                (Pharma) + SM-UDI (MD)
```

D11 takes a released finished-goods lot to the customer while
preserving the genealogy chain that supports recall (D12), audit
(D13), and regulator vigilance (per H1 §3). Lot genealogy + serial
exchange (DSCSA + UDI + EU FMD + FSMA §204) is the foundation that
permits a 4-hour recall trace.

---

## 1. Purpose and boundary

```
IN SCOPE                              OUT OF SCOPE / HANDED OFF
Allocation of released lot to SO       batch / lot release decision (D10)
Pick + pack                             customer onboarding (per K5)
Mandatory document assembly             customer-side regulator (per
Carrier dispatch + tracking              their tenant)
Delivery confirmation
Lot genealogy chain commit
Serialized exchange (DSCSA / UDI /
 FMD / §204 KDE/CTE)
Customs documentation
Customer-side delivery acceptance
 acknowledgment
Per-shipment audit-pack snapshot
 retained
```

---

## 2. Trigger

```
Released lot allocated to a specific SO (per D1)
Customer-driven scheduling (per CSR + DPA)
Recall replacement lot (per D12 cascade)
Validation supply lot (per H2)
Sample / NPI shipment
Stability sample to lab (Pharma per ICH Q1A)
Service part to field (Aero Part 145)
RMA replacement (post-customer-return resolution)
DSCSA-required exchange triggered at sale (Pharma)
EU FMD pack-level decommissioning at dispense
FSMA §204 KDE/CTE event captured at ship (Food high-risk)
UDI submission triggered at first market placement (MD)
```

---

## 3. Step substance

### Step 1 — Allocation confirmation

```
SUBSTANCE                       lot allocated to SO; allocation
                                strategy per pack:
                                  Pharma: FEFO (first-expiry
                                  first-out) + customer-specific
                                  shelf-life requirements
                                  Food: FEFO + allergen segregation
                                  Auto: per-program allocation
                                  Aero: per-customer service-life
                                  remaining check
                                  MD: UDI-pack-level + per-customer
                                  reservation
                                allocation may be partial (multi-
                                lot fulfillment)
EVIDENCE                        allocation_record (EC-4)
DECISION POINTS                 P1.1 lot reservation vs hard
                                allocation
                                P1.2 customer concession on
                                shelf-life (regulated tenant)
                                P1.3 split-shipment if multi-lot
EDGE CASES                       lot recalled mid-allocation
                                (cancel + re-allocate);
                                customer schedule pulled-in
                                (expedite or alternate);
                                cold-chain lot needs immediate
                                ship to maintain integrity
```

### Step 2 — Pick + pack

```
SUBSTANCE                       Warehouse picks per allocation;
                                per regulated lot: 100% lot
                                capture; serialized: per-unit
                                serial scan against shipment
                                manifest; UDI for MD; DSCSA SGTIN
                                for Pharma; FSMA §204 KDE for
                                Food; ITAR-controlled segregation
                                (Aero); allergen segregation
                                (Food); cold-chain conditioning
                                (Pharma + Food)
EVIDENCE                        pick_record (EC-4); per-unit
                                serial (EC-22); pack_record
                                (EC-22); cold-chain conditioning
                                evidence (EC-3)
DECISION POINTS                 P2.1 short-pick handling
                                P2.2 ad-hoc replacement from
                                alt lot
                                P2.3 packaging method per
                                regulator (sterile barrier per
                                ISO 11607)
                                P2.4 quantity verification (hand
                                count vs scale-weight vs
                                automated scan)
EDGE CASES                       packaging integrity failure
                                pre-ship; serial unscannable
                                (manual entry + audit);
                                allergen cross-contact
                                discovered post-pack;
                                ITAR mismatch detected at pack
```

### Step 3 — Mandatory documents

```
PER SHIPMENT (per customer + per pack)
  CoA (Certificate of Analysis)            Pharma + Food + per CSR
  CoC (Certificate of Conformance)          Auto + Aero + general
  AS9102 FAI (Aero first-article)            Aero per revision
  DSCSA TI / TH / TS (Pharma US)             per partner step
  UDI labels (MD)                              per device
  EU FMD safety features (Pharma EU)          per pack
  EUDAMED / GUDID submission record            per market placement
  Customer label (per CSR)                      per customer
  Customs / commercial invoice                  international
  ITAR / EAR export-control attest               Aero
  Hazardous-goods declaration                   per UN/IMDG/ADR
  FSMA §204 KDE/CTE                              Food high-risk
  Cold-chain conditioning evidence               Pharma / Food
EVIDENCE                                         document_assembly
                                                (EC-22); per
                                                signature (EC-2);
                                                per-pack regulator
                                                event (EC-21
                                                reportable_event)
DECISION POINTS                                  P3.1 customer-
                                                specific extra
                                                P3.2 emergency-
                                                ship overrides
                                                (anti-pattern)
                                                P3.3 multi-language
                                                label
EDGE CASES                                        regulator template
                                                changed mid-cycle
                                                (per H7 + H1 §6);
                                                CSR conflict with
                                                regulator (stricter
                                                wins);
                                                missing customer
                                                receiver contact
                                                for ITAR
```

### Step 4 — Carrier pickup

```
SUBSTANCE                       Carrier confirmed; pickup; ASN
                                (856) sent to customer; for
                                cold-chain: thermal-conditioning
                                handoff with sensor logger;
                                carrier qualification per pack
                                (Pharma cold-chain qualified;
                                Aero ITAR-cleared; Food sanitary
                                transport per FSMA Part 1.900)
EVIDENCE                        pickup_record (EC-4); ASN_event
                                (EC-22)
EDGE CASES                       carrier no-show; carrier sub-
                                outsource (security / DPA);
                                ASN format mismatch (per partner)
```

### Step 5 — In-transit tracking

```
SUBSTANCE                       carrier API integration;
                                visibility per delivery ETA;
                                deviation alerts (route / time /
                                temperature for cold-chain);
                                customer portal status
EVIDENCE                        transit_event (EC-22); telemetry
                                from sensor logger (EC-3)
DECISION POINTS                 P5.1 deviation response (notify
                                / accept / reject)
                                P5.2 customer-impact assessment
                                P5.3 cold-chain breach handling
EDGE CASES                       carrier loss / damage; cold-
                                chain alarm; security incident
                                (ITAR); customs hold; cross-
                                border re-routing
```

### Step 6 — Delivery confirmation

```
SUBSTANCE                       proof-of-delivery; customer EDI
                                856 ack (Auto + general B2B);
                                customer portal confirmation;
                                cold-chain integrity check at
                                receipt (Pharma / Food);
                                damage observation; signed receipt;
                                temperature sensor log retrieved
EVIDENCE                        delivery_record (EC-22 + EC-2
                                customer sig); cold-chain log
                                (EC-3)
EDGE CASES                       partial delivery (some units
                                damaged / missing); receipt-side
                                refusal; signature missing;
                                wrong-customer delivery (rare)
```

### Step 7 — Genealogy update (canonical step)

```
SUBSTANCE                       OTG genealogy edge committed:
                                  source-lot → picked-units →
                                  shipment → carrier → customer →
                                  customer-site;
                                edges per pack:
                                  Pharma: + DSCSA TI/TH/TS chain
                                  MD: + UDI device-id + production-id
                                  Aero: + S/N + Service-Life-Limited
                                  data
                                  Food: + FSMA §204 KDE/CTE
                                  Auto: + per-VIN traceability
                                  (where Tier-1 supplier)
                                edge is permanent (per H5 perpetual
                                regulated retention); cannot be
                                deleted (only added compensating
                                event)
EVIDENCE                        genealogy_edge (EC-4 + per pack
                                evidence)
EDGE CASES                       upstream lot info incomplete
                                (cannot finalize edge → block
                                shipment for regulated);
                                cross-tenant supply-chain (HESEM
                                shipping to non-HESEM downstream;
                                edge to "external" tenant
                                placeholder)
```

### Step 8 — Serialized exchange

```
PHARMA DSCSA                    TI (Transaction Information),
                                TH (Transaction History),
                                TS (Transaction Statement)
                                exchanged with trading partners
                                via VRS / EPCIS / direct partner
                                connection;
                                3-business-day suspect-product
                                response window (per H1 §3);
                                per-tenant DSCSA Trading Partner
                                onboarding (per C12)
PHARMA EU FMD                    pack-level decommissioning at
                                dispense via EMVS (European
                                Medicines Verification System);
                                country-specific NMVS;
                                per-tenant FMD onboarding
MD UDI                            UDI placed at first market
                                placement; submission to GUDID
                                (US FDA) and EUDAMED (EU);
                                per-pack UDI exchange at delivery
                                where required
FOOD FSMA §204                   KDE captured per CTE
                                (Critical Tracking Event):
                                harvest, cool, pack, ship, receive,
                                transform; retained 2 years per
                                participant; readable upon
                                regulator request within 24 h
AERO SERIALIZED                  S/N tracking for service-life-
                                limited parts; per AS9120B
                                distributor; per ITAR controlled
                                items
AUTO PER-VIN                      where Tier-1 supplier; per
                                program traceability requirements
EVIDENCE                          exchange_event (EC-22 + per
                                regulator submission record);
                                EC-21 reportable_event (suspect /
                                vigilance)
DECISION POINTS                   P8.1 partner-readiness vs deferred
                                exchange
                                P8.2 fallback (EPCIS direct vs
                                VRS) per partner
                                P8.3 manual entry (rare; per
                                emergency)
EDGE CASES                         partner system outage (retry
                                per H1 §3 windows);
                                serialized-mismatch (per audit);
                                cross-border exchange format
                                difference;
                                tenant just-onboarded vs partner
                                connection live
```

### Step 9 — Customer-side handling integration

```
SUBSTANCE                       customer may consume / further-
                                ship / use directly; HESEM
                                tracks status only to limit of
                                contractual visibility;
                                if customer is HESEM tenant:
                                end-to-end multi-tenant
                                visibility (with both tenants'
                                consent per DPA);
                                if customer reports issue: D12
                                complaint cycle entry
EVIDENCE                        customer_handling_event (EC-22)
                                where visible
EDGE CASES                       customer further-ships globally
                                (genealogy chain may extend
                                across multiple HESEM customers
                                or external partners);
                                gray-market detection (per
                                tenant agreement)
```

---

## 4. Branches

```
STANDARD CUSTOMER SHIPMENT       §3 default
DROP-SHIP                         direct supplier → end customer
INTERNAL TRANSFER                  inter-company / inter-facility
SAMPLE / NPI SHIPMENT              segregated lot
RECALL REPLACEMENT (D12)            urgent; per D12 cascade
RMA REPLACEMENT                     post-customer-return
SERVICE PART (AERO PART 145)        per service event; S/N-tracked
INVESTIGATIONAL DRUG (PHARMA IMP)   per Annex 13
CONSIGNMENT SHIPMENT                ownership stays with HESEM
CLINICAL TRIAL SHIPMENT (MD)         per ISO 14155
EMERGENCY-USE SHIPMENT               per regulator EUA / per pack
COLD-CHAIN URGENT (Pharma sterile)   expedited
ITAR-CONTROLLED SHIPMENT             per J3 export-control
PCCP-DRIVEN SHIPMENT (MD AI)         per envelope
DSCSA-COMPLIANT (Pharma)             TI/TH/TS exchange
EU FMD-COMPLIANT (Pharma)             pack-level
FSMA §204 (Food high-risk)            KDE/CTE
CUSTOMER-DRIVEN BACK-ORDER            per customer schedule
HUMANITARIAN / DONATION                  per regulator EUA / waiver
DESTRUCTION SHIPMENT                       per chain-of-custody
```

---

## 5. Cross-domain footprint

```
COMMERCIAL (C1)                  shipment manifest + customer
LOGISTICS                         carrier + tracking
INVENTORY (C5)                    pick + pack
QUALITY (C7)                      regulated documents
TRACEABILITY (C8)                 genealogy edge
INTEGRATION (C12)                 EDI + DSCSA + UDI + FSMA §204
                                + EU FMD + customs
COMMERCIAL (C1)                    SO close-out
ANALYTICS / AI (C13)                shipment KPI
CORE (C14)                          tenant + audit
COMPLIANCE                            regulator submission
```

---

## 6. Pack overlays

```
PHARMA (J1)                      DSCSA TI/TH/TS at every step;
                                 EU FMD at dispense; cold-chain
                                 evidence; CoA; APR contribution;
                                 lot-level + unit-level transition
                                 per regulation phase
AUTO (J2)                        per-OEM EDI 856 ASN; per-CSR
                                 documents; CoC; PPAP attestation
                                 per part; per-VIN traceability
                                 (where applic)
AERO (J3)                        AS9100D §8.5.4 product preservation;
                                 AS9120B distributor traceability;
                                 AS9102 FAI for first-article
                                 revision; service-life-limited
                                 part S/N; counterfeit avoidance
                                 attestation; ITAR / EAR export
                                 documentation; FAA Form 8130-3
                                 RTS where applicable
MD (J4)                          UDI per device; GUDID + EUDAMED
                                 submission; sterile barrier
                                 integrity (ISO 11607); customer
                                 vigilance reporting setup;
                                 PCCP-driven shipment metadata
                                 (where AI/ML)
FOOD (J5)                        FSMA §204 KDE/CTE per high-risk
                                 food; sanitary transport (Part
                                 1.900); allergen statement;
                                 country-of-origin labeling;
                                 cold-chain documentation
```

---

## 7. KPIs

```
- On-time delivery rate
- Right-first-time delivery (no damage / no doc-issue)
- Cold-chain breach rate (target near zero)
- DSCSA exchange compliance (Pharma)
- DSCSA suspect-product window adherence
- EU FMD verification rate (Pharma EU)
- UDI submission completeness (MD)
- FSMA §204 KDE/CTE completeness (Food high-risk)
- Per-VIN traceability completeness (Auto Tier-1)
- Mock-recall trace time (per D12 §11)
- Carrier scorecard
- Customer satisfaction post-delivery
- Audit-pack-export delivery SLA (per H3 §4)
- Genealogy edge gap rate (target zero for regulated)
```

---

## 8. Failure modes + recovery

```
FM1   Wrong lot picked
      Recovery: inventory reversal; correct lot picked;
              per H8 if pattern (UI / process gap)

FM2   Damage in transit
      Recovery: claim against carrier; replacement lot;
              customer notification; H8 if pattern with
              carrier

FM3   Customer rejects on receipt
      Recovery: D12 entry; per RMA; possibly recall scope
              widens

FM4   Customs hold
      Recovery: documentation review; per customs-broker;
              extended delivery; tenant communication

FM5   DSCSA exchange failure
      Recovery: retry per FDA waiver protocol; documented
              exception; per H1 §3 if 3-business-day window
              missed

FM6   EU FMD verification fail at dispense
      Recovery: per partner protocol; suspect-product
              window per H1 §3; H8 systemic

FM7   UDI submission late (MD first market placement)
      Recovery: submission retry; per H1 §3 windows;
              market hold; H8

FM8   FSMA §204 KDE incomplete
      Recovery: lot held until complete; H8 systemic

FM9   Cold-chain breach (Pharma / Food)
      Recovery: integrity assessment; possibly total reject;
              customer notification; H8; insurance

FM10  ITAR person-of-record mismatch at receiver (Aero)
      Recovery: shipment held / returned; per J3 §10 FM3;
              SEV-1 export-control breach

FM11  Genealogy edge gap (regulated)
      Recovery: shipment block until upstream complete;
              H8 systemic on capture discipline

FM12  Counterfeit-suspect-trace at customer (Aero)
      Recovery: per J3 §10 FM7; trace forward + back;
              GIDEP submit
```

---

## 9. Roles and authority (RACI)

```
ACTION              LOG  WH  CARR  CSM  QA  COMP  PACK  CUST  REG
Allocate            A    -   -     R    C   -     -     I     -
Pick + pack          C    A   -     -    C   -     -     -     -
Mandatory docs       -    -   -     C    R   A     A     -     -
Carrier pickup       A    -   R     -    -   -     -     -     -
Tracking             A    -   R     R    -   -     -     R     -
Delivery confirm     A    -   R     R    -   -     -     A     -
Genealogy commit     -    -   -     -    R   A     A     -     -
DSCSA / FMD / UDI     -    -   -     -    R   A     A     -     R
   exchange
Recall trigger        -    -   -     R    R   A     A     R     R
   (cascade D12)
```

---

## 10. Cross-references

- D1 (Order to Cash) — parent
- D10 (Batch to Release) — release prerequisite (regulated)
- D12 (Complaint to Recall) — recall cascade
- D13 (Audit to Remediate) — audit pack contribution
- C1 (Commercial) — order linkage
- C5 (Inventory) — pick / pack
- C8 (Traceability) — primary domain
- C12 (Integration) — EDI / DSCSA / UDI / FSMA / FMD / customs
- E3 + E4 + E5 + E15 — APIs
- F4 + F5 — UI surfaces
- H1 §3 — regulator notification (DSCSA / FMD / UDI / FSMA / cold)
- H4 — shipment + genealogy + reportable event evidence
- H5 — perpetual retention regulated
- H8 — CAPA path
- L1 — BD-8 (recall) cascade
- M3 — root catalog
- M4 — SM-1 + SM-DSCSA + SM-UDI

---

## 11. Decision phrase

```
D11_RELEASE_TO_TRACE_BASELINE_LOCKED
NEXT: D12_COMPLAINT_TO_RECALL.md
```

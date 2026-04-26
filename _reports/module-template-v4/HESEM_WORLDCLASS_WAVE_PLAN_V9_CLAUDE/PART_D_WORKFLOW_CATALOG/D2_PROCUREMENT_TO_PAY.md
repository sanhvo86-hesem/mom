# D2 — Procurement to Pay

```
workflow_id:    D2
workflow_name:  Procurement to Pay
owner_role:     Procurement Lead
participants:   Planning, Logistics, Quality, Finance, Engineering
                (spec), Compliance (regulated material)
state_machines: SM-2 Procurement Lifecycle (primary);
                SM-4 Inspection Receipt; SM-5 Disposition;
                SM-6 NC/CAPA (when SCAR); SM-7 Doc effectivity
```

D2 acquires goods and services from suppliers and pays per agreed
terms. It is the supply-side mirror of D1 (Order to Cash). For
regulated tenants, D2 is also the chain that proves "we know who we
bought what from, when, against what spec, who inspected, and how
we disposed of variance."

---

## 1. Purpose and boundary

```
IN SCOPE                         OUT OF SCOPE / HANDED OFF
Purchase requisition              Vendor master onboarding (per C4)
Supplier qualification (per C4)   Long-term sourcing strategy
PO issuance                        Spend analytics (per C13)
Goods + services receipt
Incoming inspection (D4 / D5)
Disposition (D5)
Invoice match
Payment posting + GL handoff
Supplier scorecard update
SCAR (when needed; per H8)
```

The boundary closes when the PO line is fully received, fully
inspected, fully invoiced, fully paid, and any SCAR is closed.

---

## 2. Trigger catalog

```
TRIGGER                                      ROUTE
MRP-driven requisition                        per D3 + C3
Manual non-recurring requisition               per Procurement
Min-max replenishment                          inventory C5
Forecast-driven advance buy                    per C1 + C3
Project / capex requisition                    per program
Engineering sample / dev material              per C2 (NPI)
Recall replacement (urgent)                    per D12
Validation supply (qualification lots)         per H2 + D14
Sub-processor / DPA-listed onboarding          per H7 Class A
                                              + I8 + L2 §8
Service procurement (calibration, sterile-     per pack overlay
 ization, NADCAP-process service)
Tooling acquisition                             per Engineering
Spare-part replenishment                        per Maintenance D9
Pharma excipient / API recurrent purchase        per J1 + ICH Q7
Auto direct-material per program                per J2 APQP
Aero NADCAP-cert process service                per J3
Med Device single-use device material            per J4 Annex 11607
Food ingredient + packaging                       per J5 + FSVP
Customer-specified material                       per CSR (per H1 §7)
Critical-path material (express)                 per priority + cost
                                                approval
```

---

## 3. Actors and authority

```
PLANNER / MRP                  generates requisition
PROCUREMENT BUYER               creates and issues PO
SUPPLIER (external)              acknowledges, ships, invoices
RECEIVING OPERATOR               records receipt at dock
QA INSPECTOR                      executes IQC per plan
QA MANAGER                         dispositions reject / concession
SUPPLIER QUALITY ENG               drives SCAR
ACCOUNTS PAYABLE / FINANCE         matches + pays
COMPLIANCE LEAD                     for sub-processor / regulated
                                  qualification (BD-7)
TENANT ADMIN                        config thresholds
QP / PRRC (per pack)                where regulated material on
                                  release path
```

---

## 4. State machine SM-2 (canonical transitions)

```
STATES                          EVENTS / GUARDS                 EVIDENCE
draft (requisition)             approve_req (per req-policy)     EC-4
                                cancel_req                        EC-5
issued (PO)                     send_to_supplier                  EC-4 + EC-2
                                amend (within window)             EC-4 + EC-2
acknowledged                     ack_received (855 or manual)      EC-4
in_transit                       ship_notified (856 ASN)            EC-4
received                         receive_at_dock (qty + condition  EC-4 + EC-3
                                 captured)                          (telemetry)
inspecting                       sample_per_plan                    EC-4 + EC-18
                                 (cascades to SM-4)                  (inspection)
inspection_decided                disposition (per SM-5)              EC-4 + EC-13
accepted                          release_to_inventory                EC-4
                                  (cascade to SM-INVENTORY)
rejected                          quarantine + SCAR_open             EC-13 + EC-14
                                                                     (cascade SM-6)
returned                          ship_back (RTV)                     EC-4
concession                        release_with_concession              EC-4 + EC-2
                                  (signed)
invoice_received                  3-way match                         EC-4 + EC-22
matched                           approve_payment                      EC-2 (sig)
paid                              post_to_GL                            EC-4
closed                            (terminal when all line + invoice)   -

HARD COUPLINGS
  SM-2 ↔ SM-4 (inspection)
  SM-2 ↔ SM-5 (disposition)
  SM-2 ↔ SM-6 (SCAR)
  SM-7 → SM-2 (effective spec required to inspect)
  SM-2 → C5 inventory state machines
  SM-2 → C11 finance posting

SOFT COUPLINGS
  SM-2 → C4 supplier scorecard (per receipt outcome)
  SM-2 → SM-9 maintenance (when receipt is calibration item)
```

---

## 5. Step-by-step substance

### Step 1 — Requisition

```
INPUT                          item, qty, need-by-date, ship-to,
                              cost center, project (where applic),
                              spec revision required
SUBSTANCE                      requisition normalized; demand validated
                              vs MRP / forecast; bundling considered
EVIDENCE                       requisition_record (EC-4); request
                              transaction
DECISION POINTS                 P1.1 sole-source vs competitive-bid
                              P1.2 in-stock alternative
                              P1.3 substitute material
                              P1.4 priority + lead-time tradeoff
EDGE CASES                      negative inventory imbalance;
                              urgent recall replacement;
                              project budget exceeded (governance);
                              capex vs opex (tax + accounting)
```

### Step 2 — Supplier selection + qualification

```
INPUT                          item + spec + qty + need-by;
                              tenant supplier master + scorecard
SUBSTANCE                      qualified supplier(s) chosen per
                              policy (price + lead-time + score +
                              risk + per-item preferred-supplier);
                              for regulated material: per supplier
                              qualification status (per C4 + H8)
                              + counterfeit-avoidance program
                              (per J3 AS5553/6174)
EVIDENCE                       selection_record (EC-4); references
                              supplier_qualification (EC-22 +
                              audit_record)
DECISION POINTS                P2.1 fall-back supplier
                              P2.2 split-buy (multiple suppliers)
                              P2.3 customer-mandated supplier
                              (per CSR)
                              P2.4 BD-7 supplier-qualify decision
                              if first-time onboarding
                              (human-only; AI advisory only)
EDGE CASES                      sole-source with no alternative;
                              counterfeit risk material;
                              ITAR/EAR controlled (per J3 §5);
                              region-pinned supply (per data res);
                              sub-processor / DPA-listed (per L2
                              §8 + per I8)
```

### Step 3 — PO issuance

```
INPUT                          requisition + supplier choice +
                              spec revision (effective per SM-7) +
                              terms (price, payment, lead-time,
                              CSR overlay)
SUBSTANCE                      PO authoritative root created;
                              header + lines + terms; legal
                              terms attached; per-OEM CSR (Auto)
                              applied; ITAR/EAR clause (Aero)
                              applied; sustainability terms
                              where applicable
TRANSMISSION                    EDI 850 (Auto + most B2B);
                              supplier portal upload; email PDF;
                              cXML; electronic signature
                              (per E7) where regulated; rare
                              fax fallback
EVIDENCE                       PO_record (EC-4); transmission
                              event (EC-22); supplier ack
                              event (EC-22)
DECISION POINTS                P3.1 amendment within window
                              (terms, qty, date, line);
                              P3.2 cancellation (with possible
                              fee); P3.3 split shipment terms
EDGE CASES                      supplier ack delayed beyond SLA;
                              supplier rejects PO (counter-offer);
                              partial acceptance (some lines);
                              electronic format incompatibility
                              with supplier (fall-back paper);
                              CSR-required acknowledgment fields
                              missing
```

### Step 4 — In-transit + ASN

```
INPUT                          supplier ship event
SUBSTANCE                      ASN (856) ingested; logistics
                              tracking; ETA; carrier ref
EVIDENCE                       in_transit_event (EC-22 +
                              telemetry per logistics)
COUPLINGS                       link to inventory expected-receipt
                              (per C5)
EDGE CASES                      shipment lost / damaged;
                              re-routing; partial ship vs split;
                              ASN missing / late
```

### Step 5 — Receipt at dock

```
INPUT                          physical goods + ASN + PO
SUBSTANCE                      receipt entered; quantity counted;
                              condition observed; lot / serial
                              captured; certificate of analysis /
                              certificate of compliance attached
                              if regulated; counterfeit screen
                              (Aero) at receipt; FSVP receiving
                              verification (Food); ITAR
                              accountability (Aero)
EVIDENCE                       receipt_record (EC-4); telemetry
                              (EC-3) for sensors; counterfeit
                              screen (EC-18 subtype Aero); FSVP
                              record (EC-18 subtype Food); per-pack
                              evidence as applicable
DECISION POINTS                P5.1 short / over / damaged
                              quantity disposition path
                              P5.2 emergency early receipt
                              (advance ship)
                              P5.3 bonded / customs transit
EDGE CASES                      mis-shipment (different item);
                              quantity variance > tolerance;
                              container damaged; cold-chain
                              break (food / pharma);
                              ITAR-controlled mishandling;
                              packaging damage flagged at unload
```

### Step 6 — Incoming inspection (cascades to SM-4)

```
INPUT                          receipt + inspection plan
                              (per spec revision per Item)
SUBSTANCE                      sampling per AQL (auto +
                              MIL-STD-1916) or per ICH Q7
                              (Pharma) or per ISO 13485 (MD);
                              specs verified per characteristic;
                              CofA / CoC reviewed; instruments
                              calibrated (per EC-12); inspector
                              qualified (per EC-11)
EVIDENCE                       inspection_record (EC-18);
                              sample telemetry (EC-3); inspector
                              signature (EC-2)
DECISION POINTS                P6.1 sampling expansion if
                              variability detected;
                              P6.2 destructive vs non-destructive
                              testing scope;
                              P6.3 third-party lab where required
EDGE CASES                      sample fails first time; need
                              second-sample plan; instrument
                              calibration just expired;
                              inspector qualification expired;
                              fraudulent CofA detected
                              (counterfeit risk)
```

### Step 7 — Disposition (cascades to SM-5)

```
DISPOSITIONS                   accept / reject / rework / RTV /
                              concession / scrap
ACCEPT                          lot released from quarantine;
                              available for production; supplier
                              scorecard maintained / improved
REJECT                          quarantine retained; SCAR opened
                              (per H8); ship-back per agreement
                              or scrap; cost recovered
REWORK                          per supplier agreement; in-house
                              or send-back; rework procedure
                              per SOP; re-inspection cycle
RTV                             return to vendor; logistics
                              tracked; credit memo to follow
CONCESSION                      release with documented
                              exception; signed by Quality Lead
                              + Compliance Lead (regulated:
                              additionally Domain Lead);
                              concession addendum to CDOC;
                              max-quantity + max-period per
                              concession; flagged in lot
                              genealogy (per D11)
SCRAP                           never returned, never released;
                              destruction per pack policy
                              (controlled drug per DSCSA;
                              ITAR-controlled per Aero policy);
                              evidence retained per H5
EVIDENCE                        disposition_record (EC-13);
                              SCAR (EC-14) when reject;
                              concession_addendum (EC-10)
                              when concession; signature
                              evidence (EC-2; banned by AI per
                              L1 §1 BD-2 if regulated tenant)
```

### Step 8 — Invoice receive + 3-way match

```
INPUT                          supplier invoice (EDI 810 / paper)
3-WAY MATCH                     PO ≈ Receipt ≈ Invoice
                              (within per-tenant tolerance)
TOLERANCE                       per-tenant + per-supplier;
                              typical 2-5% qty / amount tolerance;
                              0% on regulated material qty
EVIDENCE                       invoice_record (EC-4); match
                              outcome (EC-22)
DECISION POINTS                P8.1 variance investigation
                              (route to Buyer)
                              P8.2 partial match (one line OK
                              another not)
                              P8.3 emergency manual override
                              (logged + signed)
EDGE CASES                      invoice without PO (rare;
                              violations of policy); duplicate
                              invoice; foreign-currency variance
                              (FX); discounts / rebates
                              applicable; concession-priced
                              receipt; freight / tariff line
                              variance
```

### Step 9 — Payment + GL post

```
INPUT                          matched invoice + terms
SUBSTANCE                      payment scheduled per terms;
                              voucher posted; GL entry; bank
                              transaction; per-currency handling;
                              tax + withholding; vendor
                              compliance check (sanctions
                              screening; tax 1099 per US;
                              VAT per EU)
EVIDENCE                       payment_record (EC-4);
                              GL_posting (EC-4); per H1 §3
                              tax-related retention
DECISION POINTS                P9.1 early-pay discount take
                              P9.2 hold for dispute
                              P9.3 net vs gross handling
                              P9.4 vendor financing per
                              dynamic discounting
EDGE CASES                      sanctions hit (pause; legal);
                              escheatment for unclaimed funds;
                              currency conversion edge cases;
                              tax withholding errors
```

### Step 10 — Closure

```
WHEN                           all PO lines fully received +
                              fully invoiced + fully paid +
                              SCARs closed
SUBSTANCE                      PO close transaction; supplier
                              scorecard updated; KPI counts
                              updated; CDC outbound to
                              downstream domains
EVIDENCE                       PO_close (EC-4); scorecard_delta
                              (EC-22)
EDGE CASES                      partial closure (one line still
                              open); long-tail invoices arriving
                              years later; supplier dispute
                              reopen
```

---

## 6. Branches (workflow variants)

```
STANDARD PURCHASE              §5 default
RUSH BUY                       short lead-time path; expediting
                              charge; per CSR if customer-driven
SAMPLE BUY                     limited-qty; non-production;
                              tracked separately
TOOLING BUY                    per Engineering; capitalization
                              path
SERVICE PURCHASE               receipt = service-completion
                              evidence; no physical inspection
CONSIGNED INVENTORY            ownership remains with supplier;
                              consumption-based invoicing
DROP SHIP                      direct supplier → customer; HESEM
                              never receives physically
BLANKET ORDER                  long-term agreement; releases
                              against blanket
SCHEDULING AGREEMENT           periodic releases against
                              long-term agreement (Auto common)
JIT / KANBAN                    consumption-driven trigger
SUB-PROCESSOR PURCHASE         service procurement DPA-listed
                              (per L2 §8 + I8)
PILOT-MATERIAL BUY              R&D / NPI; segregated lot tracking
RECALL-REPLACEMENT BUY         expedited; tied to recall (D12)
VALIDATION-LOT BUY             per H2 (qualification supply)
NADCAP-CERT-PROCESS BUY        Aero special process service
DSCSA-COMPLIANT BUY             Pharma serialized + TI/TH/TS
EU-FMD-COMPLIANT BUY            Pharma EU
GIDEP-WATCH BUY                 Aero counterfeit watch
DPA-AMENDED BUY                 sub-processor; tenant notification
                              per DPA window
CSR-OVERLAID BUY                customer-specific requirement
                              per OEM (Auto)
ITAR-CONTROLLED BUY             Aero defense
SUSTAINABILITY-PREF BUY         per ESG policy (where applicable)
CIRCULAR-ECONOMY                returnable-packaging;
                              remanufactured-component
```

---

## 7. Cross-domain footprint

```
PROCUREMENT (C4)                primary owner
PLANNING (C3)                    requisition source
INVENTORY (C5)                    receipt → stock; lot capture
QUALITY (C7)                      IQC + disposition + SCAR
ENGINEERING (C2)                  spec source; ECO-driven re-spec
TRACEABILITY (C8)                 lot genealogy
MAINTENANCE (C9)                  calibration spare receipts
WORKFORCE (C10)                   inspector qualification
                                 (EC-11)
FINANCE (C11)                     invoice + payment + GL
INTEGRATION (C12)                  EDI / ASN / partner systems
ANALYTICS / AI (C13)              supplier scorecard; AI-17
                                 supplier insight; AI-18
                                 counterfeit indicator (Aero)
CORE PLATFORM (C14)                tenant + identity + audit
```

---

## 8. Pack overlays

```
PHARMA (J1)                    excipient + API supplier per
                              ICH Q7; CofA verification;
                              identity test on receipt;
                              GMP supplier qualification cycle;
                              DSCSA TI/TH/TS exchange;
                              EU FMD verification at dispense
AUTO (J2)                       per OEM CSR (Ford Q1 / GM BIQS /
                              etc.); PPAP submission required
                              from supplier; ISIR; APQP
                              alignment; CQI special process
                              cert verified from supplier;
                              IMDS material declaration
AERO (J3)                       AS5553 / AS6174 counterfeit
                              avoidance plan; GIDEP cross-check;
                              QPL/QML preference; NADCAP-cert
                              service supplier; ITAR/EAR
                              classification; AS9120B
                              traceability
MD (J4)                         ISO 10993 biocompatibility
                              evidence per material;
                              ISO 11607 packaging supplier;
                              SOUP / OTSS register feed
                              (IEC 62304); single-use device
                              packaging
FOOD (J5)                       FSVP supplier verification;
                              hazard analysis per supplier;
                              country of origin; allergen
                              control plan integration;
                              cold-chain + sanitary transport
                              (FSMA Part 1.900)
```

---

## 9. KPIs

```
- PO cycle time (req → close)
- Supplier on-time delivery
- Supplier quality PPM / DPMO
- IQC pass rate
- SCAR cycle time
- Invoice 3-way match rate
- DPO (days payable outstanding)
- Supplier diversity / sustainability
- Counterfeit incidents (Aero target zero)
- DSCSA suspect-handling SLA (Pharma)
- FSVP completion rate (Food)
- PPAP first-time approval (Auto)
- Per-supplier scorecard color
- Cost variance per item
- Spend under contract %
- Maverick spend %
```

---

## 10. Failure modes + recovery

```
FM1   Wrong item received
      Recovery: receipt rejected; SCAR; replacement; H8 systemic
              if pattern

FM2   IQC failure
      Recovery: SCAR; supplier corrective action;
              compensating sourcing; H8 + tenant notification
              for regulated material

FM3   Counterfeit confirmed (Aero)
      Recovery: per J3 §10 FM7; quarantine; trace forward/back;
              GIDEP submission; H1 §3; H8

FM4   FSVP supplier verification skipped (Food)
      Recovery: per J5 §10 FM4; receipt blocked

FM5   PPAP not on file (Auto)
      Recovery: receipt blocked from production use;
              PPAP cycle expedited

FM6   Invoice variance > tolerance
      Recovery: AP routes to Buyer; supplier engaged;
              variance approved with documentation or
              corrected

FM7   Supplier shipped expired material
      Recovery: reject; SCAR; supplier process audit (H3);
              H8 systemic for repeat

FM8   Cold-chain break (food / pharma)
      Recovery: integrity assessment; possible total reject;
              H8; insurance claim

FM9   Sub-processor security event during in-flight PO
      Recovery: per H1 §3 + I3; tenant communication;
              affected lots reassessed

FM10  ITAR-controlled material to ITAR-restricted personnel
      Recovery: per J3 §10 FM3; SEV-1; access revoke;
              regulator notification

FM11  Concession overused (pattern of low-quality acceptance)
      Recovery: H3 audit catches; H8 systemic;
              Compliance Lead intervention

FM12  Sanctions hit at payment
      Recovery: payment held; legal review; possible
              regulator notification; supplier off-board

FM13  Invoice fraud detection
      Recovery: per F-class incident (security); investigate;
              H8 CAPA on AP controls
```

---

## 11. Roles and authority (RACI)

```
ACTION                  PROC  PLAN  REC  QC  QM  FIN  ENG  COMP  SUP  TENANT
Requisition              R     A     -    -   -   C    C    -     -    -
Supplier select          A     -     -    -   C   -    C    A     -    -
Supplier qualify (BD-7) A     -     -    -   C   -    C    A(reg) -    -
PO issue                 A     -     -    -   -   -    C    C     -    -
Receipt                  C     -     A    -   -   -    -    -     -    -
IQC                      -     -     C    R   A   -    C    -     -    -
Disposition (BD-2 reg)   -     -     -    R   A   -    -    A     -    -
SCAR                     A     -     -    R   A   -    -    -     R    -
Invoice match            -     -     -    -   -   A    -    -     -    -
Payment                  -     -     -    -   -   A    -    -     -    -
Concession (regulated)   C     -     -    -   A   -    C    A     -    -
Sub-processor onboard    R     -     -    -   -   C    C    A     -    -
                                                                       (BD-31)
```

---

## 12. Cross-references

- C3 (Planning) — requisition source
- C4 (Procurement) — supplier domain
- C5 (Inventory) — stock / lot
- C7 (Quality) — IQC + SCAR
- C11 (Finance) — payment + GL
- D3 (Plan to Produce) — MRP origin
- D5 (Inspect to Disposition) — IQC integration
- D6 (NC to CAPA) — SCAR integration
- E0 + E15 — EDI integration
- H1 §3 — regulator notification windows (counterfeit; DSCSA)
- H4 — receipt + inspection + payment evidence classes
- H8 — SCAR as CAPA
- J1..J5 — pack overlays per §8
- L1 — banned decisions BD-2 + BD-7 (regulated)
- L2 §8 — sub-processor onboarding
- M3 — root catalog (PO, PREC, Supplier, etc.)
- M4 — SM-2 Procurement Lifecycle

---

## 13. Decision phrase

```
D2_PROCUREMENT_TO_PAY_BASELINE_LOCKED
NEXT: D3_PLAN_TO_PRODUCE.md
```

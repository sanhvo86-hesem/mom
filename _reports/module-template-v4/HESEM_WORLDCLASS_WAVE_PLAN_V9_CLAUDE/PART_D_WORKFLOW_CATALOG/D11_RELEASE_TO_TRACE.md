# D11 — Release to Trace

```
workflow_id:    D11
workflow_name:  Release to Trace
owner_role:     Quality Lead with Logistics Lead
participants:   Commercial Lead, Compliance Lead
```

---

## 1. Purpose

Release to Trace is the workflow that takes a released finished-goods
lot or batch through customer delivery while maintaining the genealogy
chain that supports recall and traceability obligations.

---

## 2. Trigger

A lot transitions to "released-for-shipment" (D6 BREL release for
regulated; D5 Inspect to Disposition for non-regulated).

---

## 3. Actors

```
Logistics Coordinator     Plans the shipment
Warehouse Operator        Picks and packs
Carrier                    Transports
Customer (external)        Receives goods
Quality Lead              Owns traceability discipline
Regulatory Affairs        Handles serialized exchange (DSCSA, UDI)
```

---

## 4. Steps

### Step 1 — Allocation Confirmation

Released lot is allocated to specific Sales Order (D1). Allocation
recorded in inventory.

### Step 2 — Pick and Pack

Warehouse picks specific units from the released lot. Genealogy edge
recorded: Lot → Picked-Units → Shipment.

For serialized products (DSCSA pharma; UDI med device): each unit's
serial number recorded against the shipment.

### Step 3 — Mandatory Documents

Shipment-specific documents prepared per customer requirements:
- Certificate of Analysis (CoA) — pharma, food
- Certificate of Conformance (CoC) — automotive, aerospace
- AS9102 First Article Inspection — aerospace first article
- DSCSA T3 documents (Transaction Information, History, Statement) — US pharma
- UDI labels — med device
- Customs documentation — international shipment

### Step 4 — Carrier Pickup

Carrier picks up. Shipment record transitions: planned → picked →
packed → in-transit.

### Step 5 — Tracking

Shipment progress tracked via carrier API integration. Visibility into
delivery ETA. Deviations (delays, exceptions) flagged.

### Step 6 — Delivery

Customer receives. Delivery confirmation:
- Carrier proof-of-delivery (signed receipt)
- Customer EDI 856 (Advance Ship Notice acknowledgment)
- Customer portal confirmation

Shipment transitions to "delivered."

### Step 7 — Genealogy Update

Genealogy edge from Lot → Shipment → Customer confirmed in OTG. This
edge is the basis of recall scope identification (D12).

### Step 8 — DSCSA / UDI Event Exchange (when applicable)

Per US pharma DSCSA: T3 events exchanged with trading partners (often
via VRS, Verification Router Service).

Per EU MDR / FDA UDI: UDI submission to EUDAMED / GUDID.

### Step 9 — Complaint / Field Return Handling

If a customer reports an issue with the delivered material, D12
Complaint to Recall takes over.

---

## 5. Decision points

```
DP1  Pick lot:               which specific lot to fulfill from
DP2  Pick serial numbers:    for serialized products
DP3  Customer-required docs: CoA, CoC, T3, UDI, etc.
DP4  Carrier selection:      per customer agreement / cost / lead time
DP5  Customs handling:       international shipment
DP6  Exception handling:     delivery deviation
```

---

## 6. Cross-domain footprint

D-08 Traceability (primary), D-05 Inventory (pick), D-01 Commercial
(shipment, customer), D-12 Integration (carrier API, EDI).

---

## 7. State machines

SM-6 Release (BREL prerequisite), SM-1 Order (shipment portion),
SM-2 Material (lot status final).

---

## 8. Evidence captured

Shipment record with manifest, picked lots/serials, mandatory documents,
carrier tracking, delivery confirmation, genealogy edges in OTG,
DSCSA / UDI exchange records.

---

## 9. Regulatory considerations

```
- Customer-specific requirements (CSR)
- 21 CFR Part 11 (e-records of release)
- DSCSA (US pharma serialization)
- UDI (med device)
- EU MDR Article 27 (UDI)
- 21 CFR Part 820 §820.180 (DHR retention; med device)
- AS9102 (aerospace FAI)
- Tax / customs / export control
```

---

## 10. Wave target

L4 by W7; L5 by W7. DSCSA / UDI by W10 (vertical packs).

---

## 11. Failure modes

```
- Wrong lot picked:           inventory transaction reversal; correct lot
- Damage in transit:          claim against carrier; replacement shipment
- Customer rejects on receipt: D12 Complaint to Recall flow
- Customs hold:               documentation review; carrier coordination
- DSCSA exchange failed:       retry per FDA waiver protocol; documented
                                 exception
```

---

## 12. Decision phrase

```
D11_RELEASE_TO_TRACE_BASELINE_LOCKED
NEXT: D12_COMPLAINT_TO_RECALL.md
```

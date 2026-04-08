# CNC Job-Order SOP Reference Model

> **Version:** v1 · **Date:** 2026-03-27

---

## 1. Purpose

This file locks the reference model for HESEM's **job-order CNC machine shop** operating SOP after comparison:

- original file trace and internal generator,
- Operating models of widely used job-shop / ERP / MES / QMS systems,
- Real-world requirements of high-mix / low-volume environments.

---

## 2. Comment after internal review

### 2.1 What happened in the repo

- `tools/scripts/sop-rewrite/generate_series_400_900.py` used to force `len(doc["igs"]) == len(doc["steps"])`.
- The standardization has caused many SOPs 300–900 to be compressed to the `5 IG / 5 steps` model.
- The file history shows that this is **not the nature of the process**:
  - `SOP-302` had a 10-step flow in commit `94a21ca0`.
  - `SOP-201` still has 10 steps.

### 2.2 Internal conclusions

The error is not in using flowchart, but in **identifying the control layer with the operating layer**:

- `IG` is the **gate / hold / release** class
- `procedure steps` is the **execution / handoff / evidence** class

These two classes must be separate.

---

## 3. Signs from international practice sources

### 3.1 ProShop ERP

The official source shows the machine-shop flow viewed in layers:

- `quote / order`
- `digital work order`
- `BOM / specs / QC criteria`
- `shop floor progress`
- `inspection`
- `traceability`
- `job costing`

That shows the actual process is a multi-layer sequence, not just 5 flat steps.

### 3.2 MRPeasy

The official source clearly describes:

- `routing` contains operations, duration, cost, default workers/departments
- `manufacturing orders` is associated with planning, workstations, procurement, inspections, stock lots, shipments
- `overlap and special sequences of manufacturing operations`

Important point: **operations can overlap, special sequence, parallel execution**. Therefore, the number of execution steps cannot be forced by the number of gates.

### 3.3 ERPNext

The official source clearly describes:

- `Routing` is the operations template, with `Sequence ID`
- `Work Order` entails BOM, operations, WIP, material transfer, finished goods, capacity planning
- `Job Card` according to each operation and workstation, record actual time, completed quantity, material request, transfer
- `Quality Inspection` applies to incoming / outgoing / in-process, has acceptance criteria and sample/readings

Important point: this system clearly separates:

- planning,
- work orders,
- operation execution,
- in-process records,
- quality inspection,
- finished goods update.

This is a typical model for global discrete manufacturing / job-shop.

---

## 4. Conclusion of suitable global model for HESEM

### 4.1 Do not use the 5/5 model

Model `5 gates = 5 steps` is only suitable for:

- executive dashboard,
- portal gateway,
- Executive level overview diagram.

It is **not deep enough** to run real-life CNC job-order operations.

### 4.2 Recommended reference model

For CNC job-order SOPs related to Engineering, Planning, Setup, QC, Machining, Shipping:

- **Internal Gates usually fall into:** `6–8`
- **Detailed Procedure Steps usually fall into:** `9–13`

`7 IG / 12 bước` is just a **strong reference pattern**, not a fixed rule for all SOPs.

---

## 5. A sample of 7 recommended Internal Gates

| IG | Port name | Target |
|---|---|---|
| IG1 | Requirement Lock | Lock customer requirements, revision, spec, CTQ, commercial conditions and quality triggers |
| IG2 | Baseline Release | Lock route, program baseline, setup concept, measurement concept, make-or-buy and data snapshot |
| IG3 | Resource Readiness | Xác nhận material, supplier status, tool, fixture, gage, machine, capacity, traveler sẵn sàng |
| IG4 | Setup / Prove-out Readiness | Block jobs before proof-out if setup, datum, offsets, program, workholding are not correct |
| IG5 | First-Piece / FAI Release | Run series only when first-piece / FAI / revalidation is passed and the evidence is sufficient |
| IG6 | Production Control & Final Release | Control series run, reaction plan, final inspection, CoC, packing release |
| IG7 | Shipment & Closeout | Lock shipment confirmation, costing, evidence index, lessons learned, carry-over actions |

---

## 6. A detailed 12-step recommended template

| Step | Step name | Why must it be separate? |
|---|---|---|
| 1 | Receive RFQ/PO and classify jobs | Trigger key, class part, customer requirement, risk class |
| 2 | Contract review + considerations + conditions for quotation/receipt of order | This is the key point for technical and commercial assumptions |
| 3 | Freeze baseline package and route | Separate to lock the correct part/rev/program/setup/inspection concept |
| 4 | Resource planning, make-or-buy, scheduling and purchasing | This is a planning/procurement class, should not be included in engineering |
| 5 | Tiếp nhận và xác minh material / source / cert / tool / fixture / gage | This is field readiness before setup |
| 6 | Setup machine, preset, datum, prove-out | This is the individual step with the highest machine risk |
| 7 | First-piece check / FAI / revalidation decision | This is a pre-series quality port |
| 8 | Run controlled production and report according to operations | This is the actual execution on the shop floor |
| 9 | IPQC / SPC / reaction plan / containment | This is a reactive class, not included in “production” |
| 10 | Changeover / work transfer / restart after hold | With job-shop CNC, this is a huge repeat risk point |
| 11 | Final inspection / document pack / CoC / ship release | This is the last release class before delivery |
| 12 | Packing, shipment confirmation, costing, closeout, learn-back | This is the round to close the application and study again for the next time |

---

## 7. Mapping of sample 7 IG ↔ 12 steps

| IG | The detailed steps are usually below the portal |
|---|---|
| IG1 | B1, B2 |
| IG2 | B3, B4 |
| IG3 | B5 |
| IG4 | B6 |
| IG5 | B7 |
| IG6 | B8, B9, B10, B11 |
| IG7 | B12 |

### 7.1 Meaning

- There is an IG that only covers **1 high risk step** such as `setup / prove-out`, `FAI`.
- There are IGs that cover **many consecutive operational steps** like `production control`.
- This is a normal and standard mapping. There is no symmetry requirement.

---

## 8. Rules apply to each SOP group

| SOP group | IG should be used | Steps should be used |
|---|---|---|
| Engineering / DFM / release | 5–7 | 8–12 |
| CNC machining / setup / changeover / transfer | 5–8 | 10–14 |
| Quality gating / FAI / NCR reaction | 5–7 | 9–13 |
| Final inspection / shipment / closeout | 4–6 | 8–10 |

### 8.1 Final decision rule

- Choose the IG number according to the actual `HOLD / RELEASE` score.
- Choose the number of steps according to the number of role changes, resource changes, system status changes, revalidation and handover.
- If the old document has better operational logic than the reference template, keep the old logic and standardize the structure.

---

## 9. Anti-patterns must be blocked

1. A CNC SOP has 5 steps just because it "fits the screen".
2. An IG roughly corresponds to a step heading.
3. Include `setup + prove-out + first-piece + release` into one step.
4. There are no separate steps for `revalidation`, `work transfer`, `restart after hold`.
5. There is no step to close the profile and learn-back.

---

## 10. Official reference source

- [ProShop ERP - Sales & Work Orders](https://proshoperp.com/product/sales-work-order-process/)
- [ProShop ERP - Quality Systems & Inspection](https://proshoperp.com/product/quality-systems-inspection/)
- [MRPeasy - Routings](https://www.mrpeasy.com/resources/user-manual/production-planning/routings/)
- [MRPeasy - Manufacturing Orders](https://www.mrpeasy.com/resources/user-manual/production-planning/manufacturing-orders/)
- [MRPeasy - Overlap and Special Sequences of Manufacturing Operations](https://www.mrpeasy.com/resources/user-manual/settings/system/professional-functions/overlap-and-sequence-of-manufacturing-operations/)
- [ERPNext - Routing](https://docs.frappe.io/erpnext/user/manual/en/routing)
- [ERPNext - Work Order](https://docs.frappe.io/erpnext/user/manual/en/work-order)
- [ERPNext - Job Card](https://docs.frappe.io/erpnext/user/manual/en/job-card)
- [ERPNext - Quality Inspection](https://docs.frappe.io/erpnext/user/manual/en/quality-inspection)

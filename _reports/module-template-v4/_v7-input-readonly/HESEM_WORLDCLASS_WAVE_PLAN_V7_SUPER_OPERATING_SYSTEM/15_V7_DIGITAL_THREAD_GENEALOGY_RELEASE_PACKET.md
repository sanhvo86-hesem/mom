# 15 — Digital Thread, Genealogy and Release Packet
## Digital thread thesis

The digital thread is not a dashboard. It is a replayable chain from customer demand and engineering definition through material receipt, work execution, inspection, nonconformance, CAPA, maintenance, release and shipment.

## Release packet contents

| Packet section | Required sources |
| --- | --- |
| Product identity | ITEM, IREV, BOM/routing, ECO effectivity |
| Production execution | JO, WO, OPER, instruction versions, operator/equipment evidence |
| Material genealogy | PREC, LOT, INVTXN, consumes/produces OTG edges |
| Quality evidence | INSP, SPC, MSA, MDEV calibration |
| Exception handling | NQCASE, MRB, deviation/concession, CAPA/SCAR links |
| Maintenance/equipment | EQP status, MWO, downtime, calibration |
| Signatures/release | BREL, ESIGN, AUDIT, release decision |
| Data integrity | hashes, audit trail, retention, backup/restore evidence |

## Containment workflow

When a suspect lot/serial is identified, OTG traversal must find upstream material, downstream WIP/finished goods, shipments, inspections, operators/equipment, related NQCASE/CAPA, customers and release decisions. Containment decision must be command-based and audited.

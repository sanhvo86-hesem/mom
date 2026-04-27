# 13 — MES, OT, Edge and Connected Worker Deep Model
## Purpose

MES must connect plan to execution while keeping OT safe. The application layer controls workflow and evidence; it does not directly control machines unless a separate OT-safe architecture is approved.

## ISA-95 alignment

| Layer | HESEM responsibility | Guard |
| --- | --- | --- |
| Enterprise / ERP | SO, PO, cost, demand/supply, finance | no direct machine control |
| MOM / MES | JO, WO, dispatch, quality, maintenance, genealogy | workflow/evidence/authority ledger |
| Control / SCADA/PLC | machine telemetry and approved commands via edge gateway | 62443 zone/conduit policy |
| Physical process | machines, sensors, tools, operators | safety and OT owner authority |

## Connected worker runtime

- Work instruction version resolved from CDOC and item/routing/effective date.
- Operator eligibility resolved from TRAIN/qualification.
- Equipment/tool eligibility resolved from EQP/TOOL/CAL.
- Material eligibility resolved from LOT/status/hold/release.
- Step completion emits EVID, AUDIT, EVENT and OTG edges.

## OT edge rules

- Edge ingest must be typed, timestamped, source-authenticated and replayable.
- Machine telemetry is evidence, not authority by itself.
- OT write path requires explicit zone/conduit design, hazard review, security review, fallback and manual override.
- PLC/SCADA safety functions remain outside HESEM application authority.

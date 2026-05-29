# P35 Adversarial Audit

## Verdict

P35 passes with controlled gaps. It creates runtime gate targets and executable service checks for the previously fragmented tooling/gage/OOT/MSA authority path, but it does not yet prove live command authority because persistence, audit/outbox, and live repository reads are still pending.

## Nine-Role Review

| Role | Challenge | Finding | Repair |
|---|---|---|---|
| Source authority reviewer | Are new tables duplicating existing tooling tables? | Existing tables hold lifecycle/events; missing piece is command-time gate target and impact scope. | Added only policy/window/impact tables. |
| Runtime bypass reviewer | Can Generic CRUD mutate tooling/gage gate tables? | New and relevant existing tables needed deny coverage. | Added P35 tables and calibration/MSA/preset/life tables to Generic CRUD denylist. |
| Operator safety reviewer | Can a tool below stop threshold still run? | Previously only partial metadata/life events existed. | `tool_life_below_stop_threshold` service gate and test added. |
| Quality reviewer | Does breakage create containment? | P09 required suspect window and NCR linkage. | `createBreakageSuspectWindow()` creates a suspect window and P33 quality containment plan. |
| Metrology reviewer | Is calibration enough for CTQ? | P09 said calibration and MSA were fragmented. | `evaluateGageCtqGate()` requires valid calibration and acceptable MSA/GRR. |
| Customer/field quality reviewer | Does OOT include shipped lots? | Existing OOT table has broad JSON fields but no runtime impact scope. | `gage_oot_impact_scope` and service plan include WIP, lot, serial, shipment, and customer refs. |
| Manufacturing engineering reviewer | Can incompatible assemblies load? | Compatibility was partially implicit in metadata. | Compatibility rule table and machine-family gate added. |
| Security/SoD reviewer | Does P35 approve regulated release? | No; it only plans/blocks. | Regulated release/override remains P32 evidence plus command handler work. |
| SRE/auditor reviewer | Is runtime complete? | No; JSON_ONLY runtime audit and missing PHPUnit vendor persist. | Controlled gaps registered; no production claim. |

## Critical Repair Pass

- Wired P35 service into P34 readiness through explicit optional injection, avoiding silent global behavior changes.
- Added `tool_breakage_suspect_window` and `gage_oot_impact_scope` to quality registry scope so containment is visible outside tooling.
- Kept inventory/financial posting out of P35 and assigned it to P36.

## Residual Risk

The largest residual risk is bypass: live shopfloor commands can still ignore P35 until P37 command handlers read physical tooling/gage authority and persist gate decisions with audit/outbox.

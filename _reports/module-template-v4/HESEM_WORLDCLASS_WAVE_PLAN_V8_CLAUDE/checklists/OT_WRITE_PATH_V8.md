# OT Write Path Checklist V8

Per V8 file 15 §4. Mandatory before any L3→L2 write (HESEM commanding a PLC) is enabled.

```text
[ ] OT-V8-01  Equipment registered in EQP root with active calibration + zone assignment
[ ] OT-V8-02  Equipment IEC 62443 zone identified per data/ot_zone_map_v8.json
[ ] OT-V8-03  Conduit policy approved between Z-PROD-LINE-N and Z-EDGE-DMZ
[ ] OT-V8-04  Edge gateway X.509 cert active and within renewal window
[ ] OT-V8-05  Operator authorization confirmed (specific equipment-eligible per qualification)
[ ] OT-V8-06  Workflow state allows the write (state-machine guard in SM-8)
[ ] OT-V8-07  Safety interlock evaluator returns clear (no LOTO, no maintenance lock, no ehs_incident open)
[ ] OT-V8-08  Dual-control approval present (two principals signed within 5min window per file 18)
[ ] OT-V8-09  Manual override audit chain primed (override would be caught and recorded)
[ ] OT-V8-10  Hazard review documented per equipment + write path (file 15 §4 prerequisite 6)
[ ] OT-V8-11  Per-tenant + per-equipment feature flag HMV4_OT_WRITE_PATH_<EQP> enabled (file 14)
[ ] OT-V8-12  RB-OT-001..008 runbooks reviewed by on-call OT team
[ ] OT-V8-13  Emergency stop procedure tested
[ ] OT-V8-14  ITAR / export-control check for affected equipment (file 21 + 32 if aerospace)
[ ] OT-V8-15  Pre-deployment red-team exercise: attempted attack vectors documented
```
